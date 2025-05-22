// File: app/(portals)/[schoolId]/schooladmin/academics/classes/[classId]/edit/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Edit as EditIcon, AlertTriangle, BookCopy as ClassIcon } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import ClassForm from "@/components/schooladmin/ClassForm";
import ClassSubjectAssignmentManager from "@/components/schooladmin/ClassSubjectAssignmentManager";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getPageDataForClassEdit(schoolId, classId, userId) {
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
      where: { 
        id: classId, 
        schoolId: schoolId // This confirms classId belongs to schoolId
      },
      include: {
        homeroomTeacher: {
            include: { user: {select: {firstName: true, lastName: true}}}
        }
      }
    });
    if (!classData) return { error: "ClassNotFound" };

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound" }; // Should be rare if classData was found
    
    // Fetch existing Subject Assignments for this Class and its academic year
    const subjectAssignments = await prisma.classSubjectAssignment.findMany({
        where: { 
            classId: classId,
            academicYear: classData.academicYear 
            // The schoolId check is implicitly handled because classId is already verified to be in schoolId
        },
        include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
        },
        orderBy: { subject: { name: 'asc' }}
    });

    const availableSubjects = await prisma.subject.findMany({
        where: { schoolId: schoolId },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' }
    });
    
    const availableTeachers = await prisma.teacher.findMany({
        where: { schoolId: schoolId, user: { isActive: true } },
        select: { id: true, user: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }]
    });

    return { 
        classData, 
        subjectAssignments,
        availableSubjects,
        availableTeachers,
        schoolName: school.name, 
        error: null 
    };
  } catch (error) {
    console.error("Failed to fetch data for edit class page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  // For metadata, we only need basic info, less strict auth needed here potentially
  // or call a simplified version of getPageDataForClassEdit.
  // This uses a direct prisma call for simplicity for metadata.
  try {
    const classDetails = await prisma.class.findUnique({
        where: { id: params.classId, schoolId: params.schoolId },
        select: { name: true, section: true, school: { select: { name: true }}}
    });
    if (!classDetails || !classDetails.school) return { title: "Edit Class | Sukuu" };
    return {
        title: `Edit Class: ${classDetails.name} ${classDetails.section || ''} - ${classDetails.school.name} | Sukuu`,
    };
  } catch (e) {
    console.error("Error in generateMetadata for Edit Class:", e)
    return { title: "Edit Class | Sukuu" };
  }
}

export default async function EditClassWithAssignmentsPage({ params }) {
  const { schoolId, classId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/classes/${classId}/edit`);
  }

  const { classData, subjectAssignments, availableSubjects, availableTeachers, schoolName, error } = 
    await getPageDataForClassEdit(schoolId, classId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized?message=You cannot edit this class.");
  if (error === "ClassNotFound" || error === "SchoolNotFound" || !classData || !schoolName) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/academics/classes`} passHref><Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back</Button></Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load class data for editing.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href={`/${schoolId}/schooladmin/academics/classes/${classData.id}/view`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Class Details
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <EditIcon className="h-8 w-8 text-primary" />
            Edit Class: <span className="text-primary truncate max-w-lg">{classData.name} {classData.section || ""}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            Academic Year: {classData.academicYear} | For school: <span className="font-semibold text-primary">{schoolName}</span>
        </p>
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle>Class Core Details</CardTitle>
            <CardDescription>Update the class name, section, or homeroom teacher. Academic year cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
            <ClassForm 
                schoolId={schoolId} 
                initialData={classData}
                teachersList={availableTeachers || []}
                currentSchoolAcademicYear={classData.academicYear} 
            />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="w-full shadow-md">
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClassIcon className="h-6 w-6"/>Subject & Teacher Assignments</CardTitle>
            <CardDescription>Manage which subjects are taught in this class and by which teachers for the academic year {classData.academicYear}.</CardDescription>
        </CardHeader>
        <CardContent>
            <ClassSubjectAssignmentManager
                schoolId={schoolId}
                classId={classData.id}
                classAcademicYear={classData.academicYear}
                initialAssignments={subjectAssignments || []}
                availableSubjects={availableSubjects || []}
                availableTeachers={availableTeachers || []}
            />
        </CardContent>
      </Card>
    </div>
  );
}