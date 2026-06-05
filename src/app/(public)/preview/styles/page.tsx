/**
 * Visual-direction mockups (round 2).
 *
 * User picked Pipedrive over Linear/Notion. This round shows:
 *   1. Pipedrive (light)        — reference, what they chose
 *   2. Pipedrive (dark)         — same warmth, dark surfaces
 *   3. Modern Chrome (dark)     — sharp, premium, vivid accent (Vercel/Linear feel)
 *   4. Glassmorphic (light)     — translucent surfaces, gradient backdrop
 *   5. Bento Modern (warm)      — big radii, generous spacing, AI-product feel
 *
 * Each mockup is fully self-contained (own font, colors, shadows, radii).
 */

// ============================================================================
// Shared mock data
// ============================================================================

const GREETING_FIRST = "Reza";
const TODAY_DATE = "Friday, June 5, 2026";

const STATS = [
  { label: "My open tasks", value: "5", hint: "2 overdue" },
  { label: "Deals I own", value: "12", hint: "3 hot" },
  { label: "New leads", value: "7", hint: "waiting" },
  { label: "Pipeline value", value: "$4.2M", hint: "+ $480K this week" },
];

const TASKS = [
  { title: "Call Acme Park seller", due: "today", tone: "warn" as const, sub: "Acme Park · Chandler, AZ" },
  { title: "Review Phase 2 for Fort Valley", due: "2d overdue", tone: "danger" as const, sub: "Fort Valley Ranch · Fort Valley, GA" },
  { title: "Dispo Riverside to top tier buyers", due: "today", tone: "warn" as const, sub: "Riverside Estates · Tampa, FL" },
  { title: "Sign LOI on Oakwood", due: "3d", tone: "muted" as const, sub: "Oakwood RV · Tulsa, OK" },
];

const ACTIVITY = [
  { who: "Marco", icon: "📞", what: "Logged a call with Acme Park seller", when: "12m ago", tone: "amber" as const },
  { who: "Kerry", icon: "📝", what: "Uploaded Phase 1 environmental for Fort Valley", when: "1h ago", tone: "blue" as const },
  { who: "—",     icon: "🦅", what: "New deal: Pine Hill MHP via bird dog Mike",   when: "3h ago", tone: "green" as const },
  { who: "Marco", icon: "📤", what: "Dispo'd Riverside to 12 top-tier buyers",   when: "5h ago", tone: "purple" as const },
];

// ============================================================================
// Page shell
// ============================================================================

