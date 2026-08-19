/**
 * GET /api/export/:scope — CSV download of the primary lists
 * (Kevin's beta finding #5: no way to get data out for reporting).
 *
 * Scopes: contacts | companies | deals | bird-dogs
 * Gated per scope with the same capability as the page. Non-deleted
 * rows only. Cells are quoted and formula-prefixed cells are escaped
 * so a crafted name can't execute in Excel/Sheets (CSV injection).
 */
import { headers } from "next/headers";
import { asc, isNull } from "drizzle-orm";
import { db } from "@/db";
import { contacts, companies, deals, birdDogs, dealStatuses } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/has-permission";
import type { PermissionKey } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  // Excel/Sheets formula-injection guard
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(headersRow: string[], rows: unknown[][]): string {
  const lines = [headersRow.map(csvCell).join(",")];
  for (const r of rows) lines.push(r.map(csvCell).join(","));
  return "﻿" + lines.join("\r\n"); // BOM so Excel opens UTF-8 correctly
}

const SCOPE_PERMISSION: Record<string, PermissionKey> = {
  contacts: "view_contacts",
  companies: "view_contacts",
  deals: "view_contacts",
  "bird-dogs": "view_bird_dogs_directory",
};

export async function GET(_req: Request, { params }: { params: Promise<{ scope: string }> }) {
  const { scope } = await params;
  const permission = SCOPE_PERMISSION[scope];
  if (!permission) return new Response("Unknown export scope", { status: 404 });

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!(await hasPermission(session.user, permission))) return new Response("Forbidden", { status: 403 });

  let csv = "";
  if (scope === "contacts") {
    const rows = await db.select().from(contacts).where(isNull(contacts.deletedAt)).orderBy(asc(contacts.createdAt));
    csv = toCsv(
      ["First name", "Last name", "Email", "Phone", "Status", "Tier", "POF", "City", "State", "Added"],
      rows.map((r) => [r.firstName, r.lastName, r.email, r.phone, r.status, r.qualificationTier, r.pofAmount, r.city, r.state, r.createdAt]),
    );
  } else if (scope === "companies") {
    const rows = await db.select().from(companies).where(isNull(companies.deletedAt)).orderBy(asc(companies.createdAt));
    csv = toCsv(
      ["Company", "Relationship", "Seller first", "Seller last", "Email", "Phone", "State", "Added"],
      rows.map((r) => [r.name, r.relationshipToPark, r.sellerFirstName, r.sellerLastName, r.email, r.phone, r.state, r.createdAt]),
    );
  } else if (scope === "deals") {
    const [rows, statuses] = await Promise.all([
      db.select().from(deals).where(isNull(deals.deletedAt)).orderBy(asc(deals.createdAt)),
      db.select().from(dealStatuses),
    ]);
    const label = new Map(statuses.map((s) => [s.code, s.label]));
    csv = toCsv(
      ["Deal", "Address", "City", "State", "Pads", "Stage", "Priority", "List price", "Agreed price", "In stage since", "Added"],
      rows.map((r) => [
        r.name, r.parkAddress, r.parkCity, r.parkState, r.padsCount,
        r.statusCode ? label.get(r.statusCode) ?? r.statusCode : "",
        r.dealPriority, r.listPrice, r.agreedPurchasePrice, r.statusChangedAt, r.createdAt,
      ]),
    );
  } else {
    const rows = await db.select().from(birdDogs).where(isNull(birdDogs.deletedAt)).orderBy(asc(birdDogs.createdAt));
    csv = toCsv(
      ["First name", "Last name", "Email", "Cell", "Status", "Level", "Start date", "Added"],
      rows.map((r) => [r.firstName, r.lastName, r.email, r.cellPhone, r.statusCode, r.acquisitionLevel, r.startDate, r.createdAt]),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rvx-${scope}-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
