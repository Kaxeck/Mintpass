import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Simple check for Privy Auth token in cookies
  const privyToken = request.cookies.get('privy-token')?.value;

  // Protect the dashboard and creation routes
  const protectedRoutes = ['/dashboard', '/create', '/merchant'];
  const isProtected = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  if (isProtected && !privyToken) {
    // Redirect to login (or home if login is a modal)
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
