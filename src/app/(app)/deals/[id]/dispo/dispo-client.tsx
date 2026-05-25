"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/button";
import { Badge } from "@/components/badge";
import { MatchScorePill } from "@/components/match-score-pill";
import { render, type DispoContext } from "@/lib/template-render";
import type { MessageTemplate } from "@/db/schema";
import { sendDispoAction } from "./actions";

type Buyer = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  qualificationTier: string | null;
  score: number;
  reasons: string[];
};

type DealForCtx = {
  id: string;
  name: string | null;
  parkAddress: string | null;
  parkCity: string | null;
  parkState: string | null;
  listPrice: string | null;
  listNoi: string | null;
  padsCount: number | null;
  listCapRate: string | null;
};

type Sender = { name: string | null; firstName: string | null; email: string | null };

function fmtMoney(v: string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return `$${n.toLocaleString()}`;
}

function nameOf(first: string | null, last: string | null) {
  return [first, last].filter(Boolean).join(" ") || "(unnamed)";
}

export function DispoClient({
  deal,
  buyers,
  templates,
  sender,
  appUrl,
}: {
  deal: DealForCtx;
  buyers: Buyer[];
  templates: MessageTemplate[];
  sender: Sender;
  appUrl: string;
}) {
  // Default: pre-check top 10 by score
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(buyers.slice(0, 10).filter((b) => b.email).map((b) => b.id)),
  );
  const [templateId, setTemplateId] = useState<string>(templates[0]?.id ?? "");
  const currentTemplate = templates.find((t) => t.id === templateId);
  const [subject, setSubject] = useState<string>(currentTemplate?.subject ?? "");
  const [body, setBody] = useState<string>(currentTemplate?.bodyText ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) {
      setSubject(t.subject);
      setBody(t.bodyText);
    }
  }

  // Preview against first selected buyer (or first buyer)
  const previewBuyer = useMemo(() => {
    const id = Array.from(selected)[0] ?? buyers[0]?.id;
    return buyers.find((b) => b.id === id) ?? buyers[0] ?? null;
  }, [selected, buyers]);

  const previewCtx: DispoContext | null = previewBuyer
    ? {
        buyer: {
          firstName: previewBuyer.firstName,
          lastName: previewBuyer.lastName,
          email: previewBuyer.email,
          qualificationTier: previewBuyer.qualificationTier,
        },
        deal: {
          name: deal.name,
          parkAddress: deal.parkAddress,
          parkCity: deal.parkCity,
          parkState: deal.parkState,
          listPrice: fmtMoney(deal.listPrice),
          listNoi: fmtMoney(deal.listNoi),
          padsCount: deal.padsCount,
          listCapRate: deal.listCapRate,
          url: `${appUrl}/deals/${deal.id}`,
        },
        sender,
        appUrl,
      }
    : null;

  const previewSubject = previewCtx ? render(subject, previewCtx as never) : subject;
  const previewBody = previewCtx ? render(body, previewCtx as never) : body;

  const sendable = Array.from(selected).filter((id) => buyers.find((b) => b.id === id)?.email);

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(buyers.filter((b) => b.email).map((b) => b.id)));
  }
  function clearAll() {
    setSelected(new Set());
  }
  function selectTopN(n: number) {
    setSelected(new Set(buyers.slice(0, n).filter((b) => b.email).map((b) => b.id)));
  }

  function submit() {
    if (sendable.length === 0) {
      setError("Pick at least one buyer with an email.");
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body are required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("dealId", deal.id);
      fd.set("subject", subject);
      fd.set("body", body);
      sendable.forEach((id) => fd.append("buyerIds", id));
      const result = await sendDispoAction(fd);
      if (!result.ok) setError(result.message ?? "Something went wrong");
    });
  }

  return (
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
      {/* LEFT: buyer list */}
      <section className="rounded-xl border border-border p-4">
        <header className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">
            Recipients <span className="text-muted">({sendable.length} selected of {buyers.length} matches)</span>
          </h2>
          <div className="flex gap-1 text-xs">
            <button type="button" onClick={() => selectTopN(10)} className="px-2 py-0.5 rounded border border-border hover:bg-foreground/[0.04]">Top 10</button>
            <button type="button" onClick={selectAll} className="px-2 py-0.5 rounded border border-border hover:bg-foreground/[0.04]">All</button>
            <button type="button" onClick={clearAll} className="px-2 py-0.5 rounded border border-border hover:bg-foreground/[0.04]">None</button>
          </div>
        </header>

        {buyers.length === 0 ? (
          <div className="text-xs text-muted text-center py-6">
            No matched buyers yet. Fill in park state, price, and pads on the deal to start ranking.
          </div>
        ) : (
          <ul className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
            {buyers.map((b) => {
              const hasEmail = !!b.email;
              const isSelected = selected.has(b.id);
              return (
                <li
                  key={b.id}
                  className={
                    "flex items-start gap-2 rounded-md p-2 border " +
                    (isSelected ? "border-primary/30 bg-primary/[0.04]" : "border-transparent hover:bg-foreground/[0.02]")
                  }
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!hasEmail}
                    onChange={() => toggle(b.id)}
                    className="mt-1 size-4 rounded border-border text-primary focus:ring-1 focus:ring-primary disabled:opacity-30"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{nameOf(b.firstName, b.lastName)}</span>
                      <MatchScorePill score={b.score} />
                      {!hasEmail && <Badge tone="muted">no email</Badge>}
                    </div>
                    <div className="text-[11px] text-muted truncate">{b.email ?? "—"}</div>
                    {b.reasons.length > 0 && (
                      <div className="mt-0.5 text-[10px] text-foreground/60 truncate">
                        {b.reasons.slice(0, 2).join(" · ")}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* RIGHT: composer + preview */}
      <section className="space-y-4">
        <div className="rounded-xl border border-border p-4 space-y-3">
          <div>
            <label className="block">
              <span className="text-xs font-medium text-foreground">Template</span>
              <select
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-foreground">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-mono"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-foreground">Body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono resize-y"
            />
            <span className="text-[11px] text-muted mt-1 block">
              Variables: <code>{`{{buyer.firstName}}`}</code> <code>{`{{deal.name}}`}</code> <code>{`{{deal.parkAddress}}`}</code> <code>{`{{deal.parkCity}}`}</code> <code>{`{{deal.parkState}}`}</code> <code>{`{{deal.listPrice}}`}</code> <code>{`{{deal.listNoi}}`}</code> <code>{`{{deal.padsCount}}`}</code> <code>{`{{deal.url}}`}</code> <code>{`{{sender.firstName}}`}</code>
            </span>
          </label>

          {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted">
              {process.env.NEXT_PUBLIC_EMAIL_READY === "true"
                ? "Live send via configured provider"
                : "Email provider not yet wired — sends will log to /notifications until then"}
            </span>
            <Button type="button" onClick={submit} disabled={isPending || sendable.length === 0}>
              {isPending ? "Sending…" : `Send to ${sendable.length} buyer${sendable.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
            Preview {previewBuyer ? `(as ${nameOf(previewBuyer.firstName, previewBuyer.lastName)})` : ""}
          </h3>
          <div className="rounded-md border border-border bg-foreground/[0.02] p-3 text-sm">
            <div className="font-semibold mb-2">{previewSubject || <span className="text-muted">(empty subject)</span>}</div>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{previewBody}</pre>
          </div>
        </div>
      </section>
    </div>
  );
}
