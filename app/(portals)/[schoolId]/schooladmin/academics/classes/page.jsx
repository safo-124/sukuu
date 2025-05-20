// File: app/(portals)/[schoolId]/schooladmin/academics/classes/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, BookCopy as ClassesIcon, AlertTriangle } from "lucide-react"; // Renamed BookCopy to ClassesIcon for clarity
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import ClassesDataTable from "@/components/schooladmin/ClassesDataTable"; // We will create this next
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata({ params }) {
  try {
    const school = await prisma.school.findUnique({ 
      where: { id: params.schoolId }, 
      select: { name: true } 
    });
    if (!school) return { title: "Manage Classes | Sukuu" };
    return {
      title: `Manage Classes - ${school.name} | Sukuu`,
      description: `View, create, and manage classes for ${school.name}.`,
    };
  } catch (error) {
    console.error("Error generating metadata for Manage Classes:", error);
    return { title: "Manage Classes | Sukuu" };
  }
}

// Helper function to verify school admin authorization (can be moved to a shared lib)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getClassesForSchool(schoolId, userId) {
  // Authorization check
  const session = await getServerSession(authOptions); // Get session again for role check if needed
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

  if (!authorizedSchoolAdmin) {
      console.warn(`User ${userId} is not authorized for school ${schoolId} to view classes.`);
      return { error: "Unauthorized to view classes for this school.", classes: [], schoolName: null, currentAcademicYear: null };
  }

  try {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, currentAcademicYear: true }
    });

    if (!school) {
        return { error: "School not found.", classes: [], schoolName: null, currentAcademicYear: null };
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
            user: { // Assuming Teacher model has a 'user' relation
              select: { firstName: true, lastName: true },
            },
          },
        },
        _count: { // Count of students enrolled in each class
          select: { studentsEnrolled: true }, 
        },
      },
      orderBy: [
        { academicYear: 'desc'},
        { name: 'asc' },
        { section: 'asc' },
      ],
    });
    return { error: null, classes, schoolName: school.name, currentAcademicYear: school.currentAcademicYear };
  } catch (error) {
    console.error(`Failed to fetch classes for school ${schoolId}:`, error);
    return { error: "Failed to retrieve classes due to a server error.", classes: [], schoolName: null, currentAcademicYear: null };
  }
}

export default async function ManageClassesPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/classes`);
  }

  const { error, classes, schoolName, currentAcademicYear } = await getClassesForSchool(schoolId, session.user.id);

  if (error && classes.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Manage Classes</h1>
            <p className="text-lg text-muted-foreground mt-1">Error loading class data for {schoolName || "this school"}.</p>
          </div>
        </div>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              Failed to Load Class Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive/90">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Manage Classes <span className="text-xl text-muted-foreground">({schoolName || ""})</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Define and organize classes for academic years. Current Year: {currentAcademicYear || "Not Set"}
          </p>
        </div>
        <Link href={`/${schoolId}/schooladmin/academics/classes/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Add New Class
          </Button>
        </Link>
      </div>

      {/* Placeholder for Filters (e.g., by Academic Year) - can be implemented later */}
      {/* <div className="flex items-center gap-2 py-4 border-b"> ... </div> */}

      <ClassesDataTable classes={classes} schoolId={schoolId} />
    </div>
  );
}