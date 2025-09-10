"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success') === 'true';
    const provider = searchParams.get('provider');
    const error = searchParams.get('error');

    if (success) {
      // OAuth was successful, redirect to dashboard
      router.push('/dashboard');
    } else {
      // OAuth failed, redirect to login with error
      const loginUrl = new URL('/login', window.location.origin);
      if (error) {
        loginUrl.searchParams.set('error', error);
      }
      router.push(loginUrl.pathname + loginUrl.search);
    }
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing OAuth callback...</p>
      </div>
    </div>
  );
}
