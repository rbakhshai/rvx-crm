/**
 * /onboarding — BD first-login walkthrough.
 *
 * Four-step orientation: welcome → who we are → how the platform
 * works → weekly meeting. Each step's heading + body is editable by
 * admins / Sales & Marketing via EditableBlock, so Reza or Erica can
 * iterate copy without redeploys.
 *
 * Flow: BD lands here automatically (layout redirect for bd_level_*
 * users with onboardedAt = NULL). Step picker via ?step=1..4 in URL
 * so back/forward and refresh stay on the same step. "Finish" stamps
 * onboardedAt and bounces to /today. "Skip for now" does the same
 * but is labeled differently so the BD knows they can come back.
 *
 * Closes feedback #5000 (Reza).
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOpsBlocks } from "@/lib/ops-content";
import { EditableBlock } from "@/components/editable-block";
import { FinishOnboardingButton } from "./finish-button";
import { cn } from "@/lib/cn";

type Slug = "welcome" | "team" | "platform" | "meeting";

const STEPS: Array<{ slug: Slug; chip: string; defaultTitle: string; defaultBody: string }> = [
  {
    slug: "welcome",
    chip: "1 · Welcome",
    defaultTitle: "Welcome to the RV Park Exchange team",
    defaultBody:
      "Thanks for joining the bird-dog team. You're now part of the sourcing engine that finds RV-park owners who want to sell — and matches them with the right buyers.\n\nYour job is simple: call park owners, find out if they're thinking of selling, and pass the warm leads to our closers. We'll handle the rest.",
  },
  {
    slug: "team",
    chip: "2 · Who we are",
    defaultTitle: "Who we are",
    defaultBody:
      "RVX is the largest RV-park brokerage in the country. We've helped park owners sell hundreds of properties since we started.\n\nYou'll work alongside:\n• Reza — founder; runs strategy + investing\n• Erica — your direct manager, runs Sales & Marketing\n• Marco — Operations, runs deals from offer through close\n• Kevin — Finance, owns the books + reporting\n• Kerry — Due Diligence, runs DD on every contract\n\nReach out anytime — we use @-mentions in the CRM (type @Erica anywhere) to tag teammates.",
  },
  {
    slug: "platform",
    chip: "3 · How to use the platform",
    defaultTitle: "How the platform works",
    defaultBody:
      "Three pages you'll live in:\n\n• /bd-triage — your dial-pad. Click \"Get next fresh lead\" and the CRM gives you a park to call. Pick a disposition when you're done; if you connected, we auto-schedule your follow-up.\n• /my-leads — everything you've worked. See current status, deal stage if it converted, and reschedule callbacks inline.\n• /bd-leaderboard — see where you rank vs the team. Calls, connects, qualifieds, LOIs, PSAs.\n\nWhen you connect with an owner who wants to sell, fire \"Qualified\" — that creates a deal and hands it to our closer team. You get credit on the leaderboard when an LOI and PSA get signed downstream.",
  },
  {
    slug: "meeting",
    chip: "4 · Weekly meeting",
    defaultTitle: "Weekly team meeting",
    defaultBody:
      "We meet every week to share wins, troubleshoot blockers, and plan the next push. Attendance is expected — block the time.\n\nThe Zoom link lives on your /today page (top of the middle column, violet card). Click \"Join\" when it's time.\n\nCome prepared with: your weekly numbers (the leaderboard tells you), 1–2 issues you want to discuss, and any wins to celebrate.",
  },
];

function isSlug(v: string | undefined): v is Slug {
  return v === "welcome" || v === "team" || v === "platform" || v === "meeting";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const me = session.user as { role?: string; onboardedAt?: Date | string | null };
  const canEdit = me.role === "admin" || me.role === "acquisitions_manager";

  const params = await searchParams;
  const currentSlug: Slug = isSlug(params.step) ? params.step : "welcome";
  const currentIdx = STEPS.findIndex((s) => s.slug === currentSlug);
  const current = STEPS[currentIdx];
  const isLast = currentIdx === STEPS.length - 1;
  const nextSlug = isLast ? null : STEPS[currentIdx + 1].slug;
  const prevSlug = currentIdx === 0 ? null : STEPS[currentIdx - 1].slug;

  // Single round-trip for all four steps' content overrides.
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
          {canEdit ? (
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
      </article>

      {/* Footer nav */}
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
        <div className="flex items-center gap-3">
          <FinishOnboardingButton variant="skip">
            {isLast ? "Skip orientation" : "Skip for now"}
          </FinishOnboardingButton>
          {nextSlug ? (
            <Link
              href={`/onboarding?step=${nextSlug}`}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 transition"
            >
              Next →
            </Link>
          ) : (
            <FinishOnboardingButton variant="finish">
              Finish — take me to the dashboard →
            </FinishOnboardingButton>
          )}
        </div>
      </div>

      {canEdit && (
        <p className="mt-6 text-[11px] text-muted">
          You can edit the title and body on each step in place — click the text. Changes are live for every BD on next page-load.
        </p>
      )}
    </div>
  );
}
