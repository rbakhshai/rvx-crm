"use client";

/**
 * Branded replacement for window.confirm() / window.prompt().
 *
 * Usage:
 *   const dialog = useConfirmDialog();
 *   <button onClick={() => dialog.ask({ title: "Delete this task?", danger: true, onConfirm: doDelete })} />
 *   {dialog.node}
 *
 * Pass `input` to collect a short reason (prompt-style); onConfirm
 * receives the trimmed value ("" when no input was requested).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export type ConfirmConfig = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm button as destructive (rose) instead of primary. */
  danger?: boolean;
  /** Prompt-style: collect a short text value, passed to onConfirm. */
  input?: { label: string; placeholder?: string; required?: boolean };
  onConfirm: (inputValue: string) => void;
};

export function useConfirmDialog() {
  const [cfg, setCfg] = useState<ConfirmConfig | null>(null);
  const ask = useCallback((c: ConfirmConfig) => setCfg(c), []);
  const close = useCallback(() => setCfg(null), []);
  return {
    ask,
    node: cfg ? <ConfirmDialog cfg={cfg} close={close} /> : null,
  };
}

function ConfirmDialog({ cfg, close }: { cfg: ConfirmConfig; close: () => void }) {
  const [value, setValue] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (cfg.input ? inputRef.current : confirmRef.current)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cfg.input, close]);

  const disabled = !!cfg.input?.required && value.trim().length === 0;

  function submit() {
    if (disabled) return;
    const v = value.trim();
    close();
    cfg.onConfirm(v);
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label={cfg.title}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-2xl">
        <h2 className="text-base font-semibold">{cfg.title}</h2>
        {cfg.body && <p className="mt-1.5 text-sm text-muted leading-relaxed">{cfg.body}</p>}
        {cfg.input && (
          <div className="mt-4">
            <label className="block text-[10px] uppercase tracking-widest text-muted font-medium mb-1.5">
              {cfg.input.label}
            </label>
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={cfg.input.placeholder}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-border bg-background px-3.5 py-1.5 text-sm hover:bg-foreground/[0.04] transition"
          >
            {cfg.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={submit}
            disabled={disabled}
            className={
              cfg.danger
                ? "rounded-md bg-rose-600 text-white px-3.5 py-1.5 text-sm font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                : "rounded-md bg-primary text-primary-foreground px-3.5 py-1.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            }
          >
            {cfg.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
