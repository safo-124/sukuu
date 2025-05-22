// File: app/(portals)/[schoolId]/schooladmin/academics/grading/reports/student-term-report/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { FileSpreadsheet, ChevronLeft, AlertTriangle } from "lucide-react";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ReportCardFilters from "@/components/schooladmin/ReportCardFilters"; // We'll create this client component

async function getPagePrerequisites(schoolId, userId) {
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

    // Fetch distinct academic years from assessments or classes for filters
    const academicYearsFromAssessments = await prisma.assessment.groupBy({
        by: ['academicYear'],
        where: { schoolId: schoolId },
        orderBy: { academicYear: 'desc' }
    });
    const academicYearsFromClasses = await prisma.class.groupBy({
        by: ['academicYear'],
        where: { schoolId: schoolId },
        orderBy: { academicYear: 'desc'}
    });
    // Combine and unique years
    const uniqueYears = [...new Set([
        ...(academicYearsFromAssessments.map(ay => ay.academicYear)),
        ...(academicYearsFromClasses.map(ay => ay.academicYear)),
        ...(school.currentAcademicYear ? [school.currentAcademicYear] : []) // Ensure current year is an option
    ])].sort().reverse();


    // Fetch all classes for the school (can be filtered later by selected year on client)
    const classes = await prisma.class.findMany({
        where: { schoolId: schoolId }, // Add academicYear filter if needed based on default selected year
        select: { id: true, name: true, section: true, academicYear: true },
        orderBy: [{academicYear: 'desc'}, {name: 'asc'}, {section: 'asc'}]
    });

    return { school, availableAcademicYears: uniqueYears, availableClasses: classes, error: null };
  } catch (error) {
    console.error("Failed to fetch prerequisites for student report page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPagePrerequisites(params.schoolId, null);
  const schoolName = data.school?.name;
  if (!schoolName) return { title: "Student Report Card | Sukuu" };
  return {
    title: `Student Report Cards - ${schoolName} | Sukuu`,
  };
}

export default async function StudentTermReportPage({ params, searchParams }) { // searchParams for pre-filling filters
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/reports/student-term-report`);
  }

  const { school, availableAcademicYears, availableClasses, error } = await getPagePrerequisites(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound" || !school) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/grading/reports-dashboard`} passHref><Button variant="outline" size="sm"><ChevronLeft />Back</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load data.</p></CardContent></Card>
        </div>
    );
  }

  // The actual report display will likely be triggered by client-side actions after filters are set
  // We pass the necessary data for filters to a client component
  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${schoolId}/schooladmin/academics/grading/reports-dashboard`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Reports Dashboard
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            Student Term Report Card
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            Generate and view report cards for students at <span className="font-semibold text-primary">{school.name}</span>.
        </p>
      </div>
      
      <ReportCardFilters 
        schoolId={schoolId}
        availableAcademicYears={availableAcademicYears}
        availableClasses={availableClasses}
        defaultAcademicYear={searchParams.academicYear || school.currentAcademicYear}
        defaultTerm={searchParams.term || school.currentTerm}
        // defaultClassId={searchParams.classId} // optional pre-selection
        // defaultStudentId={searchParams.studentId} // optional pre-selection
      />

      {/* The generated report card(s) will be displayed below the filters, likely by ReportCardFilters or another component */}
      <div id="report-card-display-area" className="mt-8">
        {/* Placeholder for where the report card will be rendered */}
      </div>
    </div>
  );
}