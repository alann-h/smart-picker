"use client";

import { useState } from "react";

export default function ApiTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const testEndpoint = async (endpoint: string, method: string = "GET") => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/trpc/${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      setTestResults(prev => [...prev, {
        endpoint,
        method,
        status: response.status,
        success: response.ok,
        data: data,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        endpoint,
        method,
        status: 'Error',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
    setIsLoading(false);
  };

  const clearResults = () => setTestResults([]);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">tRPC API Endpoint Tester</h1>
      
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Endpoints</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => testEndpoint("product.getAll")}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Test product.getAll
          </button>
          <button
            onClick={() => testEndpoint("product.getCategories")}
            disabled={isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Test product.getCategories
          </button>
          <button
            onClick={() => testEndpoint("quote.getAll")}
            disabled={isLoading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Test quote.getAll
          </button>
          <button
            onClick={() => testEndpoint("quote.getReadyForPicking")}
            disabled={isLoading}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
          >
            Test quote.getReadyForPicking
          </button>
          <button
            onClick={clearResults}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Results
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <p>Testing endpoint...</p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        {testResults.length === 0 ? (
          <p className="text-gray-500">No tests run yet. Click a button above to test an endpoint.</p>
        ) : (
          testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded border ${
                result.success
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">
                  {result.method} {result.endpoint}
                </h3>
                <span className="text-sm text-gray-500">{result.timestamp}</span>
              </div>
              <div className="text-sm">
                <p><strong>Status:</strong> {result.status}</p>
                {result.success ? (
                  <div>
                    <p><strong>Response:</strong></p>
                    <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p><strong>Error:</strong> {result.error}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
