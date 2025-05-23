// File: app/(portals)/[schoolId]/schooladmin/timetable/manage/[classId]/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, CalendarDays as TimetableIcon, AlertTriangle } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import ClassTimetableGrid from "@/components/schooladmin/ClassTimetableGrid";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

async function getPageDataForTimetable(schoolId, classId, currentUserId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(currentUserId, schoolId);

    if (!authorizedSchoolAdmin) {
      return { error: "Forbidden" };
    }

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });
    if (!school) return { error: "SchoolNotFound" };

    const classData = await prisma.class.findUnique({
      where: { 
        id: classId,
        schoolId: schoolId
      },
      select: { 
        id: true, 
        name: true, 
        section: true, 
        academicYear: true 
      }
    });
    if (!classData) return { error: "ClassNotFound" };

    const schoolPeriods = await prisma.schoolPeriod.findMany({
        where: { schoolId: schoolId },
        orderBy: { sortOrder: 'asc' }
    });

    const existingTimetableSlots = await prisma.timetableSlot.findMany({
        where: {
            classId: classId,
            schoolId: schoolId,
            // Consider filtering by classData.academicYear if TimetableSlot has academicYear
        },
        include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        }
    });

    const availableAssignments = await prisma.classSubjectAssignment.findMany({
        where: {
            classId: classId,
            academicYear: classData.academicYear
        },
        include: {
            subject: { select: { id: true, name: true, code: true } },
            teacher: { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
        },
        orderBy: { subject: { name: 'asc' }}
    });

    // Fetch all active teachers in the school for the dropdowns
    const availableTeachers = await prisma.teacher.findMany({
        where: {
            schoolId: schoolId,
            user: { isActive: true }
        },
        select: {
            id: true, // Teacher record ID
            user: {
                select: {
                    id: true, // User ID
                    firstName: true,
                    lastName: true
                }
            }
        },
        orderBy: [{user: {lastName: 'asc'}}, {user: {firstName: 'asc'}}]
    });
    
    return { 
        schoolName: school.name,
        classData, 
        schoolPeriods, 
        initialTimetableSlots: existingTimetableSlots, 
        availableAssignments,
        availableTeachers, // <<< ADDED THIS
        error: null 
    };

  } catch (error) {
    console.error(`Failed to fetch data for timetable management (class ID ${classId}):`, error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  let title = "Class Timetable | Sukuu";
  try {
    const classData = await prisma.class.findUnique({
        where: { id: params.classId, schoolId: params.schoolId },
        select: { name: true, section: true, academicYear: true, school: {select: {name: true}} }
    });
    if (classData && classData.school) {
        title = `Timetable: ${classData.name} ${classData.section || ''} (${classData.academicYear}) - ${classData.school.name} | Sukuu`;
    }
  } catch(e) { /* use default title */ }
  return { title };
}

export default async function ManageClassTimetablePage({ params }) {
  const { schoolId, classId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/timetable/manage/${classId}`);
  }

  const { 
    schoolName, 
    classData, 
    schoolPeriods, 
    initialTimetableSlots, 
    availableAssignments, 
    availableTeachers, // <<< Destructure new prop
    error 
  } = await getPageDataForTimetable(schoolId, classId, session.user.id);

  if (error === "Forbidden") {
    redirect("/unauthorized?message=You are not authorized to manage timetables for this school.");
  }
  if (error === "SchoolNotFound" || error === "ClassNotFound" || !classData) {
    notFound();
  }
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4">
            <Link href={`/${schoolId}/schooladmin/timetable/manage`} passHref>
                <Button variant="outline" size="sm" className="mb-4"><ChevronLeft />Back to Select Class</Button>
            </Link>
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Error</CardTitle></CardHeader><CardContent><p>Could not load necessary data for timetable management. Please try again.</p></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${schoolId}/schooladmin/timetable/manage`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Select Class
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <TimetableIcon className="h-8 w-8 text-primary" />
            Manage Timetable: <span className="text-primary">{classData.name} {classData.section || ""}</span>
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
            School: <span className="font-semibold text-foreground">{schoolName}</span> | Academic Year: <span className="font-semibold text-foreground">{classData.academicYear}</span>
        </p>
      </div>
      
      <ClassTimetableGrid
        schoolId={schoolId}
        classData={classData}
        schoolPeriods={schoolPeriods || []}
        initialTimetableSlots={initialTimetableSlots || []}
        availableAssignments={availableAssignments || []}
        availableTeachers={availableTeachers || []} // <<< PASS THE PROP HERE
      />
    </div>
  );
}