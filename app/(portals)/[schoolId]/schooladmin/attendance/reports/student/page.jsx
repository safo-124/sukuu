// File: app/(portals)/[schoolId]/schooladmin/attendance/reports/student/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { UserSearch, ChevronLeft, AlertTriangle } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import StudentAttendanceReportFilters from "@/components/schooladmin/StudentAttendanceReportFilters"; // We'll create this next

async function getPagePrerequisitesForStudentAttendanceReport(schoolId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true, currentTerm: true }
    });
    if (!school) return { error: "SchoolNotFound" };

    // Fetch distinct academic years from StudentAttendance or Classes
    const academicYearsFromAttendance = await prisma.studentAttendance.groupBy({
        by: ['academicYear'], where: { student: { schoolId: schoolId } }, orderBy: { academicYear: 'desc' }
    });
    const academicYearsFromClasses = await prisma.class.groupBy({
        by: ['academicYear'], where: { schoolId: schoolId }, orderBy: { academicYear: 'desc'}
    });
    const uniqueYears = [...new Set([
        ...(academicYearsFromAttendance.map(ay => ay.academicYear)),
        ...(academicYearsFromClasses.map(ay => ay.academicYear)),
        ...(school.currentAcademicYear ? [school.currentAcademicYear] : [])
    ])].sort().reverse();

    // Fetch all active students for student selection dropdown
    const students = await prisma.student.findMany({
        where: { schoolId: schoolId, isActive: true },
        select: { id: true, firstName: true, lastName: true, studentIdNumber: true },
        orderBy: [{lastName: 'asc'}, {firstName: 'asc'}]
    });

    return { school, availableAcademicYears: uniqueYears, availableStudents: students, error: null };
  } catch (error) {
    console.error("Failed to fetch prerequisites for student attendance report page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPagePrerequisitesForStudentAttendanceReport(params.schoolId, null);
  const schoolName = data.school?.name;
  if (!schoolName) return { title: "Student Attendance Report | Sukuu" };
  return {
    title: `Student Attendance Report - ${schoolName} | Sukuu`,
  };
}

export default async function StudentAttendanceReportPage({ params, searchParams }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/attendance/reports/student`);
  }

  const { school, availableAcademicYears, availableStudents, error } = 
    await getPagePrerequisitesForStudentAttendanceReport(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound" || !school) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/attendance/reports`} passHref><Button variant="outline" size="sm"><ChevronLeft />Back</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load data for report filters.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${schoolId}/schooladmin/attendance/reports`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Attendance Reports
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <UserSearch className="h-8 w-8 text-primary" />
            Student Attendance Report
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            Generate a detailed attendance report for a specific student at <span className="font-semibold text-primary">{school.name}</span>.
        </p>
      </div>
      
      <StudentAttendanceReportFilters 
        schoolId={schoolId}
        availableAcademicYears={availableAcademicYears}
        availableStudents={availableStudents}
        defaultAcademicYear={searchParams.academicYear || school.currentAcademicYear}
        defaultTerm={searchParams.term || school.currentTerm}
        defaultStudentId={searchParams.studentId}
      />

      <div id="student-attendance-report-display-area" className="mt-8">
        {/* Report content will be loaded here by StudentAttendanceReportFilters */}
      </div>
    </div>
  );
}