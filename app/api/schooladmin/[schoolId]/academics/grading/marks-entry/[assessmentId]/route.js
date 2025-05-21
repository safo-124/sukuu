// File: app/api/schooladmin/[schoolId]/academics/grading/marks-entry/[assessmentId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { bulkStudentMarksSchema } from "@/lib/validators/studentMarkValidators"; // Use the batch schema

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// POST handler to save or update a batch of student marks for an assessment
export async function POST(req, { params }) {
  const { schoolId, assessmentId } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Authorization: School Admin for this school or Super Admin
    // Teachers will need a different authorization check if they use this API
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden: Not authorized for this school." }, { status: 403 });
    }

    // Fetch the assessment to verify it exists, belongs to the school, and to get maxMarks
    const assessment = await prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId: schoolId },
      select: { maxMarks: true, classId: true } // Also get classId to verify students
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found or does not belong to this school." }, { status: 404 });
    }

    const requestBody = await req.json();
    // The request body should match `bulkStudentMarksSchema` if we pass assessmentId in body
    // Or if assessmentId is from URL, body is just { marks: [...] }
    // Let's assume body is { marks: [...] } and add assessmentId from params for Zod
    const dataToValidate = {
        assessmentId: assessmentId, // assessmentId from URL params
        marks: requestBody.marks || [],
    };
    
    const validationResult = bulkStudentMarksSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("Bulk Marks Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the marks data.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { marks } = validationResult.data; // `assessmentId` is also in `validationResult.data` but already known

    // Further validation: check if marksObtained exceeds assessment.maxMarks
    const invalidMarks = marks.filter(mark => mark.marksObtained !== undefined && mark.marksObtained > assessment.maxMarks);
    if (invalidMarks.length > 0) {
        return NextResponse.json(
            { error: `Validation failed. Some marks exceed the maximum of ${assessment.maxMarks}.`, invalidEntries: invalidMarks.map(m => m.studentId) },
            { status: 400 }
        );
    }
    
    // Verify students belong to the class of the assessment
    const studentIdsInPayload = marks.map(m => m.studentId);
    const studentsInClass = await prisma.student.findMany({
        where: {
            id: { in: studentIdsInPayload },
            // Assuming students are directly in assessment.classId or we verify differently
            // This check ensures we only try to save marks for students who *could* take this assessment.
            // A simpler check is just to trust the studentId's provided, assuming form populates them correctly.
            // More robust: currentClassId: assessment.classId AND schoolId: schoolId
            schoolId: schoolId, // Basic check students belong to school
            currentClassId: assessment.classId // Crucial check: student is in the assessment's class
        },
        select: { id: true }
    });

    const validStudentIds = new Set(studentsInClass.map(s => s.id));
    const invalidStudentEntries = marks.filter(m => !validStudentIds.has(m.studentId));
    if (invalidStudentEntries.length > 0) {
        return NextResponse.json(
            { error: "Some students listed do not belong to the assessment's class or school.", invalidStudentIds: invalidStudentEntries.map(m => m.studentId) },
            { status: 400 }
        );
    }


    // Use a transaction to create/update marks
    const results = await prisma.$transaction(
      marks.map(mark =>
        prisma.studentMark.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: assessmentId,
              studentId: mark.studentId,
            },
          },
          update: {
            marksObtained: mark.marksObtained, // Can be null if Zod allows optional and it's undefined
            remarks: mark.remarks,          // Can be null
            recordedById: session.user.id,
          },
          create: {
            assessmentId: assessmentId,
            studentId: mark.studentId,
            marksObtained: mark.marksObtained,
            remarks: mark.remarks,
            recordedById: session.user.id,
            // gradeLetter can be added here if calculated or part of `mark`
          },
        })
      )
    );

    return NextResponse.json(
      { message: `${results.length} student marks saved/updated successfully.`, results },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error saving marks for assessment ${assessmentId} in school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to save marks. An unexpected error occurred." }, { status: 500 });
  }
}