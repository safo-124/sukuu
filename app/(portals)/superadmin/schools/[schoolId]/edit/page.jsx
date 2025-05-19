// File: app/(portals)/superadmin/schools/[schoolId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation"; // For handling not found cases
import { ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import SchoolForm from "@/components/superadmin/SchoolForm"; // Adjust path
import { Button } from "@/components/ui/button";

// Function to fetch school data by ID (Server-side)
async function getSchoolById(schoolId, superAdminUserId) {
  try {
    const school = await prisma.school.findUnique({
      where: {
        id: schoolId,
      },
    });

    if (!school) {
      return null;
    }

    // Optional: Security check - ensure only the creating SuperAdmin or any SuperAdmin can edit.
    // For this iteration, we assume any logged-in SuperAdmin can edit any school.
    // If you want to restrict it to the creator:
    // const userWithSuperAdminProfile = await prisma.user.findUnique({
    //   where: { id: superAdminUserId },
    //   include: { superAdmin: true },
    // });
    // if (school.createdBySuperAdminId !== userWithSuperAdminProfile?.superAdmin?.id) {
    //   console.warn(`Attempt to edit school ${schoolId} by unauthorized SuperAdmin ${superAdminUserId}`);
    //   return null; // Or throw an error / redirect to unauthorized
    // }
    
    // Convert Date objects to string format if your form expects strings,
    // though react-hook-form often handles Date objects fine with HTML5 date inputs.
    // Prisma returns Date objects for DateTime fields.
    // For our current form, Prisma's Date objects are fine for defaultValues.
    // Ensure decimal fields are numbers or strings as expected by the form/validation.
    // (Our schema doesn't have decimal fields for School directly, but FeeStructure does)


    return school;
  } catch (error) {
    console.error("Failed to fetch school for editing:", error);
    return null;
  }
}

// Dynamic metadata for the page
export async function generateMetadata({ params }) {
  const session = await getServerSession(authOptions);
   if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    return { title: "Access Denied" }; // Should be caught by middleware
  }
  const school = await getSchoolById(params.schoolId, session.user.id);
  if (!school) {
    return { title: "School Not Found" };
  }
  return {
    title: `Edit School: ${school.name} | Super Admin - Sukuu`,
    description: `Update details for ${school.name}.`,
  };
}


export default async function EditSchoolPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  // This check is mostly redundant due to middleware but good for direct access attempts
  if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
    redirect(`/auth/signin?callbackUrl=/superadmin/schools/${schoolId}/edit`);
  }

  const school = await getSchoolById(schoolId, session.user.id);

  if (!school) {
    notFound(); // Triggers the not-found UI (e.g., app/not-found.js)
  }

  // The SchoolForm expects `currentTerm` to be `undefined` if null for placeholder logic
  // and optional text fields to be "" if null for controlled input behavior.
  const initialFormData = {
    ...school,
    currentTerm: school.currentTerm || undefined,
    phoneNumber: school.phoneNumber || "",
    address: school.address || "",
    city: school.city || "",
    stateOrRegion: school.stateOrRegion || "",
    country: school.country || "",
    postalCode: school.postalCode || "",
    website: school.website || "",
    logoUrl: school.logoUrl || "",
    // isActive is already a boolean in the DB, so it's fine
  };


  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href="/superadmin/schools" passHref>
            <Button variant="outline" size="sm" className="mb-2 sm:mb-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Schools List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Edit School: <span className="text-primary">{school.name}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Modify the details for this institution.
          </p>
        </div>
      </div>

      {/* School Form Component in Edit Mode */}
      {/* The `school` prop pre-fills the form */}
      <SchoolForm school={initialFormData} />
    </div>
  );
}