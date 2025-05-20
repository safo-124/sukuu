// File: app/(portals)/[schoolId]/schooladmin/academics/subjects/[subjectId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit as EditIcon, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import SubjectForm from "@/components/schooladmin/SubjectForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getPageDataForEdit(schoolId, subjectId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const subject = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: schoolId },
    });
    if (!subject) return { error: "SubjectNotFound" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound" }; // Should not happen if subject was found under schoolId

    return { subject, schoolName: school.name, error: null };
  } catch (error) {
    console.error("Failed to fetch data for edit subject page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPageDataForEdit(params.schoolId, params.subjectId, null);
  if (!data.subject || !data.schoolName) return { title: "Edit Subject | Sukuu" };
  return {
    title: `Edit Subject: ${data.subject.name} - ${data.schoolName} | Sukuu`,
  };
}

export default async function EditSubjectPage({ params }) {
  const { schoolId, subjectId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/subjects/${subjectId}/edit`);
  }

  const { subject, schoolName, error } = await getPageDataForEdit(schoolId, subjectId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized?message=You cannot edit this subject.");
  if (error === "SubjectNotFound" || error === "SchoolNotFound" || !subject || !schoolName) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/subjects`} passHref><Button variant="outline" size="sm" className="mb-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Subjects</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load subject data for editing.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics/subjects`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Manage Subjects
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <EditIcon className="h-8 w-8 text-primary" />
            Edit Subject: <span className="text-primary">{subject.name}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{schoolName}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Update Subject Information</CardTitle>
            <CardDescription>Modify the subject's details below.</CardDescription>
        </CardHeader>
        <CardContent>
            <SubjectForm 
                schoolId={schoolId} 
                initialData={subject} // Pass fetched subject data
            />
        </CardContent>
      </Card>
    </div>
  );
}