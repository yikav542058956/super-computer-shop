import { AdminLayout } from "@/components/layout/AdminLayout";

export default function AdminReviews() {
  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
      </div>
      <div className="bg-white p-12 text-center rounded-xl border shadow-sm text-slate-500">
        Review management coming soon
      </div>
    </AdminLayout>
  );
}