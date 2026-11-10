import { notFound } from "next/navigation";
import EnquiryForm from "@/components/EnquiryForm";
import { requireUser } from "@/lib/auth";
import { loadFormOptions, todayUAE, uaeDate } from "@/lib/queries";

export default async function EditEnquiry({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireUser();
  const { data } = await supabase.from("vendor_enquiries").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const { categories, members } = await loadFormOptions(supabase);
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Edit {data.business_name}</h1>
      <EnquiryForm id={id} categories={categories} members={members} values={data} currentUserId={profile.id} enquiryDate={uaeDate(data.created_at)} today={todayUAE()} />
    </div>
  );
}
