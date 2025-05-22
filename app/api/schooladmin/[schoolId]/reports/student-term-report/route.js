// File: app/api/schooladmin/[schoolId]/reports/student-term-report/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { TermPeriod } from "@prisma/client"; // For validating term

// Helper function for authorization
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// Helper function to find grade details from a scale
function getGradeDetails(percentage, gradeScaleEntries) {
  if (percentage === null || percentage === undefined || isNaN(percentage) || !gradeScaleEntries || gradeScaleEntries.length === 0) {
    return { gradeLetter: "N/A", gradePoint: null, remark: "Not Graded" };
  }
  // Ensure entries are sorted by minPercentage descending to find the correct range
  const sortedEntries = [...gradeScaleEntries].sort((a, b) => b.minPercentage - a.minPercentage);
  for (const entry of sortedEntries) {
    if (percentage >= entry.minPercentage && percentage <= entry.maxPercentage) {
      return {
        gradeLetter: entry.gradeLetter,
        gradePoint: entry.gradePoint,
        remark: entry.remark || "", // Default to empty string if null
      };
    }
  }
  return { gradeLetter: "N/G", gradePoint: null, remark: "No matching grade" }; // No Grade if not in any range
}


// GET handler to fetch and process report card data
export async function GET(req, { params }) {
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);

  const academicYear = searchParams.get('academicYear');
  const term = searchParams.get('term'); // This will be a string from TermPeriod enum
  const classId = searchParams.get('classId');
  const studentIdParam = searchParams.get('studentId'); // Can be specific ID or "all"

  // Basic validation of query parameters
  if (!academicYear || !term || !classId || !studentIdParam) {
    return NextResponse.json({ error: "Missing required query parameters: academicYear, term, classId, studentId." }, { status: 400 });
  }
  if (!Object.values(TermPeriod).includes(term)) {
    return NextResponse.json({ error: "Invalid term provided." }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden: Not authorized for this school." }, { status: 403 });
    }

    // 1. Fetch School Details and Active Grade Scale
    const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true }
    });
    if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

    const activeGradeScale = await prisma.gradeScale.findFirst({
        where: { schoolId: schoolId, isActive: true },
        include: { entries: { orderBy: { minPercentage: 'desc' } } } // Get entries sorted
    });
    if (!activeGradeScale || activeGradeScale.entries.length === 0) {
        return NextResponse.json({ error: "No active grade scale with entries found for this school. Please configure grading scales." }, { status: 400 });
    }

    // 2. Fetch Target Student(s)
    let targetStudents = [];
    if (studentIdParam === "all") {
      targetStudents = await prisma.student.findMany({
        where: { schoolId: schoolId, currentClassId: classId, isActive: true },
        select: { id: true, firstName: true, lastName: true, middleName: true, studentIdNumber: true, profilePictureUrl: true },
        orderBy: [{lastName: 'asc'}, {firstName: 'asc'}]
      });
    } else {
      const student = await prisma.student.findFirst({
        where: { id: studentIdParam, schoolId: schoolId, currentClassId: classId, isActive: true },
        select: { id: true, firstName: true, lastName: true, middleName: true, studentIdNumber: true, profilePictureUrl: true }
      });
      if (student) targetStudents.push(student);
    }

    if (targetStudents.length === 0) {
      return NextResponse.json({ error: "No active students found matching the criteria." }, { status: 404 });
    }

    // 3. Fetch Assessments for the selected class, year, and term
    const assessmentsInTerm = await prisma.assessment.findMany({
        where: {
            schoolId: schoolId,
            classId: classId,
            academicYear: academicYear,
            term: term,
        },
        select: {
            id: true,
            name: true, // Assessment name
            subjectId: true,
            subject: { select: { name: true } }, // Subject name
            maxMarks: true,
        }
    });

    if (assessmentsInTerm.length === 0) {
        return NextResponse.json({ reportCards: [], message: "No assessments found for the selected criteria. Cannot generate reports." }, { status: 200 });
    }

    const reportCards = [];

    // 4. For each student, process their marks
    for (const student of targetStudents) {
      const studentMarks = await prisma.studentMark.findMany({
        where: {
          studentId: student.id,
          assessmentId: { in: assessmentsInTerm.map(a => a.id) }
        },
        select: {
          assessmentId: true,
          marksObtained: true,
          remarks: true // Student-specific remarks for an assessment
        }
      });

      const marksByAssessmentId = studentMarks.reduce((acc, mark) => {
        acc[mark.assessmentId] = mark;
        return acc;
      }, {});

      let overallTotalMarksObtained = 0;
      let overallTotalMaxMarks = 0;
      let subjectDetails = {};

      assessmentsInTerm.forEach(assessment => {
        if (!subjectDetails[assessment.subjectId]) {
          subjectDetails[assessment.subjectId] = {
            subjectName: assessment.subject.name,
            assessments: [],
            totalMarksObtained: 0,
            totalMaxMarks: 0,
            percentage: 0,
            gradeLetter: "N/G",
            gradePoint: null,
            remark: "Not Graded"
          };
        }
        
        const markEntry = marksByAssessmentId[assessment.id];
        const marksObtained = markEntry?.marksObtained ?? null; // Use null if not marked

        subjectDetails[assessment.subjectId].assessments.push({
            assessmentName: assessment.name,
            maxMarks: assessment.maxMarks,
            marksObtained: marksObtained,
        });

        if (marksObtained !== null) {
            subjectDetails[assessment.subjectId].totalMarksObtained += marksObtained;
            overallTotalMarksObtained += marksObtained;
        }
        subjectDetails[assessment.subjectId].totalMaxMarks += assessment.maxMarks;
        overallTotalMaxMarks += assessment.maxMarks;
      });

      const processedSubjects = Object.values(subjectDetails).map(subj => {
        const percentage = subj.totalMaxMarks > 0 ? (subj.totalMarksObtained / subj.totalMaxMarks) * 100 : 0;
        const gradeInfo = getGradeDetails(percentage, activeGradeScale.entries);
        return { ...subj, percentage: parseFloat(percentage.toFixed(2)), ...gradeInfo };
      });
      
      const overallPercentage = overallTotalMaxMarks > 0 ? (overallTotalMarksObtained / overallTotalMaxMarks) * 100 : 0;
      const overallGradeInfo = getGradeDetails(overallPercentage, activeGradeScale.entries);
      
      const validGradePoints = processedSubjects.map(s => s.gradePoint).filter(gp => gp !== null);
      const termGPA = validGradePoints.length > 0 
                      ? parseFloat((validGradePoints.reduce((sum, gp) => sum + gp, 0) / validGradePoints.length).toFixed(2))
                      : null;

      reportCards.push({
        student: student,
        schoolName: school.name,
        academicYear: academicYear,
        term: term.replace("_", " "),
        subjects: processedSubjects,
        overall: {
          totalMarksObtained: overallTotalMarksObtained,
          totalMaxMarks: overallTotalMaxMarks,
          percentage: parseFloat(overallPercentage.toFixed(2)),
          gradeLetter: overallGradeInfo.gradeLetter,
          gradePoint: overallGradeInfo.gradePoint, // This is based on overall percentage, not average of GPAs
          termGPA: termGPA, // Average of subject GPAs
          remark: overallGradeInfo.remark,
        },
        // Placeholders for other report card elements
        homeroomTeacherComment: "Overall performance has been satisfactory. Keep up the good work!",
        principalComment: "A commendable effort this term.",
        attendanceSummary: { daysPresent: 90, daysAbsent: 5, totalSchoolDays: 95 } // Example
      });
    }

    return NextResponse.json({ reportCards }, { status: 200 });

  } catch (error) {
    console.error("Error generating report card(s):", error);
    return NextResponse.json({ error: "Failed to generate report card(s) due to a server error." }, { status: 500 });
  }
}