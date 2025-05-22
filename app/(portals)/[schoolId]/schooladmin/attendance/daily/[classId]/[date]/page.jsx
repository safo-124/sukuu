// File: app/(portals)/[schoolId]/schooladmin/attendance/daily/[classId]/[date]/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, CheckSquare, AlertTriangle, Info } from "lucide-react";
import { getServerSession } from "next-auth/next";
// Removed format as formatDateFn as it's not used directly in this file's main export

import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as necessary
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import DailyAttendanceSheet from "@/components/schooladmin/DailyAttendanceSheet"; // Ensure this path is correct

// Helper function for authorization
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// Helper to format date for display
const formatDisplayDate = (dateString, options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const dateParts = dateString.split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) return "Invalid Date Format";
  const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2])); // Use UTC to create date from YYYY-MM-DD
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, options); // Let toLocaleDateString handle timezone for display
};

async function getPageDataForAttendance(schoolId, classId, dateStringFromUrl, currentUserId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(currentUserId, schoolId);

    if (!authorizedSchoolAdmin) {
      return { error: "Forbidden", details: "Not authorized for this school's attendance." };
    }

    const dateParts = dateStringFromUrl.split('-').map(Number);
    if (dateParts.length !== 3 || dateParts.some(isNaN)) {
        return { error: "InvalidDate", details: "Date format in URL must be YYYY-MM-DD." };
    }
    // Create Date object at UTC midnight to represent the specific day for DB queries
    const attendanceDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    if (isNaN(attendanceDate.getTime())) {
        return { error: "InvalidDate", details: "Invalid date components." };
    }

    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, currentAcademicYear: true, currentTerm: true }
    });
    if (!school) return { error: "SchoolNotFound" };
    
    const classData = await prisma.class.findFirst({
        where: { id: classId, schoolId: schoolId },
        select: { id: true, name: true, section: true, academicYear: true }
    });
    if (!classData) return { error: "ClassNotFound" };

    const academicYearToUse = classData.academicYear || school.currentAcademicYear;
    const termToUse = school.currentTerm;

    if (!academicYearToUse) {
        return { error: "SessionNotSet", details: "School's current academic year is not set." };
    }
    if (!termToUse) {
        return { error: "SessionNotSet", details: "School's current term is not set." };
    }

    const studentsInClass = await prisma.student.findMany({
        where: { 
            schoolId: schoolId, 
            currentClassId: classId, 
            isActive: true 
        },
        select: {
            id: true, firstName: true, lastName: true, middleName: true, 
            studentIdNumber: true, profilePictureUrl: true,
            attendances: { // <<< CORRECTED: Was 'attendance', now 'attendances'
                where: { 
                    date: attendanceDate, 
                    classId: classId, 
                    academicYear: academicYearToUse, 
                    term: termToUse 
                },
                select: { status: true, remarks: true }
            }
        },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    const studentsWithAttendance = studentsInClass.map(s => ({
        studentId: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName,
        studentIdNumber: s.studentIdNumber,
        profilePictureUrl: s.profilePictureUrl,
        currentStatus: s.attendances[0]?.status || undefined, // Use 'attendances'
        currentRemarks: s.attendances[0]?.remarks || "",    // Use 'attendances'
    }));
    
    return { 
        school, 
        classData, 
        students: studentsWithAttendance, 
        targetDate: dateStringFromUrl,
        academicYear: academicYearToUse,
        term: termToUse,
        error: null 
    };
  } catch (error) {
    console.error("Failed to fetch data for daily attendance page:", error);
    return { error: "DataFetchError" };
  }
}

export async function generateMetadata({ params }) {
  let title = "Daily Attendance | Sukuu";
  try {
    const classData = await prisma.class.findUnique({
        where: {id: params.classId}, 
        select: {name: true, section: true, school: {select: {name: true}}}
    });
    if (classData && classData.school) {
        // Use a simpler date format for title or ensure formatDisplayDate is robust for server-side
        const displayDate = params.date; // YYYY-MM-DD string is fine for title
        title = `Attendance: ${classData.name} ${classData.section || ''} (${displayDate}) - ${classData.school.name} | Sukuu`;
    }
  } catch(e) { /* use default title */ }
  return { title };
}

export default async function DailyAttendancePage({ params }) {
  const { schoolId, classId, date: dateStringFromUrl } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/attendance/daily/${classId}/${dateStringFromUrl}`);
  }

  const { school, classData, students, targetDate, academicYear, term, error, details } = 
    await getPageDataForAttendance(schoolId, classId, dateStringFromUrl, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized");
  if (error === "InvalidDate") return (
    <div className="p-6 text-center space-y-4">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Invalid Date</h2>
        <p className="text-muted-foreground">{details || "The date in the URL is invalid. Please use YYYY-MM-DD format and ensure it's a valid date."}</p>
        <Link href={`/${schoolId}/schooladmin/attendance`} passHref>
            <Button variant="outline"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Attendance Selection</Button>
        </Link>
    </div>
  );
  if (error === "SchoolNotFound" || error === "ClassNotFound" || !school || !classData) notFound();
  
  if (error === "SessionNotSet") {
      return (
        <div className="p-6 space-y-4">
            <Card className="border-destructive bg-destructive/10 max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Configuration Error</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p>{details || "The school's current academic year or term is not set."}</p>
                    <p className="text-sm text-muted-foreground">Please configure these in the Academic Session Settings before managing attendance.</p>
                    <Link href={`/${schoolId}/schooladmin/academics/sessions`} className="mt-2 inline-block">
                        <Button variant="secondary">Go to Session Settings</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
      );
  }
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Error Loading Data</h2>
            <p className="text-muted-foreground">Could not load data for attendance. Please try again later.</p>
            <Link href={`/${schoolId}/schooladmin/attendance`} passHref>
                <Button variant="outline" className="mt-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Attendance Selection</Button>
            </Link>
        </div>
     );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${schoolId}/schooladmin/attendance`} passHref>
            <Button variant="outline" size="sm" className="mb-3">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Attendance Selection
            </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <CheckSquare className="h-8 w-8 text-primary" />
            Daily Attendance Record
        </h1>
        <div className="text-md md:text-lg text-muted-foreground mt-2 space-y-0.5">
            <p><strong>School:</strong> <span className="font-medium text-foreground">{school.name}</span></p>
            <p><strong>Class:</strong> <span className="font-medium text-foreground">{classData.name} {classData.section || ""}</span> ({academicYear})</p>
            <p><strong>Date:</strong> <span className="font-medium text-foreground">{formatDisplayDate(targetDate)}</span> | <strong>Term:</strong> <span className="font-medium text-foreground">{term.replace("_", " ")}</span></p>
        </div>
      </div>
      
      {students.length > 0 ? (
        <DailyAttendanceSheet 
          schoolId={schoolId}
          classId={classData.id}
          targetDate={targetDate} 
          academicYear={academicYear}
          termPeriod={term} 
          initialStudentsWithAttendance={students}
        />
      ) : (
        <Card>
            <CardContent className="pt-6 text-center">
                <Info className="mx-auto h-12 w-12 text-muted-foreground mb-3"/>
                <p className="text-lg font-semibold">No Active Students Found</p>
                <p className="text-muted-foreground text-sm">
                    There are no active students enrolled in <span className="font-medium">{classData.name} {classData.section || ""}</span> to mark attendance for.
                </p>
                <p className="text-xs text-muted-foreground mt-1">Please enroll students or check their active status.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}