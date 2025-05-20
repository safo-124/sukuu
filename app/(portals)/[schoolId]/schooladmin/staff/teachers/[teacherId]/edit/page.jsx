// File: app/(portals)/[schoolId]/schooladmin/staff/teachers/[teacherId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, UserCog, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import TeacherForm from "@/components/schooladmin/TeacherForm"; // Ensure this path is correct
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getTeacherForEdit(schoolId, teacherId, currentUserId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && currentUserId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: currentUserId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId: schoolId },
      include: { user: true } // Include full user details for the form
    });
    if (!teacher) return { error: "TeacherNotFound" };

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound" };

    return { teacher, schoolName: school.name, error: null };
  } catch (error) {
    console.error("Failed to fetch data for edit teacher page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getTeacherForEdit(params.schoolId, params.teacherId, null); // userId null for metadata
  if (!data.teacher || !data.schoolName) return { title: "Edit Teacher | Sukuu" };
  return {
    title: `Edit Teacher: ${data.teacher.user.firstName} ${data.teacher.user.lastName} - ${data.schoolName} | Sukuu`,
  };
}

export default async function EditTeacherPage({ params }) {
  const { schoolId, teacherId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/staff/teachers/${teacherId}/edit`);
  }

  const { teacher, schoolName, error } = await getTeacherForEdit(schoolId, teacherId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized?message=You cannot edit this teacher.");
  if (error === "TeacherNotFound" || error === "SchoolNotFound" || !teacher || !schoolName) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/staff/teachers`} passHref><Button variant="outline" size="sm" className="mb-4"><ChevronLeft className="mr-2 h-4 w-4" />Back to Teachers</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load teacher data for editing.</p></CardContent></Card>
        </div>
    );
  }

  // Prepare initialData for the form: needs to be flat if TeacherForm expects that,
  // or TeacherForm needs to handle nested initialData.user.
  // Our TeacherForm's getFormDefaultValues handles initialData.user.
  const initialTeacherData = teacher; 


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/staff/teachers/${teacher.id}/view`} passHref> {/* Link to view page */}
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Teacher Profile
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <UserCog className="h-8 w-8 text-primary" />
            Edit Teacher: <span className="text-primary">{teacher.user.firstName} {teacher.user.lastName}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{schoolName}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Update Teacher Information</CardTitle>
            <CardDescription>Modify the teacher's details below. Email address cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
            <TeacherForm 
                schoolId={schoolId} 
                initialData={initialTeacherData} // Pass fetched teacher data (includes user)
            />
        </CardContent>
      </Card>
    </div>
  );
}