import Link from "next/link";
import { ContactForm } from "./contact-form";

export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ contacted?: string }>;
}) {
  return (
    <>
      <SuccessBanner searchParams={searchParams} />
      <Hero />
      <ValueProps />
      <SocialProofStrip />
      <HowWeWork />
      <Team />
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
    <div className="bg-gradient-to-r from-green-50 via-green-50 to-green-50 border-b border-green-200 px-6 py-3 text-center text-sm text-green-900">
      ✓ Got it — we&apos;ll be in touch within a business day. Thanks for reaching out.
    </div>
  );
}

// ============================================================================
// HERO — centered headline with animated mesh gradient + floating gold orbs
// ============================================================================

function Hero() {
  return (
    <section className="relative overflow-hidden isolate">
      {/* Animated mesh-gradient backdrop */}
      <div className="absolute inset-0 mesh-bg -z-10" aria-hidden />
      {/* Floating gold blur orbs */}
      <div className="absolute -top-32 -left-32 size-[420px] rounded-full bg-gold/30 blur-[110px] orb-a -z-10" aria-hidden />
      <div className="absolute top-1/3 -right-40 size-[480px] rounded-full bg-amber-300/25 blur-[120px] orb-b -z-10" aria-hidden />
      <div className="absolute -bottom-40 left-1/3 size-[360px] rounded-full bg-orange-200/30 blur-[100px] orb-c -z-10" aria-hidden />

      <div className="max-w-4xl mx-auto px-6 py-28 md:py-40 text-center">
        <div className="fade-up inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold/40 bg-background/70 backdrop-blur text-xs">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium tracking-wide">Currently acquiring across the US</span>
        </div>
        <h1 className="fade-up-delay-1 mt-6 text-5xl md:text-7xl lg:text-8xl font-semibold tracking-tight leading-[1.02]">
          Honoring Legacies.
          <br />
          <span className="text-shimmer">Growing Communities.</span>
        </h1>
        <p className="fade-up-delay-2 mt-8 text-lg md:text-xl text-foreground/75 max-w-2xl mx-auto leading-relaxed">
          We acquire and operate RV parks across the nation — preserving what owners built, while bringing
          hospitality, systems, and capital for the next chapter.
        </p>
        <div className="fade-up-delay-3 mt-10 flex flex-wrap gap-3 justify-center">
          <Link
            href={"/sell-your-park" as never}
            className="glow-cta inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-sm font-semibold text-gold-foreground"
          >
            Sell your park
            <span aria-hidden>→</span>
          </Link>
          <Link
            href={"/buyer-intake" as never}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/80 backdrop-blur px-7 py-3.5 text-sm font-semibold hover:bg-background transition"
          >
            I want to buy
          </Link>
        </div>
        <p className="fade-up-delay-4 mt-6 text-xs text-muted">
          Confidential conversations · No obligation · No agency fees if we buy your park
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// VALUE PROPS — bento grid with depth + tactile cards
// ============================================================================

function ValueProps() {
  return (
    <section className="py-24 md:py-32 border-t border-border relative">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-widest text-gold font-semibold">What we stand for</div>
          <h2 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
            Built different. <span className="text-shimmer">On purpose.</span>
          </h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <BigValueCard
            icon="🤝"
            title="Hospitality first"
            body="Guests, residents, and on-site teams come first. We invest in the experience that earned the park its reputation."
            className="lg:col-span-2 lg:row-span-1"
          />
          <ValueCard icon="⚙️" title="Proven systems" body="Reservations to maintenance to billing — our operating playbook ships with every acquisition." />
          <ValueCard icon="🎯" title="Disciplined acquisitions" body="Fair terms, transparent valuation, on-time closings. No surprise re-trades. No drama." />
          <BigValueCard
            icon="🏆"
            title="Legacy respected"
            body="The park has a story. We learn it, honor it, and keep what made it special intact."
            className="lg:col-span-2"
          />
        </div>
      </div>
    </section>
  );
}

function ValueCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="lift-card rounded-2xl border border-border bg-gradient-to-br from-background to-foreground/[0.015] p-6 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 size-32 rounded-full bg-gold/[0.05] blur-2xl" aria-hidden />
      <div className="relative text-3xl">{icon}</div>
      <h3 className="relative mt-4 text-lg font-semibold">{title}</h3>
      <p className="relative mt-2 text-sm text-foreground/70 leading-relaxed">{body}</p>
    </div>
  );
}

