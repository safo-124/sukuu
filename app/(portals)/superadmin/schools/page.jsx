// File: app/(portals)/superadmin/schools/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, Search, AlertTriangle } from "lucide-react"; // Standard icons for this page
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import SchoolsDataTable from "@/components/superadmin/SchoolsDataTable";
import { Input } from "@/components/ui/input"; // For potential future search
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // For error/empty states

export const metadata = {
  title: "Manage Schools | Super Admin - Sukuu",
  description: "View, search, and manage all registered schools on the Sukuu platform.",
};

// Server-side function to fetch schools for the logged-in Super Admin
async function getSchoolsForCurrentSuperAdmin(userId) {
  if (!userId) {
    console.error("[getSchoolsForCurrentSuperAdmin] Error: userId not provided.");
    return { error: "User ID not provided.", schools: [] };
  }

  try {
    // First, get the SuperAdmin profile ID linked to the User ID
    const userWithSuperAdminProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        superAdmin: { // Only select the superAdmin relation
          select: { id: true } // And from superAdmin, only select its id
        }
      }
    });

    if (!userWithSuperAdminProfile?.superAdmin?.id) {
      console.error(`[getSchoolsForCurrentSuperAdmin] Error: SuperAdmin profile not found for user ID: ${userId}`);
      return { error: "SuperAdmin profile not found.", schools: [] };
    }

    const superAdminProfileId = userWithSuperAdminProfile.superAdmin.id;

    const schools = await prisma.school.findMany({
      where: {
        createdBySuperAdminId: superAdminProfileId,
      },
      orderBy: {
        createdAt: 'desc', // Show newest schools first
      },
      // Select specific fields to avoid over-fetching if not needed by SchoolsDataTable
      // If SchoolsDataTable needs more, add them here.
      select: {
        id: true,
        name: true,
        schoolEmail: true,
        city: true,
        country: true,
        currentAcademicYear: true,
        isActive: true,
        createdAt: true,
        // Add any other fields that SchoolsDataTable explicitly uses
      }
    });
    return { error: null, schools };
  } catch (error) {
    console.error("[getSchoolsForCurrentSuperAdmin] Failed to fetch schools:", error);
    // Log the full error for server-side debugging
    // In a production environment, you might want more sophisticated error reporting
    return { error: "Failed to retrieve schools due to a server error.", schools: [] };
  }
}

export default async function ManageSchoolsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    // Middleware should ideally catch this, but this is a safeguard.
    redirect(`/auth/signin?callbackUrl=/superadmin/schools`);
  }

  const { error, schools } = await getSchoolsForCurrentSuperAdmin(session.user.id);

  if (error && schools.length === 0) { // If there was an error and no schools were fetched
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Manage Schools</h1>
            <p className="text-lg text-muted-foreground mt-1">Error loading school data.</p>
          </div>
          <Link href="/superadmin/schools/new" passHref>
            <Button size="lg" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" />
              Register New School
            </Button>
          </Link>
        </div>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Failed to Load Schools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/90">
              There was an issue retrieving the list of schools: {error}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please try again later or contact support if the issue persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Manage Schools
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Oversee all registered educational institutions you have created.
          </p>
        </div>
        <Link href="/superadmin/schools/new" passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Register New School
          </Button>
        </Link>
      </div>

      {/* Placeholder for Search and Filters - can be implemented later */}
      {/* <div className="flex items-center gap-2 py-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search schools by name, email, or city..."
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            // Add onChange and value for controlled component if implementing search
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div> 
      */}

      {/* Schools Data Table */}
      {/* The `schools` prop will be an empty array if none are found or if an error occurred but was handled gracefully */}
      <SchoolsDataTable schools={schools} />
    </div>
  );
}