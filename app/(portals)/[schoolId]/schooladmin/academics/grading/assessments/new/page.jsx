// File: app/(portals)/[schoolId]/schooladmin/academics/grading/assessments/new/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, PlusCircle, AlertTriangle, ListPlus } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import AssessmentForm from "@/components/schooladmin/AssessmentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getPageData(schoolId, userId) {
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

    const classes = await prisma.class.findMany({
      where: { schoolId: schoolId, academicYear: school.currentAcademicYear || undefined }, // Fetch for current academic year
      select: { id: true, name: true, section: true },
      orderBy: [{name: 'asc'}, {section: 'asc'}]
    });
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    });

    return { school, classes, subjects, error: null };
  } catch (error) {
    console.error("Failed to fetch data for new assessment page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPageData(params.schoolId, null);
  const schoolName = data.school?.name;
  if (!schoolName) return { title: "Define Assessment | Sukuu" };
  return {
    title: `Define New Assessment - ${schoolName} | Sukuu`,
  };
}

export default async function DefineNewAssessmentPage({ params }) {
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/assessments/new`);
  }

  const { school, classes, subjects, error } = await getPageData(schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "SchoolNotFound" || !school) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/grading/assessments`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft/>Back to Assessments</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load data for this page.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics/grading/assessments`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Manage Assessments
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <ListPlus className="h-8 w-8 text-primary" /> {/* Changed icon */}
            Define New Assessment
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{school.name}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
            <CardDescription>
                Specify the class, subject, term, marks, and date for this assessment.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <AssessmentForm 
                schoolId={schoolId} 
                classesList={classes || []}
                subjectsList={subjects || []}
                currentSchoolAcademicYear={school.currentAcademicYear}
                currentSchoolTerm={school.currentTerm}
            />
        </CardContent>
      </Card>
    </div>
  );
}