function BigValueCard({ icon, title, body, className }: { icon: string; title: string; body: string; className?: string }) {
  return (
    <div className={`lift-card rounded-2xl border border-border bg-gradient-to-br from-amber-50/40 via-background to-background p-8 relative overflow-hidden ${className ?? ""}`}>
      <div className="absolute -top-12 -right-12 size-48 rounded-full bg-gold/[0.08] blur-3xl" aria-hidden />
      <div className="absolute -bottom-12 -left-12 size-40 rounded-full bg-amber-300/[0.08] blur-3xl" aria-hidden />
      <div className="relative text-4xl">{icon}</div>
      <h3 className="relative mt-5 text-2xl md:text-3xl font-semibold tracking-tight">{title}</h3>
      <p className="relative mt-3 text-base text-foreground/70 leading-relaxed max-w-lg">{body}</p>
    </div>
  );
}

// ============================================================================
// SOCIAL PROOF STRIP — dark band with glowing gold numbers
// ============================================================================

function SocialProofStrip() {
  return (
    <section className="relative bg-foreground text-background py-20 overflow-hidden">
      {/* Subtle gold orbs in the dark band */}
      <div className="absolute -top-32 left-1/4 size-[400px] rounded-full bg-gold/15 blur-[120px] orb-a" aria-hidden />
      <div className="absolute -bottom-32 right-1/4 size-[400px] rounded-full bg-amber-400/12 blur-[120px] orb-b" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="text-[11px] uppercase tracking-widest text-gold font-semibold">By the numbers</div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            What we&apos;ve built so far
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
          <Stat number="100+" label="Parks evaluated" />
          <Stat number="20+" label="States served" />
          <Stat number="$50M+" label="Active pipeline" />
          <Stat number="2026" label="Currently acquiring" />
        </div>
        <p className="mt-8 text-center text-[11px] text-background/40">
          [placeholders — confirm real numbers]
        </p>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div className="group">
      <div className="big-num text-5xl md:text-6xl font-semibold text-shimmer drop-shadow-[0_0_20px_color-mix(in_oklch,var(--color-gold)_40%,transparent)]">
        {number}
      </div>
      <div className="mt-2 text-xs uppercase tracking-widest text-background/60 font-medium">{label}</div>
    </div>
  );
}

// ============================================================================
// HOW WE WORK — connected timeline with glowing step nodes
// ============================================================================

const STEPS = [
  { n: "01", title: "Share your details", body: "Tell us about the park. Five minutes via our form, or a phone call. Your info stays confidential." },
  { n: "02", title: "Review & fit",        body: "We underwrite quickly and transparently. If we&apos;re a fit, we make an offer. If not, we tell you honestly." },
  { n: "03", title: "Close with confidence", body: "Clean PSA, predictable timelines, a transition plan that respects your team and guests. We close when we say we will." },
];

