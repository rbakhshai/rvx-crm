import Link from "next/link";
import { ContactForm } from "./contact-form";
import { Estimator } from "./estimator";
import { PathStepper } from "./path-stepper";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ contacted?: string }>;
}) {
  return (
    <>
      <SuccessBanner searchParams={searchParams} />
      <Hero />
      <Promises />
      <Path />
      <Stats />
      <FAQ />
      <Contact />
    </>
  );
}

async function SuccessBanner({
  searchParams,
}: {
  searchParams: Promise<{ contacted?: string }>;
}) {
  const params = await searchParams;
  if (params.contacted !== "1") return null;
  return (
    <div className="fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-lg border border-[#3a3320] bg-[#16140d] px-5 py-3 text-center text-[15px] text-[#dbbe67] shadow-xl">
      ✓ Got it — we&apos;ll be in touch within a business day. Thanks for reaching out.
    </div>
  );
}

// ============================================================================
// HERO — legacy headline + live estimator over an aerial park photo
// ============================================================================

function Hero() {
  return (
    <section
      className="relative flex min-h-screen flex-col justify-center overflow-hidden pb-16 pt-32"
      style={{ background: "#0a0a0a url('/hero-park.jpg') center/cover no-repeat" }}
    >
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "linear-gradient(90deg,rgba(8,9,6,0.9) 0%,rgba(8,9,6,0.62) 40%,rgba(8,9,6,0.22) 100%),linear-gradient(180deg,rgba(8,9,6,0.55) 0%,rgba(8,9,6,0) 26%,rgba(8,9,6,0.5) 100%)",
        }}
      />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-7 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <h1
            className="font-[family-name:var(--font-fraunces)] text-[clamp(44px,5.6vw,72px)] font-medium leading-[1.06] tracking-[-0.01em] text-[#f5f5f5]"
            style={{ textShadow: "0 2px 30px rgba(0,0,0,0.55)" }}
          >
            You built it.
            <br />
            <span className="font-normal italic text-[#dbbe67]">We&apos;ll keep it standing.</span>
          </h1>
          <p
            className="mt-6 max-w-[470px] text-[21px] text-[#e9e3d3]"
            style={{ textShadow: "0 1px 16px rgba(0,0,0,0.7)" }}
          >
            We buy and run RV parks the way the best owners did — with more hands, better systems, and the
            capital to do it right. Curious what yours is worth? See a range right now — no call, no email.
          </p>
          <div className="mt-8 flex flex-wrap gap-3.5">
            <a
              href="#contact"
              className="rounded-md bg-[#dbbe67] px-7 py-4 text-[17px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#ebc75b]"
            >
              Start the conversation
            </a>
            <a
              href="#how"
              className="rounded-md border border-[#8a773d] px-7 py-4 text-[17px] text-[#dbbe67] transition-colors hover:bg-[rgba(219,190,103,0.08)]"
            >
              See how it works
            </a>
          </div>
        </div>
        <Estimator />
      </div>
    </section>
  );
}

// ============================================================================
// PROMISES — first-person trust builders
// ============================================================================

const PROMISES = [
  "We won't gut your staff in month one. The people who made your park work stay.",
  "We'll call your longtime guests by name. The regulars keep their spot.",
  "You'll know our timeline before you share a single number. No surprises.",
];

