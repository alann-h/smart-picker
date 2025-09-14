"use client";

import { api } from "~/trpc/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type TokenData, type OAuthUserInfo } from "~/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { data: userStatus, isLoading } = api.auth.getUserStatus.useQuery(undefined, {
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = api.auth.logout.useMutation({
    onSuccess: () => {
      router.push("/login");
    },
  });

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [remoteUserInfo, setRemoteUserInfo] = useState<OAuthUserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getTokenMutation = api.oauth.getToken.useMutation({
    onSuccess: (data) => {
      setTokenData(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setTokenData(null);
    }
  });

  const refreshTokenMutation = api.oauth.refreshToken.useMutation({
    onSuccess: (data) => {
      setTokenData(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setTokenData(null);
    }
  });
  
  const getRemoteUserInfoMutation = api.oauth.getRemoteUserInfo.useMutation({
    onSuccess: (data) => {
      setRemoteUserInfo(data);
      setError(null);
    },
    onError: (error) => {
      setError(error.message);
      setRemoteUserInfo(null);
    }
  });

  const disconnectMutation = api.oauth.disconnect.useMutation({
    onSuccess: () => {
      setTokenData(null);
      setRemoteUserInfo(null);
      setError("Successfully disconnected.");
    },
    onError: (error) => {
      setError(error.message);
    }
  });

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
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
        <div className="px-4 py-6 sm:px-0 space-y-8">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Authentication System Working! 🎉
              </h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Name:</strong> {userStatus.name}</p>
                <p><strong>Email:</strong> {userStatus.email}</p>
                <p><strong>Company:</strong> {userStatus.companyName ?? "No company"}</p>
                <p><strong>Connection:</strong> {userStatus.connectionType}</p>
                <p><strong>Admin:</strong> {userStatus.isAdmin ? "Yes" : "No"}</p>
                <p><strong>Company ID:</strong> {userStatus.companyId}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">OAuth Testing</h3>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => getTokenMutation.mutate()} disabled={getTokenMutation.isPending || !userStatus.connectionType || userStatus.connectionType === 'none'} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                  {getTokenMutation.isPending ? 'Loading...' : 'Get Token'}
                </button>
                <button onClick={() => refreshTokenMutation.mutate()} disabled={refreshTokenMutation.isPending || !userStatus.connectionType || userStatus.connectionType === 'none'} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50">
                  {refreshTokenMutation.isPending ? 'Loading...' : 'Refresh Token'}
                </button>
                <button onClick={() => getRemoteUserInfoMutation.mutate()} disabled={getRemoteUserInfoMutation.isPending || !userStatus.connectionType || userStatus.connectionType === 'none'} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
                  {getRemoteUserInfoMutation.isPending ? 'Loading...' : 'Get Remote User Info'}
                </button>
                <button onClick={() => {
                  if (userStatus.connectionType === 'qbo' || userStatus.connectionType === 'xero') {
                    disconnectMutation.mutate({ connectionType: userStatus.connectionType });
                  }
                }} disabled={disconnectMutation.isPending || !userStatus.connectionType || userStatus.connectionType === 'none'} className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50">
                  {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
              
              {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
              
              <div className="mt-6 space-y-4">
                {tokenData && (
                  <div>
                    <h4 className="font-medium text-gray-800">Token Data:</h4>
                    <pre className="mt-1 text-sm text-gray-900 bg-gray-100 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(tokenData, null, 2)}
                    </pre>
                  </div>
                )}
                {remoteUserInfo && (
                  <div>
                    <h4 className="font-medium text-gray-800">Remote User Info:</h4>
                    <pre className="mt-1 text-sm text-gray-900 bg-gray-100 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(remoteUserInfo, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
