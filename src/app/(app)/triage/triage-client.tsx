"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { AiSummaryCard } from "./ai-summary-card";
import { CALL_OUTCOMES, type Queue, buildTriageUrl, suggestedStatusForOutcome } from "./lib";
import { triageDealAction } from "./actions";

type DealCard = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  padsCount: number | null;
  listPrice: string | null;
  listNoi: string | null;
  listCapRate: string | null;
  statusCode: string | null;
  callDisposition: string | null;
  updateToBirdDog: string | null;
  lastNote: string | null;
  aiSummaryMd: string | null;
  closerLastTouch: string | null;
  createdAt: string;
};

type Person = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  cellPhone?: string | null;
  email?: string | null;
};

type Seller = {
  id: string;
  name: string | null;
  sellerFirstName: string | null;
  sellerLastName: string | null;
  phone: string | null;
  email: string | null;
};

type StatusOption = { code: string; label: string; role: string };

type QueueItem = {
  id: string;
  title: string;
  sub: string;
  statusCode: string | null;
  closerLastTouch: string | null;
  createdAt: string;
};

function fmtMoney(v: string | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toLocaleString()}`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const t = new Date(iso).getTime();
  const days = Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : null;
}

export function TriageClient({
  queue,
  queueLength,
  position,
  deal,
  birdDog,
  seller,
  statusOptions,
  queueRows,
  mapSlot,
}: {
  queue: Queue;
  queueLength: number;
  position: number;
  deal: DealCard;
  birdDog: Person | null;
  seller: Seller | null;
  statusOptions: StatusOption[];
  queueRows: QueueItem[];
  mapSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [callOutcome, setCallOutcome] = useState<string>(deal.callDisposition ?? "");
  const [note, setNote] = useState("");
  const [bdMessage, setBdMessage] = useState(deal.updateToBirdDog ?? "");
  const [statusCode, setStatusCode] = useState<string>(deal.statusCode ?? "");
  const [notifyBd, setNotifyBd] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isPending, startTransition] = useTransition();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Quick lookup so queue items can render a human stage label.
  const statusLabelMap = useMemo(
    () => new Map(statusOptions.map((s) => [s.code, s.label])),
    [statusOptions],
  );

  // Current index in the queue, used for j/k navigation.
  const currentIdx = useMemo(
    () => queueRows.findIndex((r) => r.id === deal.id),
    [queueRows, deal.id],
  );

  function jumpToQueueIdx(idx: number) {
    const target = queueRows[idx];
    if (!target) return;
    router.push(buildTriageUrl(queue, target.id) as never);
  }

  // Reset local state when navigating to a different deal
  useEffect(() => {
    setCallOutcome(deal.callDisposition ?? "");
    setNote("");
    setBdMessage(deal.updateToBirdDog ?? "");
    setStatusCode(deal.statusCode ?? "");
    setNotifyBd(true);
  }, [deal.id, deal.callDisposition, deal.updateToBirdDog, deal.statusCode]);

  // When the outcome changes, auto-suggest the next status (but never overwrite
  // an explicit user pick mid-edit).
  function handleOutcomeChange(next: string) {
    setCallOutcome(next);
    const suggested = suggestedStatusForOutcome(next);
    if (suggested) setStatusCode(suggested);
  }

  // Keyboard shortcuts:
  //   1-7      pick call outcome
  //   n        focus internal note
  //   j        next deal in queue (without saving)
  //   k        prev deal in queue
  //   ⌘↩       save + next deal
  //   →        skip to next without saving
  //   ?        show shortcut overlay
  //   esc      close shortcut overlay
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        submit("next");
        return;
      }

      // Esc always closes the overlay, even from inside a field
      if (e.key === "Escape" && showShortcuts) {
        setShowShortcuts(false);
        return;
      }

      if (inField) return;

      if (e.key >= "1" && e.key <= String(CALL_OUTCOMES.length)) {
        const idx = parseInt(e.key, 10) - 1;
        const code = CALL_OUTCOMES[idx]?.code;
        if (code) handleOutcomeChange(code);
        return;
      }
      if (e.key === "n") { e.preventDefault(); noteRef.current?.focus(); return; }
      if (e.key === "j") { e.preventDefault(); jumpToQueueIdx(currentIdx + 1); return; }
      if (e.key === "k") { e.preventDefault(); jumpToQueueIdx(currentIdx - 1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); submit("skip"); return; }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) { e.preventDefault(); setShowShortcuts((v) => !v); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, queueRows, showShortcuts]);

  function submit(action: "next" | "stay" | "skip") {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    fd.set("action", action);
    startTransition(() => {
      triageDealAction(fd);
    });
  }

  const title = deal.name || deal.parkAddress || "(unnamed deal)";
  const loc = [deal.parkCity, deal.parkState].filter(Boolean).join(", ");
  const sellerName = seller
    ? [seller.sellerFirstName, seller.sellerLastName].filter(Boolean).join(" ") || seller.name || "(seller)"
    : null;
  const sellerTel = telHref(seller?.phone);
  const bdName = birdDog ? [birdDog.firstName, birdDog.lastName].filter(Boolean).join(" ") || "(bird dog)" : null;
  const bdTel = telHref(birdDog?.cellPhone);

  const currentStatusLabel = useMemo(
    () => statusOptions.find((s) => s.code === deal.statusCode)?.label ?? deal.statusCode ?? "—",
    [statusOptions, deal.statusCode],
  );

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      {/* MAIN: deal card + action form */}
      <section className="space-y-4">
        {/* Position bar */}
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            Deal <span className="text-foreground font-medium tabular-nums">{position}</span> of{" "}
            <span className="tabular-nums">{queueLength}</span> · last touch {fmtRelative(deal.closerLastTouch)}
          </span>
          <Link
            href={`/deals/${deal.id}`}
            className="text-foreground/60 hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open full deal ↗
          </Link>
        </div>

        {/* Deal essentials */}
        <div className="rounded-xl border border-border p-5 bg-foreground/[0.01]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold truncate">{title}</h2>
              {(deal.parkAddress || loc) && (
                <p className="text-sm text-muted mt-0.5 truncate">
                  {deal.parkAddress}
                  {deal.parkAddress && loc ? " · " : ""}
                  {loc}
                </p>
              )}
            </div>
            <Badge tone="muted">{currentStatusLabel}</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="List price" value={fmtMoney(deal.listPrice)} />
            <Stat label="List NOI" value={fmtMoney(deal.listNoi)} />
            <Stat label="Pads" value={deal.padsCount?.toString() ?? "—"} />
            <Stat label="Cap rate" value={deal.listCapRate ?? "—"} />
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-3 pt-4 border-t border-border">
            <ContactBlock
              role="Seller"
              name={sellerName}
              phone={seller?.phone ?? null}
              email={seller?.email ?? null}
              telHref={sellerTel}
              companyName={seller?.name ?? null}
            />
            <ContactBlock
              role="Bird dog"
              name={bdName}
              phone={birdDog?.cellPhone ?? null}
              email={birdDog?.email ?? null}
              telHref={bdTel}
              companyName={null}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <AiSummaryCard dealId={deal.id} initialSummary={deal.aiSummaryMd} />
          </div>

          {deal.lastNote && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-xs uppercase tracking-widest text-muted font-medium mb-1">Last note</div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{deal.lastNote}</p>
            </div>
          )}

          {mapSlot && <div className="mt-4 pt-4 border-t border-border">{mapSlot}</div>}
        </div>

        {/* Action form */}
        <form ref={formRef} action={triageDealAction} className="rounded-xl border border-border p-5 space-y-4">
          <input type="hidden" name="dealId" value={deal.id} />
          <input type="hidden" name="queue" value={queue} />
          <input type="hidden" name="action" value="next" />

          <div>
            <div className="text-xs uppercase tracking-widest text-muted font-medium mb-2">
              Call outcome <span className="text-foreground/50 normal-case font-normal">(press 1–{CALL_OUTCOMES.length})</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {CALL_OUTCOMES.map((o, i) => {
                const checked = callOutcome === o.code;
                return (
                  <label
                    key={o.code}
                    className={
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer border " +
                      (checked
                        ? "border-primary/40 bg-primary/[0.06] text-foreground"
                        : "border-border text-foreground/80 hover:bg-foreground/[0.03]")
                    }
                  >
                    <input
                      type="radio"
                      name="callOutcome"
                      value={o.code}
                      checked={checked}
                      onChange={() => handleOutcomeChange(o.code)}
                      className="size-3.5"
                    />
                    <span className="text-[10px] tabular-nums text-muted w-3">{i + 1}</span>
                    <span>{o.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted font-medium">
              Internal note <span className="text-foreground/50 normal-case font-normal">(press n to focus)</span>
            </span>
            <textarea
              ref={noteRef}
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What was discussed?"
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </label>

          {(birdDog || deal.updateToBirdDog) && (
            <div className="rounded-md border border-border bg-foreground/[0.02] p-3 space-y-2">
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-muted font-medium">
                  Update for bird dog {bdName && <span className="normal-case text-foreground/70">→ {bdName}</span>}
                </span>
                <textarea
                  name="updateToBirdDog"
                  value={bdMessage}
                  onChange={(e) => setBdMessage(e.target.value)}
                  rows={2}
                  placeholder="Brief — they'll see this in their inbox and (eventually) portal."
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground/80">
                <input
                  type="checkbox"
                  name="notifyBirdDog"
                  checked={notifyBd}
                  onChange={(e) => setNotifyBd(e.target.checked)}
                  className="size-3.5"
                  disabled={!birdDog?.email || !bdMessage.trim()}
                />
                Email bird dog when I save{" "}
                {!birdDog?.email && <span className="text-foreground/50">(no email on file)</span>}
              </label>
            </div>
          )}

          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted font-medium">Advance status</span>
            <select
              name="statusCode"
              value={statusCode}
              onChange={(e) => setStatusCode(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">— keep current —</option>
              {statusOptions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
            {suggestedStatusForOutcome(callOutcome) === statusCode && callOutcome && (
              <span className="text-[11px] text-muted mt-1 block">Suggested for this outcome.</span>
            )}
          </label>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            <div className="text-[11px] text-muted">
              ⌘↩ save · → skip · j/k queue ·{" "}
              <button
                type="button"
                onClick={() => setShowShortcuts(true)}
                className="underline-offset-2 hover:underline"
              >
                ? all shortcuts
              </button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={isPending} onClick={() => submit("skip")}>
                Skip
              </Button>
              <Button type="button" variant="secondary" disabled={isPending} onClick={() => submit("stay")}>
                {isPending ? "Saving…" : "Save & stay"}
              </Button>
              <Button type="button" disabled={isPending} onClick={() => submit("next")}>
                {isPending ? "Saving…" : "Save & next deal →"}
              </Button>
            </div>
          </div>
        </form>
      </section>

      {/* SIDE: queue list */}
      <aside className="space-y-2">
        <div className="text-xs uppercase tracking-widest text-muted font-medium px-1 flex items-baseline justify-between">
          <span>Queue ({queueLength})</span>
          <span className="text-[10px] normal-case tracking-normal text-muted/80">j/k to step</span>
        </div>
        <ul className="space-y-1 max-h-[75vh] overflow-y-auto pr-1">
          {queueRows.map((r) => {
            const active = r.id === deal.id;
            // Stale-queue items care about "last touched" since that's the
            // sort key; everywhere else "created N days ago" is more useful.
            const timeLabel =
              queue === "stale"
                ? `last touched ${fmtRelative(r.closerLastTouch)}`
                : `created ${fmtRelative(r.createdAt)}`;
            const statusLabel = r.statusCode ? statusLabelMap.get(r.statusCode) ?? r.statusCode : null;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => router.push(buildTriageUrl(queue, r.id) as never)}
                  className={
                    "w-full text-left rounded-md px-2.5 py-2 text-sm border transition " +
                    (active
                      ? "border-primary/40 bg-primary/[0.06]"
                      : "border-transparent hover:bg-foreground/[0.04] hover:border-border")
                  }
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium truncate flex-1">{r.title}</div>
                    {active && <span className="text-[10px] text-primary font-medium shrink-0">●</span>}
                  </div>
                  <div className="text-[11px] text-muted truncate">{r.sub || "—"}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                    {statusLabel && (
                      <span className="inline-block rounded-sm bg-foreground/[0.06] px-1.5 py-0.5 text-foreground/70 truncate max-w-[160px]">
                        {statusLabel}
                      </span>
                    )}
                    <span className="text-muted tabular-nums">{timeLabel}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {showShortcuts && (
        <ShortcutOverlay onClose={() => setShowShortcuts(false)} outcomeCount={CALL_OUTCOMES.length} />
      )}
    </div>
  );
}

function ShortcutOverlay({ onClose, outcomeCount }: { onClose: () => void; outcomeCount: number }) {
  const rows: Array<[string, string]> = [
    [`1–${outcomeCount}`, "Pick call outcome"],
    ["n", "Focus the internal note"],
    ["j", "Next deal in queue"],
    ["k", "Previous deal in queue"],
    ["→", "Skip — next without saving"],
    ["⌘↩", "Save + advance to next deal"],
    ["?", "Show / hide this cheatsheet"],
    ["esc", "Close this cheatsheet"],
  ];
  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center bg-foreground/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-background border border-border rounded-xl shadow-xl p-5 w-[360px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Keyboard shortcuts</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-muted hover:text-foreground"
            aria-label="Close"
          >
            esc
          </button>
        </div>
        <dl className="space-y-1.5">
          {rows.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <dt className="text-muted">{label}</dt>
              <dd>
                <kbd className="font-mono bg-foreground/[0.06] border border-border rounded px-1.5 py-0.5 text-[11px] text-foreground">
                  {key}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ContactBlock({
  role,
  name,
  phone,
  email,
  telHref,
  companyName,
}: {
  role: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  telHref: string | null;
  companyName: string | null;
}) {
  if (!name && !phone && !email) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted font-medium">{role}</div>
        <div className="text-sm text-muted">— not linked —</div>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted font-medium">{role}</div>
      <div className="text-sm font-medium">{name || "—"}</div>
      {companyName && companyName !== name && <div className="text-xs text-muted">{companyName}</div>}
      <div className="mt-1 flex flex-wrap gap-2 text-xs">
        {telHref && phone ? (
          <a
            href={telHref}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-foreground/[0.03] px-2 py-0.5 hover:bg-foreground/[0.08]"
          >
            📞 {phone}
          </a>
        ) : phone ? (
          <span className="text-muted">{phone}</span>
        ) : null}
        {email && (
          <a href={`mailto:${email}`} className="text-foreground/70 hover:text-foreground truncate">
            {email}
          </a>
        )}
      </div>
    </div>
  );
}