function Promises() {
  return (
    <section id="promises" className="border-t border-[#2e2718] bg-[#0a0a0a] py-24">
      <div className="mx-auto max-w-6xl px-7">
        <div className="max-w-xl">
          <div className="text-[14px] font-medium uppercase tracking-[0.2em] text-[#8a773d]">What we promise</div>
          <h2 className="mt-2.5 font-[family-name:var(--font-fraunces)] text-[clamp(32px,4.2vw,48px)] font-medium leading-[1.15] text-[#f5f5f5]">
            The things owners worry about — answered up front.
          </h2>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {PROMISES.map((p) => (
            <div key={p} className="rounded-2xl border border-[#2e2718] bg-[#0d0c08] p-6">
              <div className="font-[family-name:var(--font-fraunces)] text-[38px] leading-none text-[#8a773d]">“</div>
              <p className="mt-2.5 text-[18px] text-[#d8d2c4]">{p}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// PATH — interactive 3-step seller journey
// ============================================================================

function Path() {
  return (
    <section id="how" className="border-t border-[#2e2718] bg-[#080808] py-24">
      <div className="mx-auto max-w-6xl px-7">
        <div className="max-w-xl">
          <div className="text-[14px] font-medium uppercase tracking-[0.2em] text-[#8a773d]">Selling, made clear</div>
          <h2 className="mt-2.5 font-[family-name:var(--font-fraunces)] text-[clamp(32px,4.2vw,48px)] font-medium leading-[1.15] text-[#f5f5f5]">
            Three steps. No pressure.
          </h2>
          <p className="mt-3.5 text-[20px] text-[#9a958a]">
            You always know exactly where you are — and what comes next.
          </p>
        </div>
        <div className="mt-10">
          <PathStepper />
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// STATS — credibility band
// ============================================================================

const STATS: [string, string][] = [
  ["100+", "Parks evaluated"],
  ["20+", "States served"],
  ["$50M+", "Active pipeline"],
  ["2026", "Currently acquiring"],
];

function Stats() {
  return (
    <section className="border-t border-[#2e2718] bg-[#0a0a0a] py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-7 text-center md:grid-cols-4">
        {STATS.map(([n, l]) => (
          <div key={l}>
            <div className="font-[family-name:var(--font-fraunces)] text-[44px] font-medium text-[#dbbe67]">{n}</div>
            <div className="mt-1 text-[14px] uppercase tracking-[0.15em] text-[#9a958a]">{l}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-[12px] text-[#5f5b50]">[placeholders — confirm real numbers]</p>
    </section>
  );
}

// ============================================================================
// FAQ — kept from the prior page, restyled dark
// ============================================================================

const FAQS = [
  { q: "How fast can you close?", a: "Typically 60–90 days once we have a signed PSA and clean diligence. We've closed faster when both sides are ready. We never miss a date we've committed to." },
  { q: "Will you take parks below $1M?", a: "Yes. We acquire across a range of price points — what matters more is fit (cash flow, market, condition, motivation). If we're not the right buyer, we'll tell you within a week." },
  { q: "Can I stay involved after the sale?", a: "Often, yes. Many owners want a transition role or to keep operating one piece. We're flexible and design the deal around what works for both sides." },
  { q: "Do you charge me to evaluate my park?", a: "No. There are no fees to talk to us, no listing agreements, and no agency fees if we buy. If we refer you to another buyer, we don't take a cut." },
  { q: "What information do you need to make an offer?", a: "T-12 financials, current rent roll, basic property info, and a few photos. We have a simple online form that walks you through it." },
  { q: "Is my information confidential?", a: "Always. We sign NDAs on request, and we never disclose your park to anyone outside our acquisitions team without explicit permission." },
];

function FAQ() {
  return (
    <section className="border-t border-[#2e2718] bg-[#080808] py-24">
      <div className="mx-auto max-w-3xl px-7">
        <div className="text-center">
          <div className="text-[14px] font-medium uppercase tracking-[0.2em] text-[#8a773d]">Common questions</div>
          <h2 className="mt-2.5 font-[family-name:var(--font-fraunces)] text-[clamp(32px,4.2vw,48px)] font-medium text-[#f5f5f5]">
            Things sellers usually ask
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-[#2e2718] bg-[#0d0c08] px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-medium text-[#f5f5f5]">
                <span>{f.q}</span>
                <span className="shrink-0 text-2xl font-thin text-[#dbbe67] transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-[17px] leading-relaxed text-[#bdb8ab]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CONTACT — kept working form (writes a lead + emails); dark section, light card
// ============================================================================

function Contact() {
  return (
    <section id="contact" className="border-t border-[#2e2718] bg-[#0a0a0a] py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-7 lg:grid-cols-2">
        <div>
          <div className="text-[14px] font-medium uppercase tracking-[0.2em] text-[#8a773d]">Get in touch</div>
          <h2 className="mt-2.5 font-[family-name:var(--font-fraunces)] text-[clamp(32px,4.2vw,48px)] font-medium text-[#f5f5f5]">
            Start the conversation
          </h2>
          <p className="mt-5 text-[19px] leading-relaxed text-[#bdb8ab]">
            Selling a park you&apos;ve spent years building is a big decision. We won&apos;t push, we won&apos;t
            surprise you. Tell us what&apos;s on your mind and we&apos;ll respond within one business day.
          </p>
          <div className="mt-9 space-y-4 text-[17px]">
            <div className="text-[#cfcabd]">
              <span className="text-[#8a773d]">Email · </span>
              <a className="hover:text-[#dbbe67]" href="mailto:hello@rvparkexchange.com">
                hello@rvparkexchange.com
              </a>
            </div>
            <div className="text-[#cfcabd]">
              <span className="text-[#8a773d]">Phone · </span>(555) 555-5555{" "}
              <span className="text-[14px] text-[#5f5b50]">[placeholder]</span>
            </div>
          </div>
          <p className="mt-9 border-t border-[#2e2718] pt-6 text-[15px] text-[#9a958a]">
            Prefer a structured intake? Use our{" "}
            <Link href={"/sell-your-park" as never} className="text-[#dbbe67] hover:underline">
              sell-your-park form
            </Link>{" "}
            (sellers) or{" "}
            <Link href={"/buyer-intake" as never} className="text-[#dbbe67] hover:underline">
              buyer intake
            </Link>{" "}
            (buyers).
          </p>
        </div>
        <div className="rounded-3xl border border-[#2e2718] bg-[#f5f5f5] p-7 shadow-2xl md:p-9">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
