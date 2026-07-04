"use client";

import { useActionState } from "react";
import { submitContactAction, type ContactFormState } from "./contact-action";

const initial: ContactFormState = { ok: true };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactAction, initial);
  const e = (k: string) => state.errors?.[k]?.[0];

  return (
    <form action={formAction} className="space-y-4">
      {/* Honeypot: hidden from people, bots fill it → submission dropped. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-foreground">Your name *</span>
          <input
            type="text"
            name="name"
            required
            className={
              "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm " +
              (e("name") ? "border-red-400" : "border-border")
            }
          />
          {e("name") && <span className="text-[11px] text-red-600 mt-0.5 block">{e("name")}</span>}
        </label>
        <label className="block">
          <span className="text-xs font-medium text-foreground">Email *</span>
          <input
            type="email"
            name="email"
            required
            className={
              "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm " +
              (e("email") ? "border-red-400" : "border-border")
            }
          />
          {e("email") && <span className="text-[11px] text-red-600 mt-0.5 block">{e("email")}</span>}
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium text-foreground">Phone</span>
        <input
          type="tel"
          name="phone"
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-foreground">What can we help with? *</span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder="Are you a seller, a buyer, or just curious? Tell us a bit and we'll be in touch within a business day."
          className={
            "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm resize-y " +
            (e("message") ? "border-red-400" : "border-border")
          }
        />
        {e("message") && <span className="text-[11px] text-red-600 mt-0.5 block">{e("message")}</span>}
      </label>

      {state.message && !state.ok && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-gold-foreground hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Start the conversation →"}
      </button>
    </form>
  );
}
