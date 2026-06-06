/**
 * Transactional email templates. Each function returns { subject, bodyMd }
 * — bodyMd is plain text for now (renders fine in Gmail/Outlook). We can
 * upgrade to HTML later without changing callers.
 *
 * Keep tone friendly and direct. These are not marketing emails, they're
 * action emails — link / credentials / what to do next, no fluff.
 */

const APP_URL = () => process.env.BETTER_AUTH_URL ?? "https://rvx-crm.vercel.app";

// ============================================================================
// Team invite — sent when admin adds a user from /settings/users
// ============================================================================

export function teamInviteEmail(opts: {
  name: string;
  email: string;
  tempPassword: string;
  inviterName: string;
}): { subject: string; bodyMd: string } {
  return {
    subject: `You've been invited to the RVX CRM`,
    bodyMd: [
      `Hi ${opts.name.split(" ")[0]},`,
      ``,
      `${opts.inviterName} added you to the rvparkexchange.com team CRM. Use these details to log in:`,
      ``,
      `  Login:        ${APP_URL()}/login`,
      `  Email:        ${opts.email}`,
      `  Temp password: ${opts.tempPassword}`,
      ``,
      `Once you're signed in, head to your account settings to set your own password. The temp one above is single-use intent — change it now and don't share it.`,
      ``,
      `Welcome aboard,`,
      `RV Park Exchange`,
    ].join("\n"),
  };
}

// ============================================================================
// Password reset — sent when admin clicks "Reset pw" for a user
// ============================================================================

export function passwordResetEmail(opts: {
  name: string;
  email: string;
  tempPassword: string;
  resetterName: string;
}): { subject: string; bodyMd: string } {
  return {
    subject: `Your RVX CRM password was reset`,
    bodyMd: [
      `Hi ${opts.name.split(" ")[0]},`,
      ``,
      `${opts.resetterName} just reset your password on the team CRM. Your new login details:`,
      ``,
      `  Login:        ${APP_URL()}/login`,
      `  Email:        ${opts.email}`,
      `  Temp password: ${opts.tempPassword}`,
      ``,
      `If you didn't expect this, log in immediately and change your password — or ping ${opts.resetterName} directly.`,
      ``,
      `RV Park Exchange`,
    ].join("\n"),
  };
}
