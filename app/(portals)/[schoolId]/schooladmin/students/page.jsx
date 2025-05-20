// File: app/(portals)/[schoolId]/schooladmin/students/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, UsersRound, Search, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import StudentsDataTable from "@/components/schooladmin/StudentsDataTable"; // We will create this next
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({ params }) {
  try {
    const school = await prisma.school.findUnique({ 
      where: { id: params.schoolId }, 
      select: { name: true } 
    });
    if (!school) return { title: "Manage Students | Sukuu" };
    return {
      title: `Manage Students - ${school.name} | Sukuu`,
      description: `View, search, and manage all students in ${school.name}.`,
    };
  } catch (error) {
    console.error("Error generating metadata for Manage Students:", error);
    return { title: "Manage Students | Sukuu" };
  }
}

async function getStudentsForSchool(schoolId, userId) {
  // First, verify the logged-in user is an admin for this specific school
  const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId },
      include: { school: { select: { name: true } } } // Also get school name for context
  });

  if (!schoolAdminAssignment && session?.user?.role !== "SUPER_ADMIN") { // Allow SuperAdmin to see any for now
      console.warn(`User ${userId} is not an authorized admin for school ${schoolId} to view students.`);
      return { error: "Unauthorized to view students for this school.", students: [], schoolName: null };
  }
  
  const schoolName = schoolAdminAssignment?.school?.name || (await prisma.school.findUnique({where: {id: schoolId}, select: {name: true}}))?.name || "Selected School";


  try {
    const students = await prisma.student.findMany({
      where: {
        schoolId: schoolId,
      },
      include: { // Include data needed for the table
        currentClass: {
          select: { name: true, section: true },
        },
        // user: { // If student is linked to a user account for login
        //   select: { isActive: true }
        // }
      },
      orderBy: [
        { currentClass: { name: 'asc' } }, // Primary sort by class name
        { lastName: 'asc' },             // Then by last name
        { firstName: 'asc' },            // Then by first name
      ]
    });
    return { error: null, students, schoolName };
  } catch (error) {
    console.error(`Failed to fetch students for school ${schoolId}:`, error);
    return { error: "Failed to retrieve students due to a server error.", students: [], schoolName };
  }
}

export default async function ManageStudentsPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/students`);
  }

  const { error, students, schoolName } = await getStudentsForSchool(schoolId, session.user.id);

  if (error && session.user.role === "SCHOOL_ADMIN" && students.length === 0) { // Check if SCHOOL_ADMIN is authorized, but error occurred
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Manage Students</h1>
            <p className="text-lg text-muted-foreground mt-1">Error loading student data for {schoolName || "this school"}.</p>
          </div>
        </div>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Failed to Load Student Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/90">{error}</p>
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
            Manage Students <span className="text-xl text-muted-foreground">({schoolName || ""})</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Oversee all enrolled students in your school.
          </p>
        </div>
        <Link href={`/${schoolId}/schooladmin/students/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Student
          </Button>
        </Link>
      </div>

      {/* Search and Filters - Placeholder for future */}
      {/* <div className="flex items-center gap-2 py-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students by name, ID, or class..."
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
          />
        </div>
        <Button variant="outline">Filters</Button>
      </div> */}

      {/* Students Data Table */}
      <StudentsDataTable students={students} schoolId={schoolId} />
    </div>
  );
}