"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/has-permission";
import { companyFormSchema, parseCompanyForm } from "@/lib/validation/companies";

export type FormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Not authenticated");
  return session.user;
}

export async function createCompanyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = companyFormSchema.safeParse(parseCompanyForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const ownerId = v.ownerId || (await requireUser()).id;
  const [row] = await db
    .insert(companies)
    .values({
      ownerId,
      name: v.name,
      relationshipToPark: v.relationshipToPark,
      sellerFirstName: v.sellerFirstName,
      sellerLastName: v.sellerLastName,
      email: v.email,
      phone: v.phone,
      officePhone: v.officePhone,
      address: v.address,
      city: v.city,
      state: v.state,
      zipcode: v.zipcode,
      facebookPage: v.facebookPage,
      instagramName: v.instagramName,
      description: v.description,
      annualRevenue: v.annualRevenue as never,
      employeeCount: v.employeeCount as never,
      bulkEmailOptedOut: v.bulkEmailOptedOut,
    })
    .returning({ id: companies.id });
  revalidatePath("/companies");
  redirect(`/companies/${row.id}`);
}

export async function updateCompanyAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireUser();
  const parsed = companyFormSchema.safeParse(parseCompanyForm(formData));
  if (!parsed.success) {
    return { ok: false, message: "Fix the highlighted fields", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  await db
    .update(companies)
    .set({
      ownerId: v.ownerId || null,
      name: v.name,
      relationshipToPark: v.relationshipToPark,
      sellerFirstName: v.sellerFirstName,
      sellerLastName: v.sellerLastName,
      email: v.email,
      phone: v.phone,
      officePhone: v.officePhone,
      address: v.address,
      city: v.city,
      state: v.state,
      zipcode: v.zipcode,
      facebookPage: v.facebookPage,
      instagramName: v.instagramName,
      description: v.description,
      annualRevenue: v.annualRevenue as never,
      employeeCount: v.employeeCount as never,
      bulkEmailOptedOut: v.bulkEmailOptedOut,
      updatedAt: new Date(),
    })
    .where(eq(companies.id, id));
  revalidatePath(`/companies/${id}`);
  revalidatePath("/companies");
  redirect(`/companies/${id}`);
}

/** Soft-delete: row hidden from lists, recoverable from /trash for 30 days. */
export async function deleteCompanyAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "delete_companies");
  await db
    .update(companies)
    .set({ deletedAt: new Date(), deletedById: user.id, updatedAt: new Date() })
    .where(eq(companies.id, id));
  revalidatePath("/companies");
  revalidatePath("/trash");
  redirect("/companies");
}

export async function restoreCompanyAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "restore_from_trash");
  await db
    .update(companies)
    .set({ deletedAt: null, deletedById: null, updatedAt: new Date() })
    .where(eq(companies.id, id));
  revalidatePath("/companies");
  revalidatePath("/trash");
  redirect(`/companies/${id}`);
}

export async function purgeCompanyAction(id: string): Promise<void> {
  const user = await requireUser();
  await requirePermission(user, "purge_permanently");
  await db.delete(companies).where(eq(companies.id, id));
  revalidatePath("/trash");
  redirect("/trash" as never);
}