export default function StylesPreviewPage() {
  return (
    <main style={{ background: "#F5F5F4", minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 1320, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#18181B", letterSpacing: "-0.02em" }}>
            Round 2 · pick a direction
          </h1>
          <p style={{ color: "#71717A", marginTop: 6, fontSize: 14 }}>
            You picked Pipedrive. Here it is again at the top for reference, plus four directions to consider — dark, sharper/modern, glass, and AI-product warm.
          </p>
        </header>

        <Section name="Pipedrive (light)" tagline="What you picked · reference">
          <PipedriveLight />
        </Section>

        <Section name="Pipedrive (dark)" tagline="Same warmth, dark surfaces · evening-friendly, less eye-fatigue">
          <PipedriveDark />
        </Section>

        <Section name="Modern Chrome (dark)" tagline="Sharp, premium SaaS · Vercel / Linear / Arc feel · vivid accents">
          <ModernChrome />
        </Section>

        <Section name="Glassmorphic" tagline="Translucent surfaces · gradient backdrop · 2024 trend">
          <Glassmorphic />
        </Section>

        <Section name="Bento Modern" tagline="Large rounded cards · generous spacing · Claude / Notion AI / Stripe Atlas feel">
          <BentoModern />
        </Section>

        <footer style={{ textAlign: "center", color: "#71717A", fontSize: 13, marginTop: 48 }}>
          Reply with the name (or describe a hybrid).
        </footer>
      </div>
    </main>
  );
}

function Section({ name, tagline, children }: { name: string; tagline: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "#18181B" }}>{name}</h2>
        <span style={{ fontSize: 13, color: "#71717A" }}>{tagline}</span>
      </div>
      <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// 1. PIPEDRIVE LIGHT — the reference (what they picked)
// ============================================================================

function PipedriveLight() {
  const bg = "#F7F6F2";
  const card = "#FFFFFF";
  const fg = "#1B1B1F";
  const muted = "#6E7280";
  const accent = "#26A65B";
  const border = "#E8E4DC";
  const font = `"Rubik", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif`;
  const shadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)";

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 14, lineHeight: 1.5, display: "flex", minHeight: 540 }}>
      <Sidebar
        bg="#FFFFFF" border={border} fg={fg} muted={muted}
        accentBg="#E9F5EE" accentFg={fg}
        items={["☀️ Today", "📋 Pipeline", "👥 Contacts", "✓ Tasks", "⚙️ Settings"]}
      />

      <div style={{ flex: 1, padding: "32px 36px" }}>
        <header style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Good morning, {GREETING_FIRST} 👋</h1>
            <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>{TODAY_DATE}</div>
          </div>
          <button style={{ background: accent, color: "white", border: "none", borderRadius: 999, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: shadow }}>+ Add deal</button>
        </header>

        <StatGrid stats={STATS} variant="pipedrive-light" />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <Card bg={card} border={border} shadow={shadow}>
            <CardHeader title="My tasks" right="5 open" fg={fg} muted={muted} />
            {TASKS.map((t) => <TaskRow key={t.title} t={t} variant="pipedrive-light" fg={fg} muted={muted} border={border} />)}
          </Card>
          <Card bg={card} border={border} shadow={shadow}>
            <CardHeader title="Team activity" fg={fg} muted={muted} />
            {ACTIVITY.map((a, i) => <ActivityRow key={i} a={a} index={i} variant="pipedrive-light" fg={fg} muted={muted} border={border} />)}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. PIPEDRIVE DARK — same warmth, dark surfaces
// ============================================================================

function PipedriveDark() {
  const bg = "#13141A";
  const card = "#1A1B22";
  const fg = "#E8E8EA";
  const muted = "#8A8F98";
  const accent = "#34C25F";
  const border = "#2A2D38";
  const font = `"Rubik", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif`;
  const shadow = "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)";

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 14, lineHeight: 1.5, display: "flex", minHeight: 540 }}>
      <Sidebar
        bg="#0E0F14" border={border} fg={fg} muted={muted}
        accentBg="rgba(52,194,95,0.13)" accentFg="#34C25F"
        items={["☀️ Today", "📋 Pipeline", "👥 Contacts", "✓ Tasks", "⚙️ Settings"]}
      />

      <div style={{ flex: 1, padding: "32px 36px" }}>
        <header style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>Good morning, {GREETING_FIRST} 👋</h1>
            <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>{TODAY_DATE}</div>
          </div>
          <button style={{ background: accent, color: "#0E0F14", border: "none", borderRadius: 999, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: shadow }}>+ Add deal</button>
        </header>

        <StatGrid stats={STATS} variant="pipedrive-dark" />

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <Card bg={card} border={border} shadow={shadow}>
            <CardHeader title="My tasks" right="5 open" fg={fg} muted={muted} />
            {TASKS.map((t) => <TaskRow key={t.title} t={t} variant="pipedrive-dark" fg={fg} muted={muted} border={border} />)}
          </Card>
          <Card bg={card} border={border} shadow={shadow}>
            <CardHeader title="Team activity" fg={fg} muted={muted} />
            {ACTIVITY.map((a, i) => <ActivityRow key={i} a={a} index={i} variant="pipedrive-dark" fg={fg} muted={muted} border={border} />)}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. MODERN CHROME — dark, sharp, premium, vivid accent
// ============================================================================

