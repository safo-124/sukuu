// File: middleware.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Helper to get JWT token on the server

// Ensure AUTH_SECRET is correctly set in your .env.local or Vercel environment variables
const JWT_SECRET = process.env.AUTH_SECRET;

export async function middleware(req) {
  const { pathname, origin, searchParams } = req.nextUrl;

  // Get the session token
  const token = await getToken({ req, secret: JWT_SECRET });
  const isAuthenticated = !!token;
  const userRole = token?.role; // Role from your JWT callback (e.g., SUPER_ADMIN, SCHOOL_ADMIN)

  // Construct the full callback URL to preserve query parameters
  const callbackUrlPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
  const encodedCallbackUrl = encodeURIComponent(callbackUrlPath);
  const signInUrl = `${origin}/auth/signin?callbackUrl=${encodedCallbackUrl}`;
  const unauthorizedUrl = `${origin}/unauthorized`; // Ensure you have an /unauthorized page

  // 1. Redirect authenticated users away from /auth/signin
  if (pathname.startsWith('/auth/signin') && isAuthenticated) {
    let redirectTarget = '/'; // Default redirect for authenticated users
    if (userRole === 'SUPER_ADMIN') {
      redirectTarget = '/superadmin/dashboard';
    } else if (userRole === 'SCHOOL_ADMIN') {
      redirectTarget = '/school-admin-portal'; // Or their specific school dashboard if logic exists
    }
    // Add other role-based redirects here:
    // else if (userRole === 'TEACHER') { redirectTarget = '/teacher-portal'; }
    // else if (userRole === 'PARENT') { redirectTarget = '/parent-portal'; }
    // else if (userRole === 'STUDENT') { redirectTarget = '/student-portal'; }
    return NextResponse.redirect(new URL(redirectTarget, origin));
  }

  // 2. Protect /superadmin routes
  if (pathname.startsWith('/superadmin')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(signInUrl);
    }
    if (userRole !== 'SUPER_ADMIN') {
      console.warn(`[Middleware] Unauthorized access attempt to Super Admin route ${pathname} by user role: ${userRole}`);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 3. Protect generic /school-admin-portal (if you have one that's not schoolId-specific)
  if (pathname.startsWith('/school-admin-portal')) {
    if (!isAuthenticated) {
      return NextResponse.redirect(signInUrl);
    }
    // Allow SUPER_ADMIN to also access for oversight/testing
    if (userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      console.warn(`[Middleware] Unauthorized access attempt to School Admin Portal ${pathname} by user role: ${userRole}`);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // 4. Protect school-specific dynamic routes (e.g., /<school_id>/schooladmin/*, /<school_id>/teacher/*)
  // This regex matches paths like: /some-cuid-or-slug/schooladmin/...
  // It captures the schoolId (group 1) and the portalType (group 2: schooladmin, teacher, parent, student)
  const schoolSpecificPortalRegex = /^\/([a-zA-Z0-9_-]+)\/(schooladmin|teacher|parent|student)(\/.*)?$/;
  const schoolSpecificMatch = pathname.match(schoolSpecificPortalRegex);

  if (schoolSpecificMatch) {
    // const schoolId = schoolSpecificMatch[1]; // Captured schoolId if needed for advanced checks (not used in this basic middleware)
    const portalType = schoolSpecificMatch[2];

    if (!isAuthenticated) {
      return NextResponse.redirect(signInUrl);
    }

    // Basic role checks for these portals.
    // Granular access (e.g., "is this user a SCHOOL_ADMIN of *this specific schoolId*?")
    // should be handled at the page or API level due to the complexity of DB lookups in middleware.
    let authorized = false;
    switch (portalType) {
      case 'schooladmin':
        if (userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN') {
          authorized = true;
        }
        break;
      case 'teacher':
        if (userRole === 'TEACHER' || userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN') {
          authorized = true;
        }
        break;
      case 'parent':
        // Parents should usually only access their own children's data,
        // but other roles might need a generalized view. This is a broad check.
        if (userRole === 'PARENT' || userRole === 'TEACHER' || userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN') {
          authorized = true;
        }
        break;
      case 'student':
        if (userRole === 'STUDENT' || userRole === 'PARENT' || userRole === 'TEACHER' || userRole === 'SCHOOL_ADMIN' || userRole === 'SUPER_ADMIN') {
          authorized = true;
        }
        break;
      default:
        authorized = false; // Unknown portal type
    }

    if (!authorized) {
      console.warn(`[Middleware] Unauthorized access attempt to ${portalType} portal at ${pathname} by user role: ${userRole}`);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // If no specific protection rule matched, allow the request to proceed
  return NextResponse.next();
}

// Middleware Matcher: Define which paths this middleware should run on.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes often have their own internal auth checks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any other top-level public asset folders (e.g., /images/, /fonts/)
     * - Public files by extension (e.g. .png, .svg)
     */
    '/((?!api|_next/static|_next/image|.*\\..*|_next/webpack-hmr|favicon.ico|images|fonts|logo.svg|site.webmanifest).*)',
  ],
};