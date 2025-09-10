import { NextRequest, NextResponse } from "next/server";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

export async function GET(request: NextRequest) {
  try {
    const url = request.url;
    const ctx = await createTRPCContext({ headers: request.headers });
    const caller = createCaller(ctx);

    // Handle the OAuth callback
    const result = await caller.oauth.handleCallback({
      url,
      connectionType: 'xero',
    });

    // Redirect to frontend callback handler
    const frontendCallbackUrl = new URL('/oauth/callback', request.url);
    frontendCallbackUrl.searchParams.set('success', 'true');
    frontendCallbackUrl.searchParams.set('provider', 'xero');
    
    return NextResponse.redirect(frontendCallbackUrl);
  } catch (error: any) {
    console.error('Xero callback error:', error);
    
    // Redirect to frontend with error
    const frontendCallbackUrl = new URL('/oauth/callback', request.url);
    frontendCallbackUrl.searchParams.set('success', 'false');
    frontendCallbackUrl.searchParams.set('error', error.message);
    frontendCallbackUrl.searchParams.set('provider', 'xero');
    
    return NextResponse.redirect(frontendCallbackUrl);
  }
}
