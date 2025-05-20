// File: app/(portals)/[schoolId]/schooladmin/students/[studentId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserCog, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import StudentForm from "@/components/schooladmin/StudentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getPageDataForEdit(schoolId, studentId, userId) {
  try {
    // Authorization
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: schoolId },
      // include user if student is linked to user for email etc.
      // include: { user: { select: { email: true, profilePicture: true }}} // if needed
    });

    if (!student) return { error: "StudentNotFound" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true }
    });
    if (!school) return { error: "SchoolNotFound" };


    const classes = await prisma.class.findMany({
      where: { schoolId: schoolId, academicYear: school.currentAcademicYear || undefined },
      select: { id: true, name: true, section: true },
      orderBy: { name: 'asc' }
    });

    return { student, classes, schoolName: school.name, error: null };
  } catch (error) {
    console.error("Failed to fetch data for edit student page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const studentData = await getPageDataForEdit(params.schoolId, params.studentId, null);
  if (!studentData.student || !studentData.schoolName) return { title: "Edit Student | Sukuu" };
  return {
    title: `Edit Student: ${studentData.student.firstName} ${studentData.student.lastName} - ${studentData.schoolName} | Sukuu`,
  };
}

export default async function EditStudentPage({ params }) {
  const { schoolId, studentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/students/${studentId}/edit`);
  }

  const { student, classes, schoolName, error } = await getPageDataForEdit(schoolId, studentId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized?message=You cannot edit this student.");
  if (error === "StudentNotFound" || error === "SchoolNotFound" || !student || !schoolName) notFound();
  if (error === "DataFetchError") {
    return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/students`} passHref><Button variant="outline" size="sm" className="mb-4"><ChevronLeft className="mr-2 h-4 w-4" />Back to Students</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load student data for editing.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/students/${student.id}/view`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Student Profile
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <UserCog className="h-8 w-8 text-primary" />
            Edit Student: <span className="text-primary">{student.firstName} {student.lastName}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{schoolName}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Update Student Information</CardTitle>
            <CardDescription>Modify the student's details below. Ensure Student ID is not changed if it's a permanent identifier.</CardDescription>
        </CardHeader>
        <CardContent>
            <StudentForm 
                schoolId={schoolId} 
                initialData={student} // Pass fetched student data
                classes={classes || []} 
            />
        </CardContent>
      </Card>
    </div>
  );
}