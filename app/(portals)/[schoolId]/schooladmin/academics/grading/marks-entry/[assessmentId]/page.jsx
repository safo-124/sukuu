// File: app/(portals)/[schoolId]/schooladmin/academics/grading/marks-entry/[assessmentId]/page.jsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, FileSignature, AlertTriangle, Info } from "lucide-react";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import MarksEntryTable from "@/components/schooladmin/MarksEntryTable"; // We will create this client component next

// Helper function (can be shared)
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// Helper to format date
const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString(undefined, options);
};

async function getMarksEntryPageData(assessmentId, schoolId, currentUserId) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
    // For now, only SchoolAdmin of THIS school or SuperAdmin. Teachers will need different logic.
    const authorizedUser = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(currentUserId, schoolId);

    if (!authorizedUser) {
      return { error: "Forbidden", assessment: null, studentsWithMarks: [], schoolName: null };
    }

    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        schoolId: schoolId 
      },
      include: {
        school: { select: { name: true } },
        class: { select: { id: true, name: true, section: true, academicYear: true } },
        subject: { select: { name: true } },
      }
    });

    if (!assessment) {
      return { error: "AssessmentNotFound", assessment: null, studentsWithMarks: [], schoolName: null };
    }

    // Fetch students currently enrolled in the assessment's class
    // This assumes Student.currentClassId points to the Class.id
    const studentsInClass = await prisma.student.findMany({
        where: {
            schoolId: schoolId,
            currentClassId: assessment.classId,
            isActive: true, // Only active students
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            middleName: true,
            studentIdNumber: true,
            profilePictureUrl: true,
            // Fetch existing marks for this specific assessment for these students
            marks: {
                where: {
                    assessmentId: assessmentId,
                },
                select: {
                    id: true, // ID of the StudentMark record
                    marksObtained: true,
                    remarks: true,
                }
            }
        },
        orderBy: [
            { lastName: 'asc' },
            { firstName: 'asc' }
        ]
    });

    // Structure data for the form: combine student with their existing mark for this assessment
    const studentsWithMarks = studentsInClass.map(student => {
        const existingMark = student.marks.length > 0 ? student.marks[0] : null;
        return {
            studentId: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            middleName: student.middleName,
            studentIdNumber: student.studentIdNumber,
            profilePictureUrl: student.profilePictureUrl,
            existingMarkId: existingMark?.id || null,
            marksObtained: existingMark?.marksObtained ?? '', // Default to empty string for input
            remarks: existingMark?.remarks || '', // Default to empty string for input
        };
    });
    
    return { 
        error: null, 
        assessment, 
        studentsWithMarks, 
        schoolName: assessment.school.name 
    };

  } catch (error) {
    console.error(`Failed to fetch data for marks entry (assessment ID ${assessmentId}):`, error);
    return { error: "DataFetchError", assessment: null, studentsWithMarks: [], schoolName: null };
  }
}

export async function generateMetadata({ params }) {
  // Simplified fetch for metadata
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
    include: { school: { select: { name: true } }, class: {select: {name:true}}, subject: {select: {name:true}} }
  });
  if (!assessment) return { title: "Enter Marks | Sukuu" };
  return {
    title: `Marks Entry: ${assessment.name} (${assessment.subject.name} - ${assessment.class.name}) - ${assessment.school.name} | Sukuu`,
  };
}

export default async function MarksEntryPage({ params }) {
  const { schoolId, assessmentId } = params;
  const session = await getServerSession(authOptions);

  if (!session || !session.user || (session.user.role !== "SCHOOL_ADMIN" && session.user.role !== "SUPER_ADMIN")) {
    redirect(`/auth/signin?callbackUrl=/${schoolId}/schooladmin/academics/grading/marks-entry/${assessmentId}`);
  }

  const { assessment, studentsWithMarks, schoolName, error } = await getMarksEntryPageData(assessmentId, schoolId, session.user.id);

  if (error === "Forbidden") redirect("/unauthorized?message=You are not authorized for this action.");
  if (error === "AssessmentNotFound" || !assessment) notFound();
  if (error === "DataFetchError") {
     return (
        <div className="p-6 space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold text-destructive">Failed to Load Data</h2>
            <p className="text-muted-foreground">Could not load assessment or student data. Please try again.</p>
            <Link href={`/${schoolId}/schooladmin/academics/grading/assessments`} passHref>
                <Button variant="outline" className="mt-4"><ChevronLeft className="mr-2 h-4 w-4"/>Back to Assessments</Button>
            </Link>
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
              Back to Assessments List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-2">
            <FileSignature className="h-8 w-8 text-primary" />
            Enter / View Marks
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            For <span className="font-semibold text-primary">{assessment.name}</span>
          </p>
        </div>
        {/* Save All button will be part of the MarksEntryTable client component */}
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Assessment Details</CardTitle>
          <div className="text-sm text-muted-foreground space-y-1 pt-1">
            <p><strong>Class:</strong> {assessment.class.name} {assessment.class.section || ""}</p>
            <p><strong>Subject:</strong> {assessment.subject.name}</p>
            <p><strong>Academic Year:</strong> {assessment.academicYear} - <strong>Term:</strong> {assessment.term.replace("_", " ")}</p>
            <p><strong>Max Marks:</strong> {assessment.maxMarks}</p>
            <p><strong>Date:</strong> {formatDate(assessment.assessmentDate)}</p>
          </div>
        </CardHeader>
        <CardContent>
          {studentsWithMarks.length > 0 ? (
            <MarksEntryTable 
              assessmentId={assessment.id}
              maxMarks={assessment.maxMarks}
              initialStudentsWithMarks={studentsWithMarks}
              schoolId={schoolId} // Pass schoolId for API calls if needed from client
            />
          ) : (
            <div className="text-center py-8 space-y-2">
                <Info className="mx-auto h-10 w-10 text-muted-foreground"/>
                <p className="text-muted-foreground">No active students found in class <span className="font-semibold">{assessment.class.name} {assessment.class.section || ""}</span> to enter marks for.</p>
                <p className="text-xs text-muted-foreground">Ensure students are enrolled and active in this class.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}