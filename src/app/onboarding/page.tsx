/**
 * /onboarding — BD first-login walkthrough.
 *
 * Five steps: welcome → who we are → how the platform works → weekly
 * meeting → EXPECTATIONS. The copy on steps 1–4 mirrors the public
 * recruiting funnel (rvparkexchange.com/birddog) so what a BD heard
 * during recruiting is what they see on day one. Steps 1–4 are
 * editable in place by admins / Sales & Marketing via EditableBlock.
 *
 * Step 5 is the point of the whole flow: a required checklist of
 * expectation acknowledgments (deals take 60–120+ days, performance
 * pay, weekly activity, …). "I'm in" stays disabled until every box
 * is checked; the checked keys + timestamp persist on the user row so
 * leadership can prove who read what. There is no skip — the layout
 * redirect keeps BD-tier users here until they acknowledge.
 *
 * Closes feedback #5000 (Reza).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOpsBlocks } from "@/lib/ops-content";
import { ACK_ITEMS } from "@/lib/onboarding-acks";
import { EditableBlock } from "@/components/editable-block";
import { AckChecklist } from "./ack-checklist";
import { cn } from "@/lib/cn";

type Slug = "welcome" | "team" | "platform" | "meeting" | "expectations";

const STEPS: Array<{ slug: Slug; chip: string; defaultTitle: string; defaultBody: string }> = [
  {
    slug: "welcome",
    chip: "1 · Welcome",
    defaultTitle: "Help us source off-market RV parks nationwide",
    defaultBody:
      "Welcome to the team. RV Park Exchange works directly with RV park owners to source off-market acquisition opportunities — no listings, no brokers, no wholesalers.\n\nYour role is focused on finding opportunities, not closing sales. You do the outreach, build the relationship, gather the property info, and submit. Our closing team takes it from there.\n\nSimple work. Consistent execution.",
  },
  {
    slug: "team",
    chip: "2 · Who we are",
    defaultTitle: "Who we are",
    defaultBody:
      "You'll work alongside:\n• Reza — founder; strategy + final say on deals\n• Erica — your manager; runs Sales & Marketing and the bird-dog team\n• Marco — Operations; runs deals from offer through close\n• Kevin — Finance\n• Kerry — Due Diligence on every contract\n\nReach out anytime — type @Erica (or any first name) in notes to tag a teammate.",
  },
  {
    slug: "platform",
    chip: "3 · The platform",
    defaultTitle: "How the platform works",
    defaultBody:
      "Three pages you'll live in:\n\n• Lead Work (/lead-work) — your dialer. Click \"Get next fresh lead\" and the CRM hands you a park to call, with the owner's number and every prior touch from the team. Pick a disposition when you're done — connected outcomes auto-schedule your follow-up. Keyboard shortcuts: 1–4 for no-connects, Q W E R T Y for connected outcomes.\n\n• My Leads (/my-leads) — everything you've worked: current status, the deal stage if it converted, and your scheduled callbacks. Overdue follow-ups also show on your Today page.\n\n• Leaderboard (/bd-leaderboard) — where you rank. Calls earn 1 pt, owner connects 5, qualified leads 25, LOIs 50, signed PSAs 100. Credit for LOIs and PSAs flows back to whoever qualified the lead.\n\nWhen an owner wants to sell, fire \"Qualified\" — that creates a deal and hands it to the closers. That's the job.",
  },
  {
    slug: "meeting",
    chip: "4 · Weekly call",
    defaultTitle: "The weekly call",
    defaultBody:
      "We meet every week — wins, blockers, deal feedback, and training on owner conversations. You are not figuring this out alone.\n\nThe Zoom link lives on your Today page (violet card, top of the middle column). Attendance is expected — block the time.\n\nCome with: your numbers (the leaderboard has them), 1–2 things you're stuck on, and any wins.",
  },
  {
    slug: "expectations",
    chip: "5 · Expectations",
    defaultTitle: "Set proper expectations — check every box",
    defaultBody: "", // body is the checklist component, not editable text
  },
];

function isSlug(v: string | undefined): v is Slug {
  return STEPS.some((s) => s.slug === v);
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const me = session.user as { role?: string };
  const canEdit = me.role === "admin" || me.role === "acquisitions_manager";

  const params = await searchParams;
  const currentSlug: Slug = isSlug(params.step) ? params.step : "welcome";
  const currentIdx = STEPS.findIndex((s) => s.slug === currentSlug);
  const current = STEPS[currentIdx];
  const isExpectations = current.slug === "expectations";
  const nextSlug = currentIdx < STEPS.length - 1 ? STEPS[currentIdx + 1].slug : null;
  const prevSlug = currentIdx > 0 ? STEPS[currentIdx - 1].slug : null;

  // Single round-trip for all steps' content overrides.
  const blocks = await getOpsBlocks("onboarding.");
  const title = blocks.get(`onboarding.${current.slug}.title`) || current.defaultTitle;
  const body  = blocks.get(`onboarding.${current.slug}.body`)  || current.defaultBody;

  return (
    <div>
      {/* Progress chips */}
      <ol className="flex items-center gap-2 mb-8 flex-wrap">
        {STEPS.map((s, i) => {
          const active = s.slug === currentSlug;
          const done = i < currentIdx;
          return (
            <li key={s.slug}>
              <Link
                href={`/onboarding?step=${s.slug}`}
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border transition",
                  active && "bg-foreground text-background border-foreground",
                  done && !active && "bg-foreground/[0.04] border-border text-foreground/70",
                  !done && !active && "bg-background border-border text-muted hover:text-foreground",
                )}
              >
                {s.chip}
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Step content */}
      <article className="rounded-2xl border border-border bg-background p-8 mb-6">
        <h1 className="text-2xl font-bold tracking-tight leading-tight mb-4">
          {canEdit && !isExpectations ? (
            <EditableBlock
              scope={`onboarding.${current.slug}.title`}
              initial={title}
              revalidate="/onboarding"
              placeholder={current.defaultTitle}
              variant="title"
            />
          ) : (
            title
          )}
        </h1>

        {isExpectations ? (
          <>
            <p className="text-sm text-muted mb-6">
              This is the part that matters. Each item below is something we told you during
              recruiting — checking it tells us you&apos;ve read it and you&apos;re in with eyes open.
            </p>
            <AckChecklist items={ACK_ITEMS} />
          </>
        ) : (
          <div className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
            {canEdit ? (
              <EditableBlock
                scope={`onboarding.${current.slug}.body`}
                initial={body}
                revalidate="/onboarding"
                placeholder={current.defaultBody}
                variant="block"
                multiline
              />
            ) : (
              body
            )}
          </div>
        )}
      </article>

      {/* Footer nav — no skip-out: the only exit is the checklist. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          {prevSlug && (
            <Link
              href={`/onboarding?step=${prevSlug}`}
              className="text-sm text-foreground/70 hover:text-foreground inline-flex items-center gap-1"
            >
              ← Back
            </Link>
          )}
        </div>
        <div className="flex items-center gap-4">
          {!isExpectations && (
            <Link
              href="/onboarding?step=expectations"
              className="text-sm text-muted hover:text-foreground"
            >
              Jump to the checklist
            </Link>
          )}
          {nextSlug && (
            <Link
              href={`/onboarding?step=${nextSlug}`}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              Next →
            </Link>
          )}
        </div>
      </div>

      {canEdit && !isExpectations && (
        <p className="mt-6 text-[11px] text-muted">
          You can edit the title and body on each step in place — click the text. The step-5
          checklist items live in code (src/lib/onboarding-acks.ts) so acknowledgments stay
          auditable.
        </p>
      )}
    </div>
  );
}
