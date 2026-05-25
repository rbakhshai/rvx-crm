/**
 * Tiny template engine: {{var.path}} substitution against a context object.
 * Missing values render as empty string. Whitespace inside the braces is OK.
 *
 * Example: render("Hi {{buyer.firstName}}", { buyer: { firstName: "Ella" }})
 *   → "Hi Ella"
 */

const PATTERN = /{{\s*([\w.]+)\s*}}/g;

export type RenderContext = Record<string, unknown>;

function lookup(ctx: RenderContext, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return acc;
    if (typeof acc === "object" && acc !== null && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, ctx);
}

export function render(template: string, ctx: RenderContext): string {
  return template.replace(PATTERN, (_, path: string) => {
    const v = lookup(ctx, path);
    if (v == null) return "";
    return String(v);
  });
}

/**
 * Variables exposed to dispo email templates. Templates can reference
 * {{buyer.firstName}}, {{deal.parkAddress}}, {{sender.name}}, etc.
 */
export type DispoContext = {
  buyer: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    qualificationTier?: string | null;
  };
  deal: {
    name?: string | null;
    parkAddress?: string | null;
    parkCity?: string | null;
    parkState?: string | null;
    listPrice?: string | null;
    listNoi?: string | null;
    padsCount?: number | null;
    listCapRate?: string | null;
    url: string; // link to CRM detail
  };
  sender: {
    name?: string | null;
    firstName?: string | null;
    email?: string | null;
  };
  appUrl: string;
};
