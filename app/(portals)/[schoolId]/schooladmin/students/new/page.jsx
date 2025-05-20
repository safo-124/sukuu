// File: app/(portals)/[schoolId]/schooladmin/students/new/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserPlus } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import StudentForm from "@/components/schooladmin/StudentForm"; // Adjust path
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card"; // Form is already in a Card, so this is optional wrapper

// Function to fetch school details and classes for the form
async function getPageData(schoolId, userId) {
  try {
    // Authorize: Check if user is SCHOOL_ADMIN for this school OR SUPER_ADMIN
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
        where: { userId: userId, schoolId: schoolId }
    });
     const session = await getServerSession(authOptions); // Re-fetch session for role if needed, or pass from page

    if (session.user.role !== 'SUPER_ADMIN' && !schoolAdminAssignment) {
        console.warn(`User ${userId} is not authorized for school ${schoolId} to add students.`);
        return { school: null, classes: [] , error: "Forbidden" };
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true } // Select only what's needed
    });

    if (!school) return { school: null, classes: [] };

    const classes = await prisma.class.findMany({
      where: { schoolId: schoolId, academicYear: school.currentAcademicYear || undefined }, // Fetch for current academic year
      select: { id: true, name: true, section: true },
      orderBy: { name: 'asc' }
    });
    return { school, classes, error: null };
  } catch (error) {
    console.error("Failed to fetch data for new student page:", error);
    return { school: null, classes: [], error: "Data fetch error" };
  }
}

export async function generateMetadata({ params }) {
  const school = await prisma.school.findUnique({ where: { id: params.schoolId }, select: { name: true }});
  if (!school) return { title: "Add Student | Sukuu" };
  return {
    title: `Add New Student - ${school.name} | Sukuu`,
    description: `Enroll a new student in ${school.name}.`,
  };
}

export default async function AddNewStudentPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/students/new`);
  }

  const { school, classes, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") {
    redirect("/unauthorized?message=You are not authorized to add students to this school.");
  }
  if (!school) {
    notFound(); // If school itself not found
  }
  
  if (error && !school) { // If general data fetch error
     return <div className="p-6 text-destructive">Error loading data for this page. Please try again. {error}</div>
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/students`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Students List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <UserPlus className="h-8 w-8 text-primary" />
            Enroll New Student
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{school.name}</span>
          </p>
        </div>
      </div>
      
      {/* StudentForm is already wrapped in a Card in its own definition */}
      <StudentForm schoolId={schoolId} classes={classes || []} />
    </div>
  );
}