// File: app/(portals)/[schoolId]/schooladmin/academics/grading/assessments/page.jsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, ListPlus as AssessmentsIcon, AlertTriangle, ChevronLeft } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import AssessmentsDataTable from "@/components/schooladmin/AssessmentsDataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getAssessmentsForSchool(schoolId, userId) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(userId, schoolId);

  if (!authorizedSchoolAdmin) {
      return { error: "Unauthorized", assessments: [], schoolName: null };
  }

  try {
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound", assessments: [], schoolName: null };

    const assessments = await prisma.assessment.findMany({
      where: { schoolId: schoolId },
      include: {
        class: { 
          select: { 
            name: true, 
            section: true,
            _count: { // Count active students in this class
              select: { 
                currentStudents: { where: { isActive: true } } 
              } 
            }
          } 
        },
        subject: { select: { name: true } },
        _count: { // Count how many student marks entries exist for this assessment
          select: { studentMarks: true }
        }
      },
      orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { assessmentDate: 'desc' }, { name: 'asc' }],
    });
    return { error: null, assessments, schoolName: school.name };
  } catch (error) {
    console.error(`Failed to fetch assessments for school ${schoolId}:`, error);
    const schoolNameForError = (await prisma.school.findUnique({where: {id: schoolId}, select:{name:true}}))?.name || "this school";
    return { error: "DataFetchError", assessments: [], schoolName: schoolNameForError };
  }
}

export async function generateMetadata({ params }) {
  // ... (metadata function remains the same)
  const schoolName = (await prisma.school.findUnique({ where: { id: params.schoolId }, select: { name: true } }))?.name;
  if (!schoolName) return { title: "Manage Assessments | Sukuu" };
  return {
    title: `Manage Assessments - ${schoolName} | Sukuu`,
    description: `Define, view, and manage all academic assessments for ${schoolName}.`,
  };
}

export default async function ManageAssessmentsPage({ params }) {
  // ... (session checks and error handling remain the same) ...
  const { schoolId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/assessments`);
  }

  const { error, assessments, schoolName } = await getAssessmentsForSchool(schoolId, session.user.id);
  
  if (error === "Unauthorized") redirect(`/unauthorized`);
  if (error === "SchoolNotFound") redirect(`/school-admin-portal?error=school_not_found`);

  if (error === "DataFetchError" && assessments.length === 0) {
    return (
      <div className="space-y-6">
        <Link href={`/${schoolId}/schooladmin/academics/grading`} passHref>
            <Button variant="outline" size="sm" className="mb-2"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Grading Overview</Button>
        </Link>
        <Card className="border-destructive bg-destructive/10">
          <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Failed to Load Assessments</CardTitle></CardHeader>
          <CardContent><p>{error}</p></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <Link href={`/${schoolId}/schooladmin/academics/grading`} passHref>
                <Button variant="outline" size="sm" className="mb-3 text-xs sm:text-sm">
                <ChevronLeft className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                Back to Grading Overview
                </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                Manage Assessments <span className="text-xl text-muted-foreground">({schoolName || ""})</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-1">
                Define and organize all tests, exams, and assignments for your school.
            </p>
        </div>
        <Link href={`/${schoolId}/schooladmin/academics/grading/assessments/new`} passHref>
          <Button size="lg" className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-5 w-5" />
            Define New Assessment
          </Button>
        </Link>
      </div>
      <AssessmentsDataTable assessments={assessments || []} schoolId={schoolId} /> {/* Pass empty array if assessments is null/undefined */}
    </div>
  );
}