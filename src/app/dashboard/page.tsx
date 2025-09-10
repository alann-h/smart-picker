"use client";

import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const { data: userStatus, isLoading } = api.auth.getUserStatus.useQuery();
  const logoutMutation = api.auth.logout.useMutation();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!userStatus) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome back, {userStatus.name}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Authentication System Working! 🎉
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Name:</strong> {userStatus.name}</p>
                <p><strong>Email:</strong> {userStatus.email}</p>
                <p><strong>Company:</strong> {userStatus.companyName ?? "No company"}</p>
                <p><strong>Admin:</strong> {userStatus.isAdmin ? "Yes" : "No"}</p>
                <p><strong>Company ID:</strong> {userStatus.companyId}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
