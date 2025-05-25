import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define paths that require authentication
const protectedPaths = ["/dashboard", "/tasks", "/profile"];
// Define paths that are only accessible for non-authenticated users
const authPaths = ["/login"];

// Storage key for the access token (must match the one in constants.ts)
const ACCESS_TOKEN_KEY = "insider-access-token";

export function middleware(request: NextRequest) {
  // Disable middleware for now - let client-side handle auth
  // This prevents conflicts between server-side and client-side auth
  return NextResponse.next();

  /* Commenting out the middleware logic to avoid conflicts with client-side auth
  const { pathname } = request.nextUrl;

  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if the path is auth-only (like login page)
  const isAuthPath = authPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  // Get the authentication token from cookies
  // Note: This won't work with localStorage tokens used on the client side
  const authToken = request.cookies.get(ACCESS_TOKEN_KEY)?.value;

  // If the path is protected and the user is not authenticated, redirect to login
  if (isProtectedPath && !authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If the path is auth-only and the user is authenticated, redirect to dashboard
  if (isAuthPath && authToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Otherwise, continue with the request
  return NextResponse.next();
  */
}

// Configure the paths that should be checked by the middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
