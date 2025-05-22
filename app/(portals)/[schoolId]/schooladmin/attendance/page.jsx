// File: app/(portals)/[schoolId]/schooladmin/attendance/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CheckSquare, ChevronLeft, AlertTriangle, BarChart3 } from "lucide-react"; // Added BarChart3 for reports link

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AttendanceFilterForm from "@/components/schooladmin/AttendanceFilterForm"; // Ensure this path is correct

// Helper function for authorization (can be moved to a shared lib)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getPageData(schoolId, userId) {
  try {
    // Session check should be done by the page component itself before calling this.
    // This function primarily focuses on fetching data assuming user is authorized.
    const isSuperAdmin = (await getServerSession(authOptions))?.user?.role === 'SUPER_ADMIN'; // Quick check for broader access if needed
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

    if (!authorizedSchoolAdmin) {
        // This error will be caught by the page component and trigger a redirect.
        // Throwing an error or returning a specific error object are both options.
        throw new Error("Forbidden"); 
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true } 
    });

    if (!school) {
      throw new Error("SchoolNotFound");
    }

    // Fetch classes for the school's current academic year to populate filter form
    const classes = await prisma.class.findMany({
      where: { 
        schoolId: schoolId,
        // Only show classes for the school's current academic year in the filter
        academicYear: school.currentAcademicYear || undefined 
      },
      select: { id: true, name: true, section: true, academicYear: true }, // academicYear needed if classesForCurrentYear filter is client-side
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    });

    return { school, classes, error: null };
  } catch (error) {
    console.error("Failed to fetch data for attendance management page:", error);
    if (error.message === "Forbidden" || error.message === "SchoolNotFound") {
        return { error: error.message, school: null, classes: [] };
    }
    return { error: "DataFetchError", school: null, classes: [] };
  }
}

export async function generateMetadata({ params }) {
  let schoolName = "Attendance Management";
  try {
    const school = await prisma.school.findUnique({ where: {id: params.schoolId}, select: { name: true }});
    if (school) schoolName = school.name;
  } catch(e) { /* fallback to default title */ }
  return {
    title: `Attendance Management - ${schoolName} | Sukuu`,
    description: `Manage and view student attendance records for ${schoolName}.`,
  };
}

export default async function AttendanceManagementPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/attendance`);
  }

  const { school, classes, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") {
    redirect("/unauthorized?message=You are not authorized for this school's attendance module.");
  }
  if (error === "SchoolNotFound" || !school) {
    // If school itself not found after auth checks, something is wrong with schoolId param
    notFound();
  }
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            {/* A general back button or breadcrumb might be better here if the context is deeper */}
            <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back to Dashboard</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2">
                        <AlertTriangle/>Error Loading Page Data
                    </CardTitle>
                </CardHeader>
                <CardContent><p>Could not load necessary data for attendance management. Please try again later.</p></CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* Optional Back Button to a higher-level dashboard or academics page */}
           <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
            <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
              <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-primary" />
            Student Attendance
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Manage daily attendance and view attendance reports for <span className="font-semibold text-primary">{school.name}</span>.
          </p>
        </div>
      </div>
      
      {/* Card for Marking Daily Attendance */}
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Mark / View Daily Class Attendance</CardTitle>
            <CardDescription>
                Select a specific date and class to mark or review daily attendance records.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <AttendanceFilterForm 
                schoolId={schoolId} 
                availableClasses={classes || []}
                currentAcademicYear={school.currentAcademicYear}
            />
        </CardContent>
      </Card>

      {/* Card for Attendance Reports */}
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6"/>
                Attendance Reports
            </CardTitle>
            <CardDescription>
                Generate and view detailed attendance reports for students or classes over specific periods.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Link href={`/${schoolId}/schooladmin/attendance/reports`} passHref> {/* Links to the reports hub */}
                <Button variant="outline" className="w-full sm:w-auto">
                    Access Attendance Reports
                </Button>
            </Link>
        </CardContent>
      </Card>
    </div>
  );
}