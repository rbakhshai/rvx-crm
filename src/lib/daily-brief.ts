/**
 * Generate a personalized morning brief for a user.
 * Gathers the most actionable context (urgent tasks, stalest owned deals,
 * upcoming deadlines, recent team activity touching their stuff), passes
 * it to Claude Haiku, and caches the result for the calendar day.
 */
import { and, asc, desc, eq, gt, inArray, isNull, lt, or, sql, isNotNull } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { deals, contacts, tasks, notes, dealStatuses, user as userTable } from "@/db/schema";
import { getAnthropic } from "./ai";

const DAY_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STAGES = [
  "closer_first_contact_attempted", "closer_first_contact_made",
  "closer_under_negotiation", "closer_gathering_docs",
  "uw_ready_phase_2", "uw_under_phase_2",
  "loi_ready", "loi_submitted", "loi_in_negotiation",
  "loi_signed_by_seller", "loi_accepted_both_sides",
  "tc_writing_psa", "tc_psa_submitted", "psa_accepted",
  "tc_dd_in_escrow",
];

/**
 * Pull the data Claude needs to write a brief about THIS user's day.
 * Designed to be small (~6KB of context) — we don't want to flood Haiku.
 */
async function gatherContext(userId: string): Promise<string> {
  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const sevenDaysAhead = new Date(now.getTime() + 7 * DAY_MS);
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS);

  const [
    me,
    openTasks,
    myDealsStale,
    upcomingDeadlines,
    newLeads,
    recentNotes,
    hotDeals,
  ] = await Promise.all([
    db.select({ name: userTable.name, role: userTable.role }).from(userTable).where(eq(userTable.id, userId)).limit(1),

    // My open tasks, overdue first
    db
      .select({ subject: tasks.subject, dueAt: tasks.dueAt, body: tasks.body })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), isNull(tasks.completedAt)))
      .orderBy(sql`${tasks.dueAt} ASC NULLS LAST`)
      .limit(10),

    // My owned deals in active stages, stalest first
    db
      .select({
        name: deals.name, parkAddress: deals.parkAddress, parkCity: deals.parkCity, parkState: deals.parkState,
        statusCode: deals.statusCode, dealPriority: deals.dealPriority,
        listPrice: deals.listPrice, closerLastTouch: deals.closerLastTouch, updatedAt: deals.updatedAt,
      })
      .from(deals)
      .where(and(
        eq(deals.ownerId, userId),
        inArray(deals.statusCode, ACTIVE_STAGES),
        isNull(deals.deletedAt),
        or(isNull(deals.closerLastTouch), lt(deals.closerLastTouch, twoDaysAgo)),
      ))
      .orderBy(sql`COALESCE(${deals.closerLastTouch}, ${deals.updatedAt}) ASC`)
      .limit(8),

    // My deals with inspection / COE coming up this week
    db
      .select({
        name: deals.name, parkAddress: deals.parkAddress,
        inspectionPeriodEnd: deals.inspectionPeriodEnd, psaCoeDate: deals.psaCoeDate,
      })
      .from(deals)
      .where(and(
        eq(deals.ownerId, userId),
        isNull(deals.deletedAt),
        or(
          and(isNotNull(deals.inspectionPeriodEnd), sql`${deals.inspectionPeriodEnd}::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 14`),
          and(isNotNull(deals.psaCoeDate), sql`${deals.psaCoeDate}::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 30`),
        ),
      ))
      .orderBy(asc(deals.inspectionPeriodEnd))
      .limit(8),

    // New leads needing first contact (closer queue)
    db
      .select({ firstName: contacts.firstName, lastName: contacts.lastName, email: contacts.email, createdAt: contacts.createdAt })
      .from(contacts)
      .where(and(eq(contacts.status, "new_waiting_to_connect"), isNull(contacts.deletedAt), gt(contacts.createdAt, sevenDaysAgo)))
      .orderBy(desc(contacts.createdAt))
      .limit(6),

    // Recent notes on my owned deals (so I know what changed)
    db.execute(sql`
      SELECT n.body, n.created_at, d.name as deal_name, d.park_address
      FROM notes n
      JOIN deals d ON d.id = n.parent_id AND n.parent_table = 'deals'
      WHERE d.owner_id = ${userId}
        AND d.deleted_at IS NULL
        AND n.created_at > ${sevenDaysAgo}
      ORDER BY n.created_at DESC
      LIMIT 6
    `),

    // My hot/warm deals overall (for tone)
    db
      .select({ name: deals.name, dealPriority: deals.dealPriority })
      .from(deals)
      .where(and(eq(deals.ownerId, userId), inArray(deals.dealPriority, ["hot", "warm"] as never), isNull(deals.deletedAt)))
      .limit(15),
  ]);

  const sections: string[] = [];

  const myName = me[0]?.name ?? "this user";
  const myRole = me[0]?.role ?? "viewer";
  sections.push(`User: ${myName} (role: ${myRole}). Date: ${now.toDateString()}.`);

  // Tasks
  if (openTasks.length > 0) {
    sections.push("\nMy open tasks (soonest due first):");
    for (const t of openTasks.slice(0, 8)) {
      const due = t.dueAt
        ? (t.dueAt < today ? `OVERDUE (${Math.ceil((today.getTime() - t.dueAt.getTime()) / DAY_MS)}d)` : `due ${t.dueAt.toISOString().slice(0, 10)}`)
        : "no due date";
      sections.push(`  - ${t.subject} [${due}]${t.body ? ` — ${t.body.slice(0, 80)}` : ""}`);
    }
  }

  // Stale owned deals
  if (myDealsStale.length > 0) {
    sections.push("\nMy active deals untouched 2+ days (stalest first):");
    for (const d of myDealsStale) {
      const title = d.name || d.parkAddress || "(unnamed)";
      const loc = [d.parkCity, d.parkState].filter(Boolean).join(", ");
      const last = d.closerLastTouch ? Math.floor((Date.now() - d.closerLastTouch.getTime()) / DAY_MS) : null;
      const price = d.listPrice ? `$${Number(d.listPrice).toLocaleString()}` : null;
      sections.push(`  - ${title} (${loc})${d.dealPriority ? ` [${d.dealPriority}]` : ""}${price ? ` ${price}` : ""}${last != null ? ` — last touched ${last}d ago` : ""}`);
    }
  }

  // Upcoming deadlines
  if (upcomingDeadlines.length > 0) {
    sections.push("\nUpcoming deadlines on my deals:");
    for (const d of upcomingDeadlines) {
      const title = d.name || d.parkAddress || "(unnamed)";
      const parts: string[] = [];
      if (d.inspectionPeriodEnd) parts.push(`inspection ends ${d.inspectionPeriodEnd}`);
      if (d.psaCoeDate) parts.push(`COE ${d.psaCoeDate}`);
      sections.push(`  - ${title}: ${parts.join(" · ")}`);
    }
  }

  // New leads
  if (newLeads.length > 0) {
    sections.push(`\nNew buyer leads (${newLeads.length}) needing first contact:`);
    for (const l of newLeads.slice(0, 5)) {
      const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || "(unnamed)";
      const age = Math.floor((Date.now() - l.createdAt.getTime()) / DAY_MS);
      sections.push(`  - ${name} (${l.email ?? "no email"}) — submitted ${age}d ago`);
    }
  }

  // Recent notes
  const noteRows = (Array.isArray(recentNotes) ? recentNotes : (recentNotes as { rows?: unknown[] }).rows ?? []) as Array<{ body: string; deal_name: string | null; park_address: string | null }>;
  if (noteRows.length > 0) {
    sections.push("\nRecent notes on my deals (last 7d):");
    for (const n of noteRows.slice(0, 5)) {
      const title = n.deal_name || n.park_address || "deal";
      sections.push(`  - ${title}: ${n.body.slice(0, 120)}`);
    }
  }

  // Hot deals count for awareness
  const hotCount = hotDeals.filter((d) => d.dealPriority === "hot").length;
  if (hotCount > 0) sections.push(`\nYou own ${hotCount} hot deals total.`);

  return sections.join("\n");
}

