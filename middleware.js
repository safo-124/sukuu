// File: middleware.js
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req) {
  const { pathname, origin, searchParams } = req.nextUrl;

  // Get the session token using the JWT strategy
  // Ensure AUTH_SECRET is correctly set in your .env.local
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  const isAuthenticated = !!token;
  const userRole = token?.role;

  // --- Define protected path prefixes and their required roles ---
  const protectedRoutes = {
    '/superadmin': ['SUPER_ADMIN'],
    // For dynamic paths, we'll use startsWith and then can refine access at page/API level
    // For example, /:schoolId/schooladmin will be caught by '/schooladmin' if structured like that,
    // or we can use more specific matching.
    // Let's assume your portal paths are like:
    // /superadmin/...
    // /portal/[schoolId]/schooladmin/...
    // /portal/[schoolId]/teacher/...
    // /portal/[schoolId]/parent/...
    // If so, we can check for these prefixes.

    // If your school-specific portals are directly under /:schoolId/, e.g., /school-xyz/admin
    // that requires more complex matching.
    // For the structure app/(portals)/[schoolId]/schooladmin, the URL will be /SCHOOL_ID_VALUE/schooladmin
    // We can use a regex for that or a general check.
  };

  // --- Prevent authenticated users from accessing /auth/signin ---
  if (pathname.startsWith('/auth/signin') && isAuthenticated) {
    // Redirect to a default page based on role if already logged in
    if (userRole === 'SUPER_ADMIN') {
      return NextResponse.redirect(`${origin}/superadmin/dashboard`);
    }
    // Add other role-based redirects here if needed
    return NextResponse.redirect(`${origin}/`); // Default redirect for other authenticated users
  }


  // --- Super Admin Route Protection ---
  if (pathname.startsWith('/superadmin')) {
    if (!isAuthenticated) {
      const callbackUrl = `${origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return NextResponse.redirect(`${origin}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    if (userRole !== 'SUPER_ADMIN') {
      console.warn(`[Middleware] Unauthorized access attempt to ${pathname} by user with role ${userRole}`);
      return NextResponse.redirect(`${origin}/unauthorized`); // Or your custom unauthorized page
    }
  }

  // --- School-Specific Portal Protection (Example Structure: /[schoolId]/<role_portal>) ---
  // This regex matches paths like /any-school-id-string/schooladmin/...
  const schoolSpecificPortalRegex = /^\/([a-zA-Z0-9_-]+)\/(schooladmin|teacher|parent|student)/;
  const schoolSpecificMatch = pathname.match(schoolSpecificPortalRegex);

  if (schoolSpecificMatch) {
    const portalType = schoolSpecificMatch[2]; // schooladmin, teacher, parent, student

    if (!isAuthenticated) {
      const callbackUrl = `${origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      return NextResponse.redirect(`${origin}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }

    // At this point, the user is authenticated. Now check roles.
    // More granular checks (e.g., if SchoolAdmin belongs to *this* schoolId)
    // are typically done at the page/API level due to middleware's limitations in accessing DB easily.

    if (portalType === 'schooladmin') {
      if (userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') { // SuperAdmins might access school admin portals
        console.warn(`[Middleware] Unauthorized access attempt to ${pathname} by user with role ${userRole}`);
        return NextResponse.redirect(`${origin}/unauthorized`);
      }
    } else if (portalType === 'teacher') {
      if (userRole !== 'TEACHER' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
        console.warn(`[Middleware] Unauthorized access attempt to ${pathname} by user with role ${userRole}`);
        return NextResponse.redirect(`${origin}/unauthorized`);
      }
    } else if (portalType === 'parent') {
      if (userRole !== 'PARENT' && userRole !== 'TEACHER' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') { // Other roles might need parent view for specific contexts
        console.warn(`[Middleware] Unauthorized access attempt to ${pathname} by user with role ${userRole}`);
        return NextResponse.redirect(`${origin}/unauthorized`);
      }
    } else if (portalType === 'student') {
        if (userRole !== 'STUDENT' && userRole !== 'PARENT' && userRole !== 'TEACHER' && userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
            console.warn(`[Middleware] Unauthorized access attempt to ${pathname} by user with role ${userRole}`);
            return NextResponse.redirect(`${origin}/unauthorized`);
        }
    }
    // If the role is allowed for the general portal type, allow access.
    // Specific data access control (e.g. this teacher for this school) is for page/API.
  }


  // If no protection rules matched, allow the request to proceed
  return NextResponse.next();
}

// Middleware Matcher: Define which paths this middleware should run on.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes, these should have their own auth checks)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images or any other public assets folder
     * - public (if you have other assets directly in public)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images|public|logo.svg).*)',
  ],
};