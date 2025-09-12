"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

// A simple component to render JSON data in a formatted way
const JsonViewer = ({ data, title }: { data: any; title: string }) => {
  if (!data) return null;
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

export default function OauthTestPage() {
  const [results, setResults] = useState<any>(null);

  // tRPC Hooks
  const userStatus = api.auth.getUserStatus.useQuery();
  const qboAuthUri = api.oauth.getQBOAuthUri.useQuery({});
  const xeroAuthUri = api.oauth.getXeroAuthUri.useQuery({});
  const currentToken = api.oauth.getToken.useQuery(undefined, { enabled: !!userStatus.data });

  const refreshTokenMutation = api.oauth.refreshToken.useMutation({
    onSuccess: (data) => {
      setResults({ title: "Refreshed Token", data });
      currentToken.refetch(); // Refetch the token to show the updated version
    },
    onError: (error) => {
      setResults({ title: "Refresh Token Error", data: error });
    }
  });

  const remoteUserInfo = api.oauth.getRemoteUserInfo.useQuery(undefined, { 
    enabled: false // Only run when we click the button
  });

  const disconnectQboMutation = api.oauth.disconnect.useMutation({
    onSuccess: () => {
      setResults({ title: "QBO Disconnected", data: { success: true } });
      userStatus.refetch();
      currentToken.refetch();
    },
    onError: (error) => {
      setResults({ title: "QBO Disconnect Error", data: error });
    }
  });
  
  const disconnectXeroMutation = api.oauth.disconnect.useMutation({
    onSuccess: () => {
      setResults({ title: "Xero Disconnected", data: { success: true } });
      userStatus.refetch();
      currentToken.refetch();
    },
    onError: (error) => {
      setResults({ title: "Xero Disconnect Error", data: error });
    }
  });

  const handleGetRemoteUserInfo = () => {
    remoteUserInfo.refetch().then(result => {
        setResults({ title: "Remote User Info", data: result.data });
    });
  }

  const isLoading = userStatus.isLoading || qboAuthUri.isLoading || xeroAuthUri.isLoading || currentToken.isLoading;

  return (
    <div className="container mx-auto p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8">OAuth Functionality Tester</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Actions */}
        <div>
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">Actions</h2>
          <div className="flex flex-col space-y-4">
            {!userStatus.data ? (
              <div className="p-4 bg-yellow-100 rounded">
                Please log in to test OAuth functionality.
              </div>
            ) : (
              <>
                {userStatus.data.connectionType === 'none' && (
                    <>
                        <a href={qboAuthUri.data?.authUri} className="bg-blue-500 text-white text-center px-4 py-2 rounded hover:bg-blue-600">
                        Connect to QuickBooks
                        </a>
                        <a href={xeroAuthUri.data?.authUri} className="bg-cyan-500 text-white text-center px-4 py-2 rounded hover:bg-cyan-600">
                        Connect to Xero
                        </a>
                    </>
                )}
                
                <button
                  onClick={() => refreshTokenMutation.mutate()}
                  disabled={refreshTokenMutation.isPending || userStatus.data.connectionType === 'none'}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
                >
                  {refreshTokenMutation.isPending ? "Refreshing..." : "Refresh Token"}
                </button>

                <button
                  onClick={handleGetRemoteUserInfo}
                  disabled={remoteUserInfo.isFetching || userStatus.data.connectionType === 'none'}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  {remoteUserInfo.isFetching ? "Fetching..." : "Get Remote User Info"}
                </button>

                {userStatus.data.connectionType === 'qbo' && (
                  <button
                    onClick={() => disconnectQboMutation.mutate({ connectionType: 'qbo' })}
                    disabled={disconnectQboMutation.isPending}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {disconnectQboMutation.isPending ? "Disconnecting..." : "Disconnect from QBO"}
                  </button>
                )}

                {userStatus.data.connectionType === 'xero' && (
                  <button
                    onClick={() => disconnectXeroMutation.mutate({ connectionType: 'xero' })}
                    disabled={disconnectXeroMutation.isPending}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
                  >
                    {disconnectXeroMutation.isPending ? "Disconnecting..." : "Disconnect from Xero"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Data Display */}
        <div>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Live Data</h2>
            {isLoading && <p>Loading data...</p>}
            
            <JsonViewer data={userStatus.data} title="User Status" />
            <JsonViewer data={currentToken.data} title="Current Token" />

            {/* This will show results from mutations or manual queries */}
            <JsonViewer data={results?.data} title={results?.title} />
        </div>
      </div>
    </div>
  );
}