const SYSTEM_PROMPT = `You are a sharp, no-fluff sales operations briefer at an RV-park brokerage. Each morning you write a short personalized brief (2-4 bullets) for one team member based on what's on their plate.

Style:
- Conversational, like a chief of staff who's been reading their inbox.
- Specific to the data, never generic. Mention deal names, dollar amounts, days-since-touch.
- Action-oriented. Each bullet should imply what to do, not just describe.
- Brief: 2-4 bullets, 1-2 sentences each. Tight.
- Open with one calibration sentence like "You've got 3 priorities today:" — no greeting, no "good morning".
- Plain markdown only. Bullets use \`-\`. Bold for deal names with \`**\`.

If the user has no urgent items at all, write a SHORT message acknowledging the calm and naming one proactive thing they could do (e.g. follow up on a stale buyer, dispo a pending deal).

NEVER:
- Say "Good morning" or any greeting
- Be vague or coach-y ("stay focused", "keep pushing")
- Invent facts not in the context
- Use more than 4 bullets`;

export async function generateDailyBrief(userId: string): Promise<{
  contentMd: string;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}> {
  const client = getAnthropic();
  if (!client) {
    return {
      contentMd: "_AI briefs are off — set ANTHROPIC_API_KEY to enable. Your day still works without one; this widget just shows the data you'd otherwise see in the panels below._",
    };
  }

  const context = await gatherContext(userId);

  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 350,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: `Here's what's on this person's plate. Write today's brief.\n\n${context}` },
    ],
  });

  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return {
    contentMd: text || "_Couldn't generate a brief — try refreshing._",
    model: "claude-haiku-4-5",
    tokensIn: msg.usage?.input_tokens,
    tokensOut: msg.usage?.output_tokens,
  };
}
