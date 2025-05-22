// File: app/(portals)/[schoolId]/schooladmin/attendance/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { CheckSquare, ChevronLeft, AlertTriangle } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import AttendanceFilterForm from "@/components/schooladmin/AttendanceFilterForm"; // We'll create this next

async function getPageData(schoolId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;

    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({
            where: { userId: userId, schoolId: schoolId }
        });
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", school: null, classes: [] };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true } // Need currentAcademicYear to filter classes
    });
    if (!school) return { error: "SchoolNotFound", school: null, classes: [] };

    // Fetch classes for the school's current academic year
    const classes = await prisma.class.findMany({
      where: { 
        schoolId: schoolId,
        academicYear: school.currentAcademicYear || undefined // Filter by current year if set
      },
      select: { id: true, name: true, section: true, academicYear: true },
      orderBy: [{ name: 'asc' }, { section: 'asc' }]
    });

    return { school, classes, error: null };
  } catch (error) {
    console.error("Failed to fetch data for attendance page:", error);
    return { error: "DataFetchError", school: null, classes: [] };
  }
}

export async function generateMetadata({ params }) {
  let schoolName = "Attendance";
  try {
    const school = await prisma.school.findUnique({ where: {id: params.schoolId}, select: { name: true }});
    if (school) schoolName = school.name;
  } catch(e) {/* fallback */}
  return {
    title: `Student Attendance - ${schoolName} | Sukuu`,
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

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound" || !school) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back to Dashboard</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load data for attendance management.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {/* Optional: Back button to a higher-level academic/admin dashboard if this isn't the direct entry from sidebar */}
          {/* <Link href={`/${schoolId}/schooladmin/dashboard`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link> */}
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <CheckSquare className="h-8 w-8 text-primary" />
            Student Attendance
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Select a date and class to view or mark daily attendance for <span className="font-semibold text-primary">{school.name}</span>.
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Select Criteria</CardTitle>
            <CardDescription>
                Choose a date and a class to proceed.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <AttendanceFilterForm 
                schoolId={schoolId} 
                availableClasses={classes || []}
                currentAcademicYear={school.currentAcademicYear} // Pass for context or filtering if needed
            />
        </CardContent>
      </Card>

      {/* Placeholder for where attendance data might be displayed or link to a specific day's attendance sheet */}
      <div id="attendance-display-area" className="mt-8">
        {/* Content will be loaded here based on filter selection */}
      </div>
    </div>
  );
}