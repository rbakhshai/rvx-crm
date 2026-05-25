import { z } from "zod";
import { emptyToUndefined, optionalText, checkboxBool, parseForm } from "./shared";

export const companyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationshipToPark: z.enum(["realtor", "owner", "owner_realtor"], {
    errorMap: () => ({ message: "Pick a relationship" }),
  }),
  sellerFirstName: optionalText,
  sellerLastName: optionalText,

  email: emptyToUndefined.pipe(z.string().email("Invalid email").optional()),
  phone: optionalText,
  officePhone: optionalText,

  address: optionalText,
  city: optionalText,
  state: optionalText,
  zipcode: optionalText,

  facebookPage: optionalText,
  instagramName: optionalText,

  description: optionalText,
  annualRevenue: optionalText,
  employeeCount: optionalText,

  bulkEmailOptedOut: checkboxBool,
});

export type CompanyFormValues = z.infer<typeof companyFormSchema>;

export function parseCompanyForm(fd: FormData): unknown {
  return parseForm(fd);
}
