"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { enquirySchema, fieldErrors, followUpSchema, formToObject } from "@/lib/schemas";

export type FormState = { errors?: Record<string, string>; message?: string } | undefined;

export async function saveEnquiry(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  const parsed = enquirySchema.safeParse(formToObject(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("vendor_enquiries").update(parsed.data).eq("id", id);
    if (error) return { message: error.message };
  } else {
    const { data, error } = await supabase
      .from("vendor_enquiries")
      .insert({ ...parsed.data, created_by: profile.id })
      .select("id")
      .single();
    if (error) return { message: error.message };
    savedId = data.id;
  }
  revalidatePath("/", "layout");
  redirect(`/enquiries/${savedId}`);
}

export async function checkDuplicates(name: string, phone: string, excludeId: string | null) {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("find_duplicate_enquiries", {
    p_name: name,
    p_phone: phone,
    p_exclude: excludeId,
  });
  return (data ?? []) as {
    id: string;
    enquiry_code: string;
    business_name: string;
    branch_name: string | null;
    area: string | null;
    primary_phone: string;
    status: string;
    assigned_name: string | null;
    match_type: "phone" | "name";
  }[];
}

export async function addFollowUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, profile } = await requireUser();
  const parsed = followUpSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { status, ...fu } = parsed.data;

  const { error } = await supabase
    .from("follow_ups")
    .insert({ ...fu, activity_at: new Date(fu.activity_at).toISOString(), created_by: profile.id });
  if (error) return { message: error.message };

  // Keep the enquiry in sync: status and next follow-up date reflect the latest activity.
  const patch: Record<string, unknown> = { next_follow_up_at: fu.next_follow_up_at };
  if (status) patch.status = status;
  const { error: e2 } = await supabase.from("vendor_enquiries").update(patch).eq("id", fu.enquiry_id);
  if (e2) return { message: e2.message };

  revalidatePath("/", "layout");
  return { message: "Follow-up saved." };
}

/** Admin-only. Follow-ups are removed with the enquiry (ON DELETE CASCADE). */
export async function deleteEnquiry(id: string, redirectTo?: string): Promise<{ error?: string }> {
  const { supabase } = await requireAdmin();
  // select() so a delete blocked by row-level security is reported instead of looking like success.
  const { data, error } = await supabase.from("vendor_enquiries").delete().eq("id", id).select("id");
  if (error) return { error: error.message };
  if (!data?.length) return { error: "Nothing was deleted. The enquiry may already be gone, or the database refused the request." };
  revalidatePath("/", "layout");
  if (redirectTo) redirect(redirectTo);
  return {};
}
