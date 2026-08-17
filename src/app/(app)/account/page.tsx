/**
 * /account — self-serve account settings for the signed-in user.
 * Born from Kevin's beta finding #1: there was no way for anyone to
 * change their own password, so credential rotation couldn't stick.
 * Linked from the sidebar user block (click your name).
 */
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { PageShell } from "../page-shell";
import { ChangePasswordForm } from "./change-password-form";

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  return (
    <PageShell
      title="Your account"
      subtitle={`${session.user.name} · ${session.user.email}`}
      width="default"
    >
      <div className="max-w-md">
        <section className="rounded-xl border border-border bg-background p-5">
          <h2 className="text-sm font-bold">Change password</h2>
          <p className="text-[11px] text-muted mt-0.5 mb-4">
            Pick something memorable — after saving, other devices signed in
            with the old password are logged out.
          </p>
          <ChangePasswordForm />
        </section>
      </div>
    </PageShell>
  );
}
