/**
 * Shared zod helpers for form-data parsing.
 * HTML forms post empty strings; we coerce those to undefined.
 */
import { z } from "zod";

export const emptyToUndefined = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === "" || v == null ? undefined : v));

export const optionalText = emptyToUndefined;

export const optionalNumeric = emptyToUndefined.pipe(
  z
    .union([z.string(), z.undefined()])
    .refine((v) => v === undefined || !isNaN(Number(v)), { message: "Must be a number" }),
);

export const checkboxBool = z
  .union([z.string(), z.boolean(), z.undefined()])
  .transform((v) => v === "on" || v === "true" || v === true);

export const optionalDate = emptyToUndefined.pipe(
  z
    .union([z.string(), z.undefined()])
    .refine((v) => v === undefined || !isNaN(Date.parse(v)), { message: "Invalid date" }),
);

/** Parse FormData into a plain object, collecting multi-value keys into arrays. */
export function parseForm(formData: FormData, arrayFields: string[] = []): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    obj[key] = values.length > 1 ? values : values[0];
  }
  for (const f of arrayFields) {
    const v = obj[f];
    if (v === undefined) obj[f] = [];
    else if (!Array.isArray(v)) obj[f] = [v];
  }
  return obj;
}
