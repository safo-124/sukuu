// File: app/(portals)/[schoolId]/schooladmin/academics/classes/[classId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit as EditIcon, AlertTriangle } from "lucide-react"; // Renamed Edit to EditIcon
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import ClassForm from "@/components/schooladmin/ClassForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

async function getPageDataForEdit(schoolId, classId, userId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden" };

    const classData = await prisma.class.findUnique({
      where: { id: classId, schoolId: schoolId },
      // include homeroomTeacher if needed for display, form just needs ID
    });
    if (!classData) return { error: "ClassNotFound" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true, currentAcademicYear: true } // Or get academicYear from classData itself
    });
    if (!school) return { error: "SchoolNotFound" };
    
    const teachers = await prisma.teacher.findMany({
      where: { schoolId: schoolId, user: { isActive: true } },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }]
    });

    return { classData, teachers, schoolName: school.name, currentSchoolAcademicYear: classData.academicYear, error: null };
  } catch (error) {
    console.error("Failed to fetch data for edit class page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  const data = await getPageDataForEdit(params.schoolId, params.classId, null);
  if (!data.classData || !data.schoolName) return { title: "Edit Class | Sukuu" };
  return {
    title: `Edit Class: ${data.classData.name} ${data.classData.section || ''} - ${data.schoolName} | Sukuu`,
  };
}

export default async function EditClassPage({ params }) {
  const { schoolId, classId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/classes/${classId}/edit`);
  }

  const { classData, teachers, schoolName, currentSchoolAcademicYear, error } = await getPageDataForEdit(schoolId, classId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized?message=You cannot edit this class.");
  if (error === "ClassNotFound" || error === "SchoolNotFound" || !classData || !schoolName) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/classes`} passHref><Button variant="outline" size="sm" className="mb-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Classes</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load class data for editing.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link href={`/${schoolId}/schooladmin/academics/classes/${classData.id}/view`} passHref>
            <Button variant="outline" size="sm" className="mb-2">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Class Details
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <EditIcon className="h-8 w-8 text-primary" />
            Edit Class: <span className="text-primary">{classData.name} {classData.section || ""}</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For school: <span className="font-semibold text-primary">{schoolName}</span>
          </p>
        </div>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Update Class Information</CardTitle>
            <CardDescription>Modify the class details below. Academic year cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
            <ClassForm 
                schoolId={schoolId} 
                initialData={classData}
                teachersList={teachers || []} 
                currentSchoolAcademicYear={classData.academicYear} // Pass existing academic year, form field will be disabled
            />
        </CardContent>
      </Card>
    </div>
  );
}