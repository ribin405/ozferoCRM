import EnquiryForm from "@/components/EnquiryForm";
import { requireUser } from "@/lib/auth";
import { loadFormOptions } from "@/lib/queries";

export default async function NewEnquiry() {
  const { supabase, profile } = await requireUser();
  const { categories, members } = await loadFormOptions(supabase);
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="text-2xl font-semibold">Add vendor enquiry</h1>
      <EnquiryForm id={null} categories={categories} members={members} currentUserId={profile.id} />
    </div>
  );
}