function HowWeWork() {
  return (
    <section className="py-24 md:py-32 border-t border-border">
      <div className="max-w-6xl mx-auto px-6">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-widest text-gold font-semibold">How we work</div>
          <h2 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
            Three steps. <span className="text-shimmer">Zero surprises.</span>
          </h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6 relative">
          {/* Connector line behind cards */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" aria-hidden />
          {STEPS.map((s, i) => (
            <div key={s.n} className="lift-card rounded-2xl border border-border bg-background p-7 relative">
              {/* Glowing step number */}
              <div className="size-12 rounded-full bg-gradient-to-br from-gold to-amber-300 grid place-items-center font-mono font-semibold text-gold-foreground text-sm shadow-[0_0_24px_color-mix(in_oklch,var(--color-gold)_40%,transparent)]">
                {s.n}
              </div>
              <h3 className="mt-5 text-xl font-semibold">{s.title}</h3>
              <p
                className="mt-2 text-sm text-foreground/70 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: s.body }}
              />
              {i < STEPS.length - 1 && (
                <div className="absolute top-12 -right-3 hidden md:flex items-center justify-center size-6 rounded-full bg-background border border-border text-muted text-xs">
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// TEAM — avatar cards with gold ring on hover
// ============================================================================

const TEAM = [
  { name: "Reza Bakhshai", role: "Founder & Acquisitions", bio: "[Placeholder bio — 1-2 sentences on Reza&apos;s background, why he started RVX, what he loves about the industry.]" },
  { name: "Marco Behling", role: "Operations", bio: "[Placeholder bio — Marco&apos;s experience and what he runs day-to-day.]" },
  { name: "Erica [Last]", role: "Sales & Marketing", bio: "[Placeholder bio — Erica&apos;s role in sourcing and the scout network.]" },
];

function Team() {
  return (
    <section className="py-24 md:py-32 border-t border-border bg-gradient-to-b from-foreground/[0.02] via-background to-background relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 size-[600px] rounded-full bg-gold/[0.04] blur-[140px]" aria-hidden />

      <div className="relative max-w-6xl mx-auto px-6">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-widest text-gold font-semibold">Who you&apos;ll work with</div>
          <h2 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
            Real people. <span className="text-shimmer">Real conversations.</span>
          </h2>
          <p className="mt-3 text-foreground/70 text-lg">
            You&apos;re handing over something you built. You should know who&apos;s on the other side of the call.
          </p>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEAM.map((p) => (
            <div key={p.name} className="lift-card rounded-2xl border border-border bg-background p-7 group">
              <div className="size-24 rounded-full bg-gradient-to-br from-amber-100 via-amber-50 to-foreground/[0.06] grid place-items-center text-3xl font-semibold text-foreground/60 mb-5 ring-2 ring-transparent group-hover:ring-gold/60 transition shadow-lg shadow-foreground/5">
                {p.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <h3 className="text-xl font-semibold">{p.name}</h3>
              <div className="text-[11px] text-gold uppercase tracking-widest font-semibold mt-1">{p.role}</div>
              <p
                className="mt-3 text-sm text-foreground/70 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: p.bio }}
              />
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">[Photos coming — drop into <code>public/team/[name].jpg</code> and we&apos;ll wire them in.]</p>
      </div>
    </section>
  );
}

// ============================================================================
// FAQ — polished accordion
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
    <section className="py-24 md:py-32 border-t border-border">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="text-[11px] uppercase tracking-widest text-gold font-semibold">Common questions</div>
          <h2 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
            Things sellers <span className="text-shimmer">usually ask</span>
          </h2>
        </div>
        <div className="mt-12 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-2xl border border-border bg-background px-6 py-5 lift-card open:bg-gradient-to-br open:from-amber-50/50 open:to-background"
            >
              <summary className="cursor-pointer flex items-center justify-between gap-4 text-base font-medium list-none">
                <span>{f.q}</span>
                <span className="text-gold text-xl group-open:rotate-45 transition shrink-0 font-thin">+</span>
              </summary>
              <p className="mt-4 text-[15px] text-foreground/75 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// CONTACT — glassmorphic card on gradient background
// ============================================================================

function Contact() {
  return (
    <section id="contact" className="relative py-24 md:py-32 border-t border-border overflow-hidden">
      <div className="absolute inset-0 mesh-bg opacity-60 -z-10" aria-hidden />
      <div className="absolute top-1/2 -translate-y-1/2 -left-32 size-[400px] rounded-full bg-gold/15 blur-[120px] orb-a -z-10" aria-hidden />
      <div className="absolute top-1/4 -right-32 size-[400px] rounded-full bg-amber-300/15 blur-[120px] orb-b -z-10" aria-hidden />

      <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr_1fr] gap-12 items-start">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-gold font-semibold">Get in touch</div>
          <h2 className="mt-2 text-4xl md:text-5xl font-semibold tracking-tight">
            Start the <span className="text-shimmer">conversation</span>
          </h2>
          <p className="mt-5 text-foreground/75 text-lg leading-relaxed">
            Selling a park you&apos;ve spent years building is a big decision. We won&apos;t push, we won&apos;t surprise you.
            Tell us what&apos;s on your mind and we&apos;ll respond within one business day.
          </p>

          <div className="mt-10 space-y-5">
            <ContactRow label="Email" value="hello@rvparkexchange.com" href="mailto:hello@rvparkexchange.com" />
            <ContactRow label="Phone" value="(555) 555-5555" href="tel:+15555555555" suffix="[placeholder]" />
          </div>

          <div className="mt-10 pt-6 border-t border-border/70">
            <p className="text-xs text-muted leading-relaxed">
              Prefer a structured intake? Use our{" "}
              <Link href={"/sell-your-park" as never} className="text-gold hover:underline font-medium">
                sell-your-park form
              </Link>{" "}
              (sellers) or{" "}
              <Link href={"/buyer-intake" as never} className="text-gold hover:underline font-medium">
                buyer intake
              </Link>{" "}
              (buyers).
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-background/80 backdrop-blur-xl p-7 md:p-9 shadow-2xl shadow-foreground/5">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function ContactRow({ label, value, href, suffix }: { label: string; value: string; href: string; suffix?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="size-10 rounded-xl bg-gradient-to-br from-gold/20 to-amber-300/10 grid place-items-center text-base">
        {label === "Email" ? "✉" : "☎"}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted font-semibold">{label}</div>
        <a href={href} className="text-base font-medium text-foreground hover:text-gold transition">
          {value}{" "}
          {suffix && <span className="text-muted text-xs font-normal">{suffix}</span>}
        </a>
      </div>
    </div>
  );
}

