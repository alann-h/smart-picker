"use client";

import { useState } from "react";

import { api } from "~/trpc/react";

export function LatestPost() {
  const [connectionTest] = api.post.testConnection.useSuspenseQuery();

  return (
    <div className="w-full max-w-xs">
      <div className="rounded-xl bg-white/10 p-4">
        <h3 className="text-lg font-bold mb-2">Database Status</h3>
        <p className="text-sm">{connectionTest.message}</p>
        <p className="text-sm mt-1">Companies in database: {connectionTest.companyCount}</p>
      </div>
    </div>
  );
}
