// File: app/(portals)/superadmin/page.jsx
import { redirect } from 'next/navigation';

// This page will simply redirect to the main super admin dashboard.
// Middleware should already protect this /superadmin route,
// ensuring only authenticated SUPER_ADMIN users can reach this point.
export default function SuperAdminRootPage() {
  redirect('/superadmin/dashboard');
  
  // Although redirect should prevent rendering, Next.js might require a return value.
  // Returning null or a minimal loading state is fine here.
  // return null; 
}