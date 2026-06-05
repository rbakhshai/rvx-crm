/**
 * Three visual treatments of the same "Today" view, side-by-side so the user
 * can pick a design direction.
 *
 *   1. Linear   — minimal, dense, single-accent, keyboard-driven feel
 *   2. Pipedrive — warmer palette, friendlier shadows, more colorful badges
 *   3. Notion   — data-forward, lots of whitespace, neutral palette
 *
 * Each mockup is fully self-contained (its own font stack, colors, shadows,
 * radii) so they don't bleed. Mock data is shared.
 *
 * Public route — no auth needed so you can share the URL or open on phone.
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
  { title: "Schedule Phase 1 environmental", due: "5d", tone: "muted" as const, sub: "Pine Hill MHP · Mobile, AL" },
];

const DEALS = [
  { title: "Acme Park", loc: "Chandler, AZ", stage: "Under negotiation", stale: "warn" as const, priority: "hot" as const },
  { title: "Oakwood RV", loc: "Tulsa, OK", stage: "LOI submitted", stale: "ok" as const, priority: "warm" as const },
  { title: "Fort Valley Ranch", loc: "Fort Valley, GA", stage: "Phase 2 review", stale: "stale" as const, priority: "hot" as const },
  { title: "Pine Hill MHP", loc: "Mobile, AL", stage: "First contact made", stale: "ok" as const, priority: "cold" as const },
];

const ACTIVITY = [
  { who: "Marco", icon: "📞", what: "Logged a call with Acme Park seller", when: "12m ago", tone: "amber" as const },
  { who: "Kerry", icon: "📝", what: "Uploaded Phase 1 environmental for Fort Valley", when: "1h ago", tone: "blue" as const },
  { who: "—",     icon: "🦅", what: "New deal: Pine Hill MHP via bird dog Mike",   when: "3h ago", tone: "green" as const },
  { who: "Marco", icon: "📤", what: "Dispo'd Riverside to 12 top-tier buyers",   when: "5h ago", tone: "purple" as const },
];

// ============================================================================
// Page
// ============================================================================

export default function StylesPreviewPage() {
  return (
    <main style={{ background: "#F5F5F4", minHeight: "100vh", padding: "32px 16px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: "#18181B", letterSpacing: "-0.02em" }}>
            Pick a visual direction
          </h1>
          <p style={{ color: "#71717A", marginTop: 6, fontSize: 14 }}>
            Same data, three styles. Scroll through and reply with the one that feels right (or describe what to mix).
          </p>
        </header>

        <Section name="Linear" tagline="Minimal · dense · single accent · keyboard-driven feel · what Linear, Vercel, Attio use">
          <LinearMockup />
        </Section>

        <Section name="Pipedrive" tagline="Warmer palette · soft shadows · colorful status badges · more friendly, less developer-y">
          <PipedriveMockup />
        </Section>

        <Section name="Notion" tagline="Data-forward · generous whitespace · neutral palette · serif accents · lets content breathe">
          <NotionMockup />
        </Section>

        <footer style={{ textAlign: "center", color: "#71717A", fontSize: 13, marginTop: 48 }}>
          Reply &quot;Linear&quot;, &quot;Pipedrive&quot;, &quot;Notion&quot;, or describe a mix.
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
      <div style={{ borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        {children}
      </div>
    </section>
  );
}

// ============================================================================
// LINEAR style — minimal, dense, single accent, low contrast
// ============================================================================

function LinearMockup() {
  const accent = "#5E6AD2";
  const bg = "#FFFFFF";
  const fg = "#0E0E10";
  const muted = "#8A8F98";
  const border = "#EBECF0";
  const font = `"Inter Variable", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`;

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 13, lineHeight: 1.5, display: "flex", minHeight: 560 }}>
      {/* Sidebar */}
      <aside style={{ width: 200, borderRight: `1px solid ${border}`, padding: "16px 12px", background: "#FAFBFC" }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 16, color: fg, letterSpacing: "-0.01em" }}>RVX</div>
        {["Today", "Pipeline", "Contacts", "Tasks", "Settings"].map((item, i) => (
          <div
            key={item}
            style={{
              padding: "5px 8px",
              borderRadius: 4,
              fontSize: 13,
              marginBottom: 1,
              color: i === 0 ? fg : muted,
              background: i === 0 ? "#F4F5F8" : "transparent",
              fontWeight: i === 0 ? 500 : 400,
            }}
          >
            {item}
          </div>
        ))}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, padding: "24px 32px" }}>
        <header style={{ borderBottom: `1px solid ${border}`, paddingBottom: 16, marginBottom: 20 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
            Good morning, {GREETING_FIRST}
          </h1>
          <div style={{ color: muted, fontSize: 12, marginTop: 2 }}>{TODAY_DATE}</div>
        </header>

        {/* Stats — dense tile row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 24 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ border: `1px solid ${border}`, borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Tasks list — single column, dense divider rows */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: muted, marginBottom: 8 }}>
              My tasks
            </div>
            <div style={{ border: `1px solid ${border}`, borderRadius: 6 }}>
              {TASKS.slice(0, 4).map((t, i) => (
                <div key={t.title} style={{ display: "flex", alignItems: "center", padding: "8px 10px", borderTop: i === 0 ? "none" : `1px solid ${border}`, gap: 8 }}>
                  <div style={{ width: 12, height: 12, border: `1.5px solid ${border}`, borderRadius: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: fg, lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: muted, marginTop: 0 }}>{t.sub}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 500, padding: "2px 6px", borderRadius: 4,
                    background: t.tone === "danger" ? "#FFEBED" : t.tone === "warn" ? "#FFF4E0" : "#F4F5F8",
                    color: t.tone === "danger" ? "#C92847" : t.tone === "warn" ? "#A05E03" : muted,
                  }}>
                    {t.due}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: muted, marginBottom: 8 }}>
              Activity
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACTIVITY.map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 4, background: "#F4F5F8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: fg, lineHeight: 1.4 }}>
                      {a.who !== "—" && <span style={{ fontWeight: 500 }}>{a.who} </span>}
                      {a.what}
                    </div>
                    <div style={{ fontSize: 11, color: muted }}>{a.when}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accent CTA */}
        <button style={{ marginTop: 28, background: accent, color: "white", border: "none", borderRadius: 5, padding: "6px 12px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          + New deal
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PIPEDRIVE style — warm, colorful, soft shadows, friendlier
// ============================================================================

function PipedriveMockup() {
  const bg = "#F7F6F2";
  const card = "#FFFFFF";
  const fg = "#1B1B1F";
  const muted = "#6E7280";
  const accent = "#26A65B";
  const border = "#E8E4DC";
  const font = `"Rubik", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif`;
  const shadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)";

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 14, lineHeight: 1.5, display: "flex", minHeight: 560 }}>
      {/* Sidebar */}
      <aside style={{ width: 220, padding: "20px 16px", background: "#FFFFFF", borderRight: `1px solid ${border}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 24, color: fg, letterSpacing: "-0.02em" }}>
          🏞 RVX
        </div>
        {[
          { name: "Today", icon: "☀️" },
          { name: "Pipeline", icon: "📋" },
          { name: "Contacts", icon: "👥" },
          { name: "Tasks", icon: "✓" },
          { name: "Settings", icon: "⚙️" },
        ].map((item, i) => (
          <div
            key={item.name}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 14,
              marginBottom: 4,
              color: i === 0 ? fg : muted,
              background: i === 0 ? "#E9F5EE" : "transparent",
              fontWeight: i === 0 ? 600 : 500,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 14 }}>{item.icon}</span> {item.name}
          </div>
        ))}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, padding: "32px 36px" }}>
        <header style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
              Good morning, {GREETING_FIRST} 👋
            </h1>
            <div style={{ color: muted, fontSize: 13, marginTop: 4 }}>{TODAY_DATE}</div>
          </div>
          <button style={{ background: accent, color: "white", border: "none", borderRadius: 999, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: shadow }}>
            + Add deal
          </button>
        </header>

        {/* Big colorful stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
          {STATS.map((s, i) => {
            const colors = [
              { bg: "#FEF3F2", tint: "#D92D20" },
              { bg: "#FFF7ED", tint: "#F97316" },
              { bg: "#ECFDF5", tint: "#10B981" },
              { bg: "#EFF6FF", tint: "#3B82F6" },
            ];
            const c = colors[i];
            return (
              <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "16px 18px", boxShadow: shadow }}>
                <div style={{ display: "inline-block", background: c.bg, color: c.tint, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: fg, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{s.hint}</div>
              </div>
            );
          })}
        </div>

        {/* Two columns: tasks + activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
          <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}`, boxShadow: shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>My tasks</h3>
              <span style={{ fontSize: 12, color: muted }}>5 open</span>
            </div>
            {TASKS.slice(0, 4).map((t) => (
              <div key={t.title} style={{ padding: "12px 0", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 18, height: 18, border: `2px solid ${border}`, borderRadius: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: fg }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{t.sub}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999,
                  background: t.tone === "danger" ? "#FEF3F2" : t.tone === "warn" ? "#FFFAEB" : "#F4F4F5",
                  color: t.tone === "danger" ? "#B42318" : t.tone === "warn" ? "#B54708" : muted,
                }}>
                  {t.due}
                </span>
              </div>
            ))}
          </div>

          <div style={{ background: card, borderRadius: 12, padding: 20, border: `1px solid ${border}`, boxShadow: shadow }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, marginBottom: 16 }}>Team activity</h3>
            {ACTIVITY.map((a, i) => {
              const tints: Record<string, string> = { amber: "#FFFAEB", blue: "#EFF6FF", green: "#ECFDF5", purple: "#F5F3FF" };
              return (
                <div key={i} style={{ padding: "10px 0", display: "flex", alignItems: "flex-start", gap: 10, borderTop: i === 0 ? "none" : `1px solid ${border}` }}>
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NOTION style — data-forward, generous whitespace, neutral, serif accents
// ============================================================================

function NotionMockup() {
  const bg = "#FFFFFF";
  const fg = "#37352F";
  const muted = "#9B9A97";
  const accent = "#2383E2";
  const border = "#E9E9E7";
  const subtle = "#F7F6F3";
  const font = `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const serif = `"Lora", "Iowan Old Style", "Charter", Georgia, serif`;

  return (
    <div style={{ background: bg, color: fg, fontFamily: font, fontSize: 15, lineHeight: 1.6, display: "flex", minHeight: 560 }}>
      {/* Sidebar */}
      <aside style={{ width: 240, padding: "20px 8px", background: subtle, borderRight: `1px solid ${border}` }}>
        <div style={{ padding: "0 12px 16px", fontSize: 14, fontWeight: 600, color: fg }}>RVX CRM</div>
        {["Today", "Pipeline", "Contacts", "Tasks", "Settings"].map((item, i) => (
          <div
            key={item}
            style={{
              padding: "4px 12px",
              fontSize: 14,
              marginBottom: 1,
              color: i === 0 ? fg : "#787774",
              background: i === 0 ? "rgba(35,131,226,0.07)" : "transparent",
              fontWeight: 400,
              borderRadius: 3,
            }}
          >
            {item}
          </div>
        ))}
      </aside>

      {/* Main */}
      <div style={{ flex: 1, padding: "60px 80px" }}>
        <header style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0, color: fg, fontFamily: serif, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            Good morning, {GREETING_FIRST}.
          </h1>
          <div style={{ color: muted, fontSize: 14, marginTop: 6 }}>{TODAY_DATE}</div>
        </header>

        {/* Stats — text-only, no boxes, generous spacing */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 32, marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${border}` }}>
          {STATS.map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500, marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, color: fg, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: muted, marginTop: 4 }}>{s.hint}</div>
            </div>
          ))}
        </div>

        {/* Tasks — flat list with generous padding */}
        <div style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: fg, fontFamily: serif }}>My tasks</h2>
          <div>
            {TASKS.slice(0, 4).map((t) => (
              <div key={t.title} style={{ display: "flex", alignItems: "center", padding: "10px 0", gap: 12, borderBottom: `1px solid ${border}` }}>
                <div style={{ width: 16, height: 16, border: `1.5px solid #C9C8C5`, borderRadius: 3, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, color: fg, lineHeight: 1.4 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: muted }}>{t.sub}</div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 400, padding: "2px 8px", borderRadius: 3,
                  background: t.tone === "danger" ? "#FEF2F2" : t.tone === "warn" ? "#FEF6E7" : "transparent",
                  color: t.tone === "danger" ? "#9B2C2C" : t.tone === "warn" ? "#8B6914" : muted,
                }}>
                  {t.due}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity feed - prose-style */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: fg, fontFamily: serif }}>Activity</h2>
          <div>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: i === ACTIVITY.length - 1 ? "none" : `1px solid ${border}`, display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 16, lineHeight: 1, opacity: 0.85 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: fg, lineHeight: 1.5 }}>
                    {a.who !== "—" && <span style={{ fontWeight: 500, color: fg }}>{a.who}</span>}
                    {a.who !== "—" && " "}
                    {a.what}.
                  </div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>{a.when}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button style={{ marginTop: 40, background: "transparent", color: accent, border: `1px solid ${border}`, borderRadius: 4, padding: "6px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
          + New deal
        </button>
      </div>
    </div>
  );
}
