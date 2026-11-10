import { z } from "zod";
import { ACTIVITY_TYPES, SOURCES, STATUSES } from "@/lib/constants";

const optText = z.string().trim().max(2000).optional().transform((v) => v || null);
const optUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Must start with http:// or https://");
const optDate = z
  .string()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Invalid date");
const optUuid = z.string().optional().transform((v) => v || null);
const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);

export const enquirySchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required").max(200),
  branch_name: optText,
  category_id: z.string().uuid("Select a category"),
  subcategory_id: z.string().uuid("Select a subcategory"),
  contact_person: optText,
  designation: optText,
  primary_phone: z
    .string()
    .trim()
    .min(1, "Primary phone is required")
    .regex(/^[+\d][\d\s()-]{5,}$/, "Enter a valid phone number"),
  alternative_phone: optText,
  whatsapp_number: optText,
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || z.string().email().safeParse(v).success, "Invalid email"),
  emirate: optText,
  area: optText,
  full_address: optText,
  maps_url: optUrl,
  website_url: optUrl,
  social_url: optUrl,
  business_description: optText,
  source: z.preprocess(emptyToUndef, z.enum(SOURCES).nullish()).transform((v) => v ?? null),
  status: z.preprocess(emptyToUndef, z.enum(STATUSES).default("new")),
  assigned_to: optUuid,
  interest_notes: optText,
  next_follow_up_at: optDate,
  enquiry_date: optDate,
});

export const followUpSchema = z.object({
  enquiry_id: z.string().uuid(),
  activity_type: z.enum(ACTIVITY_TYPES),
  activity_at: z.string().min(1, "Date is required"),
  outcome: optText,
  notes: optText,
  next_follow_up_at: optDate,
  status: z.preprocess(emptyToUndef, z.enum(STATUSES).optional()),
});

export function formToObject(fd: FormData) {
  const o: Record<string, string> = {};
  fd.forEach((v, k) => {
    if (typeof v === "string") o[k] = v;
  });
  return o;
}

export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) out[String(i.path[0])] ??= i.message;
  return out;
}
