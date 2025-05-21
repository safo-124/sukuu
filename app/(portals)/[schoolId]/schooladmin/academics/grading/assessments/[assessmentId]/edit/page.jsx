// File: app/(portals)/[schoolId]/schooladmin/academics/grading/assessments/[assessmentId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit as EditIcon, AlertTriangle, ListPlus } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import AssessmentForm from "@/components/schooladmin/AssessmentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getPageDataForEdit(schoolId, assessmentId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId: schoolId },
    });
    if (!assessment) return { error: "AssessmentNotFound" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true, currentTerm: true }
    });
    if (!school) return { error: "SchoolNotFound" };
    
    // Fetch classes and subjects for dropdowns, though they will be disabled in edit mode
    const classes = await prisma.class.findMany({
      where: { schoolId: schoolId, academicYear: assessment.academicYear }, // Or school.currentAcademicYear
      select: { id: true, name: true, section: true }, orderBy: [{name: 'asc'}, {section: 'asc'}]
    });
    const subjects = await prisma.subject.findMany({
      where: { schoolId: schoolId },
      select: { id: true, name: true, code: true }, orderBy: { name: 'asc' }
    });

    return { assessment, classes, subjects, school, error: null };
  } catch (error) {
    console.error("Failed to fetch data for edit assessment page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPageDataForEdit(params.schoolId, params.assessmentId, null);
  if (!data.assessment || !data.school?.name) return { title: "Edit Assessment | Sukuu" };
  return {
    title: `Edit Assessment: ${data.assessment.name} - ${data.school.name} | Sukuu`,
  };
}

export default async function EditAssessmentPage({ params }) {
  const { schoolId, assessmentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/assessments/${assessmentId}/edit`);
  }

  const { assessment, classes, subjects, school, error } = await getPageDataForEdit(schoolId, assessmentId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "AssessmentNotFound" || error === "SchoolNotFound" || !assessment || !school) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/grading/assessments`} passHref><Button variant="outline" size="sm"><ChevronLeft />Back</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load data.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${schoolId}/schooladmin/academics/grading/assessments`} passHref>
            <Button variant="outline" size="sm" className="mb-2"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Assessments</Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <EditIcon className="h-8 w-8 text-primary" />
            Edit Assessment: <span className="text-primary truncate max-w-md">{assessment.name}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">For school: <span className="font-semibold text-primary">{school.name}</span></p>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Update Assessment Details</CardTitle>
            <CardDescription>
                Modify the assessment's name, marks, date, or description. Class, Subject, Year and Term typically cannot be changed for an existing assessment.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <AssessmentForm 
                schoolId={schoolId} 
                initialData={assessment}
                classesList={classes || []} // For consistency, though disabled in edit
                subjectsList={subjects || []} // For consistency, though disabled in edit
                currentSchoolAcademicYear={assessment.academicYear} // Pass existing for display
                currentSchoolTerm={assessment.term} // Pass existing for display
            />
        </CardContent>
      </Card>
    </div>
  );
}