function ModernChrome() {
  const bg = "#08090C";
  const card = "linear-gradient(180deg, #14151A 0%, #101116 100%)";
  const cardSolid = "#14151A";
  const fg = "#F4F4F5";
  const muted = "#71717A";
  const accent = "#8B5CF6";
  const accentGlow = "0 0 0 1px rgba(139,92,246,0.4), 0 0 24px -4px rgba(139,92,246,0.5)";
  const border = "#1F2027";
  const font = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const shadow = "0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)";

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 13, lineHeight: 1.5, display: "flex", minHeight: 540 }}>
      <aside style={{ width: 220, padding: "20px 14px", background: "rgba(255,255,255,0.015)", borderRight: `1px solid ${border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${accent}, #6D28D9)`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>R</span>
          RVX
        </div>
        {["Today", "Pipeline", "Contacts", "Tasks", "Settings"].map((item, i) => (
          <div
            key={item}
            style={{
              padding: "7px 10px", borderRadius: 6, fontSize: 13, marginBottom: 2,
              color: i === 0 ? fg : muted,
              background: i === 0 ? "rgba(139,92,246,0.10)" : "transparent",
              fontWeight: i === 0 ? 500 : 400,
              border: i === 0 ? `1px solid rgba(139,92,246,0.18)` : "1px solid transparent",
            }}
          >
            {item}
          </div>
        ))}
      </aside>

      <div style={{ flex: 1, padding: "28px 36px" }}>
        <header style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
              Good morning, <span style={{ background: `linear-gradient(90deg, ${accent}, #A78BFA)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{GREETING_FIRST}</span>
            </h1>
            <div style={{ color: muted, fontSize: 12, marginTop: 4 }}>{TODAY_DATE}</div>
          </div>
          <button style={{ background: `linear-gradient(180deg, ${accent} 0%, #7C3AED 100%)`, color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: accentGlow }}>+ New deal</button>
        </header>

        {/* Premium stat tiles with subtle gradient + glow */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 24 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 16px", boxShadow: shadow, position: "relative", overflow: "hidden" }}>
              <div style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 26, fontWeight: 600, marginTop: 4, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{s.hint}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          <div style={{ background: cardSolid, border: `1px solid ${border}`, borderRadius: 10, padding: 18, boxShadow: shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, color: fg, letterSpacing: "-0.01em" }}>My tasks</h3>
              <span style={{ fontSize: 11, color: muted }}>5 open</span>
            </div>
            {TASKS.map((t, i) => (
              <div key={t.title} style={{ padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 14, height: 14, border: `1.5px solid #2A2D38`, borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: fg }}>{t.title}</div>
                  <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{t.sub}</div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 500, padding: "3px 8px", borderRadius: 999,
                  background: t.tone === "danger" ? "rgba(239,68,68,0.12)" : t.tone === "warn" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                  color: t.tone === "danger" ? "#F87171" : t.tone === "warn" ? "#FBBF24" : muted,
                  border: t.tone === "danger" ? "1px solid rgba(239,68,68,0.2)" : t.tone === "warn" ? "1px solid rgba(245,158,11,0.2)" : "1px solid rgba(255,255,255,0.06)",
                }}>{t.due}</span>
              </div>
            ))}
          </div>

          <div style={{ background: cardSolid, border: `1px solid ${border}`, borderRadius: 10, padding: 18, boxShadow: shadow }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0, marginBottom: 12, color: fg, letterSpacing: "-0.01em" }}>Team activity</h3>
            {ACTIVITY.map((a, i) => {
              const tints: Record<string, string> = {
                amber: "rgba(245,158,11,0.10)", blue: "rgba(59,130,246,0.10)",
                green: "rgba(34,197,94,0.10)", purple: "rgba(168,85,247,0.10)",
              };
              return (
                <div key={i} style={{ padding: "9px 0", borderTop: i === 0 ? "none" : `1px solid ${border}`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: tints[a.tone], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, color: fg, lineHeight: 1.5 }}>
                      {a.who !== "—" && <span style={{ fontWeight: 500 }}>{a.who} </span>}
                      {a.what}
                    </div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{a.when}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. GLASSMORPHIC — translucent + gradient backdrop
// ============================================================================

function Glassmorphic() {
  const bg = "linear-gradient(135deg, #FDF2F8 0%, #EDE9FE 50%, #DBEAFE 100%)";
  const fg = "#1E1B4B";
  const muted = "#64748B";
  const accent = "linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)";
  const border = "rgba(255,255,255,0.4)";
  const cardBg = "rgba(255,255,255,0.55)";
  const cardBlur = "blur(20px) saturate(180%)";
  const font = `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`;
  const shadow = "0 8px 32px rgba(31,38,135,0.08), inset 0 1px 0 rgba(255,255,255,0.5)";

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 14, lineHeight: 1.5, display: "flex", minHeight: 540 }}>
      <aside style={{ width: 220, padding: "20px 14px", background: "rgba(255,255,255,0.4)", backdropFilter: cardBlur, borderRight: `1px solid ${border}` }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, letterSpacing: "-0.02em" }}>RVX ✨</div>
        {["Today", "Pipeline", "Contacts", "Tasks", "Settings"].map((item, i) => (
          <div key={item} style={{
            padding: "9px 12px", borderRadius: 10, fontSize: 14, marginBottom: 4,
            color: i === 0 ? "#7C3AED" : muted,
            background: i === 0 ? "rgba(139,92,246,0.12)" : "transparent",
            fontWeight: i === 0 ? 600 : 500,
          }}>
            {item}
          </div>
        ))}
      </aside>

      <div style={{ flex: 1, padding: "32px 36px" }}>
        <header style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>Good morning, {GREETING_FIRST} ✨</h1>
            <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>{TODAY_DATE}</div>
          </div>
          <button style={{ background: accent, color: "white", border: "none", borderRadius: 12, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(139,92,246,0.4)" }}>+ Add deal</button>
        </header>

        {/* Glass stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 18px", boxShadow: shadow }}>
              <div style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{s.hint}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
          <div style={{ background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur, border: `1px solid ${border}`, borderRadius: 16, padding: 20, boxShadow: shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>My tasks</h3>
              <span style={{ fontSize: 12, color: muted }}>5 open</span>
            </div>
            {TASKS.map((t, i) => (
              <div key={t.title} style={{ padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid rgba(0,0,0,0.06)`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 16, height: 16, border: `2px solid rgba(0,0,0,0.15)`, borderRadius: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>{t.sub}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                  background: t.tone === "danger" ? "rgba(239,68,68,0.15)" : t.tone === "warn" ? "rgba(245,158,11,0.15)" : "rgba(0,0,0,0.05)",
                  color: t.tone === "danger" ? "#B91C1C" : t.tone === "warn" ? "#92400E" : muted,
                }}>{t.due}</span>
              </div>
            ))}
          </div>

          <div style={{ background: cardBg, backdropFilter: cardBlur, WebkitBackdropFilter: cardBlur, border: `1px solid ${border}`, borderRadius: 16, padding: 20, boxShadow: shadow }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 14, letterSpacing: "-0.01em" }}>Team activity</h3>
            {ACTIVITY.map((a, i) => {
              const tints: Record<string, string> = { amber: "rgba(245,158,11,0.15)", blue: "rgba(59,130,246,0.15)", green: "rgba(34,197,94,0.15)", purple: "rgba(168,85,247,0.15)" };
              return (
                <div key={i} style={{ padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid rgba(0,0,0,0.06)`, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: tints[a.tone], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                      {a.who !== "—" && <span style={{ fontWeight: 600 }}>{a.who} </span>}
                      {a.what}
                    </div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{a.when}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. BENTO MODERN — warm, generous, big radii, AI-product feel
// ============================================================================

function BentoModern() {
  const bg = "#FAF8F4";
  const card = "#FFFFFF";
  const fg = "#1C1917";
  const muted = "#78716C";
  const accent = "#EA580C";
  const border = "#EFEAE0";
  const subtle = "#F5F0E5";
  const font = `"Inter", -apple-system, BlinkMacSystemFont, "Söhne", sans-serif`;
  const shadow = "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)";

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 14, lineHeight: 1.55, display: "flex", minHeight: 540 }}>
      <aside style={{ width: 220, padding: "24px 14px", background: subtle, borderRight: `1px solid ${border}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: accent, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>R</span>
          RVX
        </div>
        {["Today", "Pipeline", "Contacts", "Tasks", "Settings"].map((item, i) => (
          <div key={item} style={{
            padding: "8px 12px", borderRadius: 10, fontSize: 14, marginBottom: 2,
            color: i === 0 ? fg : muted,
            background: i === 0 ? card : "transparent",
            fontWeight: i === 0 ? 600 : 500,
            border: i === 0 ? `1px solid ${border}` : "1px solid transparent",
            boxShadow: i === 0 ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
          }}>
            {item}
          </div>
        ))}
      </aside>

      <div style={{ flex: 1, padding: "36px 40px" }}>
        <header style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 30, fontWeight: 700, margin: 0, letterSpacing: "-0.025em", lineHeight: 1.1 }}>Good morning, {GREETING_FIRST}</h1>
            <div style={{ color: muted, fontSize: 14, marginTop: 6 }}>{TODAY_DATE}</div>
          </div>
          <button style={{ background: fg, color: bg, border: "none", borderRadius: 999, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: shadow }}>+ New deal</button>
        </header>

        {/* Bento grid — big rounded cards, generous padding */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 18 }}>
          {STATS.map((s, i) => {
            const tints = ["#FEF3F2", "#FFF7ED", "#ECFDF5", "#EFF6FF"];
            return (
              <div key={s.label} style={{ background: card, borderRadius: 16, padding: "20px 22px", border: `1px solid ${border}`, boxShadow: shadow, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${tints[i]} 0%, transparent 60%)`, opacity: 0.5, pointerEvents: "none" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: 12, color: muted, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 32, fontWeight: 600, marginTop: 6, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>{s.hint}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
          <div style={{ background: card, borderRadius: 16, padding: 22, border: `1px solid ${border}`, boxShadow: shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>My tasks</h3>
              <span style={{ fontSize: 12, color: muted, background: subtle, padding: "3px 8px", borderRadius: 999, fontWeight: 500 }}>5 open</span>
            </div>
            {TASKS.map((t) => (
              <div key={t.title} style={{ padding: "12px 0", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, height: 18, border: `1.5px solid ${border}`, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{t.sub}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                  background: t.tone === "danger" ? "#FEF3F2" : t.tone === "warn" ? "#FFFAEB" : subtle,
                  color: t.tone === "danger" ? "#B42318" : t.tone === "warn" ? "#B54708" : muted,
                }}>{t.due}</span>
              </div>
            ))}
          </div>

          <div style={{ background: card, borderRadius: 16, padding: 22, border: `1px solid ${border}`, boxShadow: shadow }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, marginBottom: 16, letterSpacing: "-0.01em" }}>Team activity</h3>
            {ACTIVITY.map((a, i) => {
              const tints: Record<string, string> = { amber: "#FFFAEB", blue: "#EFF6FF", green: "#ECFDF5", purple: "#F5F3FF" };
              return (
                <div key={i} style={{ padding: "10px 0", borderTop: i === 0 ? "none" : `1px solid ${border}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: tints[a.tone], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                      {a.who !== "—" && <span style={{ fontWeight: 600 }}>{a.who} </span>}
                      {a.what}
                    </div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{a.when}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Shared rendering helpers used by Pipedrive light/dark (DRY)
// ============================================================================

function Sidebar({
  bg, border, fg, muted, accentBg, accentFg, items,
}: { bg: string; border: string; fg: string; muted: string; accentBg: string; accentFg: string; items: string[] }) {
  return (
    <aside style={{ width: 220, padding: "20px 16px", background: bg, borderRight: `1px solid ${border}` }}>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, color: fg, letterSpacing: "-0.02em" }}>🏞 RVX</div>
      {items.map((item, i) => (
        <div
          key={item}
          style={{
            padding: "10px 12px", borderRadius: 8, fontSize: 14, marginBottom: 4,
            color: i === 0 ? accentFg : muted,
            background: i === 0 ? accentBg : "transparent",
            fontWeight: i === 0 ? 600 : 500,
          }}
        >
          {item}
        </div>
      ))}
    </aside>
  );
}

function Card({ bg, border, shadow, children }: { bg: string; border: string; shadow: string; children: React.ReactNode }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: 20, border: `1px solid ${border}`, boxShadow: shadow }}>
      {children}
    </div>
  );
}

function CardHeader({ title, right, fg, muted }: { title: string; right?: string; fg: string; muted: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: fg }}>{title}</h3>
      {right && <span style={{ fontSize: 12, color: muted }}>{right}</span>}
    </div>
  );
}

function StatGrid({ stats, variant }: { stats: typeof STATS; variant: "pipedrive-light" | "pipedrive-dark" }) {
  const lightColors = [
    { bg: "#FEF3F2", tint: "#D92D20" }, { bg: "#FFF7ED", tint: "#F97316" },
    { bg: "#ECFDF5", tint: "#10B981" }, { bg: "#EFF6FF", tint: "#3B82F6" },
  ];
  const darkColors = [
    { bg: "rgba(239,68,68,0.13)", tint: "#F87171" }, { bg: "rgba(245,158,11,0.13)", tint: "#FBBF24" },
    { bg: "rgba(34,197,94,0.13)", tint: "#34D399" }, { bg: "rgba(59,130,246,0.13)", tint: "#60A5FA" },
  ];
  const isDark = variant === "pipedrive-dark";
  const colors = isDark ? darkColors : lightColors;
  const cardBg = isDark ? "#1A1B22" : "#FFFFFF";
  const border = isDark ? "#2A2D38" : "#E8E4DC";
  const fg = isDark ? "#E8E8EA" : "#1B1B1F";
  const muted = isDark ? "#8A8F98" : "#6E7280";
  const shadow = isDark ? "0 1px 3px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)" : "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
      {stats.map((s, i) => {
        const c = colors[i];
        return (
          <div key={s.label} style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 18px", boxShadow: shadow }}>
            <div style={{ display: "inline-block", background: c.bg, color: c.tint, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: fg, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{s.hint}</div>
          </div>
        );
      })}
    </div>
  );
}

function TaskRow({
  t, variant, fg, muted, border,
}: { t: typeof TASKS[number]; variant: "pipedrive-light" | "pipedrive-dark"; fg: string; muted: string; border: string }) {
  const isDark = variant === "pipedrive-dark";
  const tones = {
    danger: isDark ? { bg: "rgba(239,68,68,0.15)", fg: "#F87171" } : { bg: "#FEF3F2", fg: "#B42318" },
    warn: isDark ? { bg: "rgba(245,158,11,0.15)", fg: "#FBBF24" } : { bg: "#FFFAEB", fg: "#B54708" },
    muted: isDark ? { bg: "rgba(255,255,255,0.05)", fg: muted } : { bg: "#F4F4F5", fg: muted },
  };
  const tone = tones[t.tone];
  return (
    <div style={{ padding: "12px 0", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 18, height: 18, border: `2px solid ${border}`, borderRadius: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: fg }}>{t.title}</div>
        <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{t.sub}</div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: tone.bg, color: tone.fg }}>{t.due}</span>
    </div>
  );
}

function ActivityRow({
  a, index, variant, fg, muted, border,
}: { a: typeof ACTIVITY[number]; index: number; variant: "pipedrive-light" | "pipedrive-dark"; fg: string; muted: string; border: string }) {
  const isDark = variant === "pipedrive-dark";
  const tints: Record<string, string> = isDark
    ? { amber: "rgba(245,158,11,0.13)", blue: "rgba(59,130,246,0.13)", green: "rgba(34,197,94,0.13)", purple: "rgba(168,85,247,0.13)" }
    : { amber: "#FFFAEB", blue: "#EFF6FF", green: "#ECFDF5", purple: "#F5F3FF" };
  return (
    <div style={{ padding: "10px 0", display: "flex", alignItems: "flex-start", gap: 10, borderTop: index === 0 ? "none" : `1px solid ${border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: tints[a.tone], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{a.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: fg }}>
          {a.who !== "—" && <span style={{ fontWeight: 600 }}>{a.who} </span>}
          {a.what}
        </div>
        <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{a.when}</div>
      </div>
    </div>
  );
}
