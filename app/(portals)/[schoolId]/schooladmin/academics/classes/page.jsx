// File: app/(portals)/[schoolId]/schooladmin/academics/classes/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, BookCopy as ClassesIcon, AlertTriangle, ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Ensure this path is correct
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import ClassesDataTable from "@/components/schooladmin/ClassesDataTable"; // Client component for the table
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input"; // For future search on this page
// import { Search } from "lucide-react"; // For future search on this page

// Helper function for authorization (can be moved to a shared lib)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getClassesPageData(schoolId, userId) {
  const session = await getServerSession(authOptions); // Fetch session for role check
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

  if (!authorizedSchoolAdmin) {
      return { error: "Unauthorized", classes: [], schoolName: null, currentAcademicYear: null };
  }

  try {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, currentAcademicYear: true }
    });

    if (!school) {
        return { error: "SchoolNotFound", classes: [], schoolName: null, currentAcademicYear: null };
    }

    const classes = await prisma.class.findMany({
      where: {
        schoolId: schoolId,
        // Optionally filter by school.currentAcademicYear if you want to show only current year classes by default
        // academicYear: school.currentAcademicYear || undefined, 
      },
      include: {
        homeroomTeacher: {
          include: {
            user: { 
              select: { firstName: true, lastName: true },
            },
          },
        },
        _count: { 
          select: { currentStudents: true }, // Correctly count students linked via Student.currentClassId
        },
      },
      orderBy: [
        { academicYear: 'desc'}, // Show most recent academic years first
        { name: 'asc' },         // Then sort by class name
        { section: 'asc' },      // Then by section
      ],
    });
    return { 
        error: null, 
        classes, 
        schoolName: school.name, 
        currentAcademicYear: school.currentAcademicYear 
    };
  } catch (error) {
    console.error(`Failed to fetch classes for school ${schoolId}:`, error);
    // Attempt to get school name even if classes fetch fails, for error message context
    const schoolNameForError = (await prisma.school.findUnique({where: {id: schoolId}, select:{name:true}}))?.name || "this school";
    return { error: "DataFetchError", classes: [], schoolName: schoolNameForError, currentAcademicYear: null };
  }
}

export async function generateMetadata({ params }) {
  let schoolName = "Manage Classes";
  try {
    const school = await prisma.school.findUnique({ 
      where: { id: params.schoolId }, 
      select: { name: true } 
    });
    if (school) schoolName = school.name;
    else return { title: "Manage Classes | Sukuu" };
  } catch(e) {
    console.error("Error fetching school name for metadata (Manage Classes):", e);
  }
  return {
    title: `Manage Classes - ${schoolName} | Sukuu`,
    description: `View, create, and manage classes for ${schoolName}.`,
  };
}

export default async function ManageClassesPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/classes`);
  }

  const { error, classes, schoolName, currentAcademicYear } = await getClassesPageData(schoolId, session.user.id);
  
  if (error === "Unauthorized") {
    redirect(`/unauthorized?message=You are not authorized to manage classes for this school.`);
  }
  if (error === "SchoolNotFound") {
    // This implies the schoolId in URL is invalid or the school was deleted.
    // Redirecting to a safe place or showing a generic "school not found" might be better than notFound().
    redirect(`/school-admin-portal?error=school_not_found_for_classes`);
  }

  if (error === "DataFetchError" && (!classes || classes.length === 0)) { // Show error if fetch failed and no classes to show
    return (
      <div className="space-y-6">
        <Link href={`/${schoolId}/schooladmin/academics`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Academics Overview
            </Button>
        </Link>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              Failed to Load Class Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/90">There was an issue retrieving the list of classes for {schoolName}.</p>
             <p className="mt-2 text-sm text-muted-foreground">Please try again later or contact support.</p>
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
            <Link href={`/${schoolId}/schooladmin/academics`} passHref>
                <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Back to Academics Overview
                </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Manage Classes 
                <span className="text-xl text-muted-foreground ml-2">({schoolName || "School"})</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
              Define and organize classes. 
              {currentAcademicYear && ` Current Academic Year: ${currentAcademicYear}`}
            </p>
        </div>
        <Link href={`/${schoolId}/schooladmin/academics/classes/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto mt-2 sm:mt-0">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Class
          </Button>
        </Link>
      </div>

      {/* Placeholder for Search and Filters - Future Enhancement
      <div className="flex items-center gap-2 py-4 border-t border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search classes by name, academic year, or teacher..."
            className="pl-10 w-full md:w-2/3 lg:w-1/2"
          />
        </div>
        <Button variant="outline">Filter by Year</Button>
      </div> 
      */}

      <ClassesDataTable classes={classes || []} schoolId={schoolId} />
    </div>
  );
}