// File: app/(portals)/superadmin/schools/page.jsx
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react"; // Added Search for potential future use
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import SchoolsDataTable from "@/components/superadmin/SchoolsDataTable"; // We will create this next
import { Input } from "@/components/ui/input"; // For future search functionality

export const metadata = {
  title: "Manage Schools | Super Admin - Sukuu",
  description: "View, search, and manage all registered schools.",
};

// This function fetches data on the server
async function getSchoolsForSuperAdmin(superAdminProfileId) {
  if (!superAdminProfileId) return [];
  try {
    const schools = await prisma.school.findMany({
      where: {
        createdBySuperAdminId: superAdminProfileId,
      },
      orderBy: {
        createdAt: 'desc', // Show newest schools first
      },
      // You can include more data if needed for the table, e.g., counts of students/teachers
      // include: {
      //   _count: {
      //     select: { students: true, teachers: true },
      //   },
      // }
    });
    return schools;
  } catch (error) {
    console.error("Failed to fetch schools:", error);
    return []; // Return empty array on error
  }
}

export default async function ManageSchoolsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    // This should ideally be caught by middleware, but good to have a fallback
    // Or redirect them: import { redirect } from 'next/navigation'; redirect('/auth/signin');
    return <p className="text-destructive p-4">Access Denied. You must be a Super Admin.</p>;
  }

  // Fetch the SuperAdmin profile ID linked to the User ID
  const userWithSuperAdminProfile = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { superAdmin: true }, // Include the SuperAdmin relation
  });

  const superAdminProfileId = userWithSuperAdminProfile?.superAdmin?.id;
  
  let schools = [];
  if (superAdminProfileId) {
    schools = await getSchoolsForSuperAdmin(superAdminProfileId);
  } else {
    console.warn("Super Admin profile not found for user:", session.user.email);
    // Handle case where super admin profile might not be linked, though it should be by seed script
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
            Oversee all registered educational institutions on the platform.
          </p>
        </div>
        <Link href="/superadmin/schools/new" passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Register New School
          </Button>
        </Link>
      </div>

      {/* Search and Filters - Placeholder for future */}
      {/* <div className="flex items-center gap-2 py-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search schools by name, email, or city..."
            className="pl-8 w-full md:w-1/2 lg:w-1/3"
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div> */}

      {/* Schools Data Table */}
      {/* We pass the fetched schools data to a Client Component for rendering the interactive table */}
      <SchoolsDataTable schools={schools} />
    </div>
  );
}