// File: app/api/schooladmin/[schoolId]/academics/assessments/[assessmentId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import { updateAssessmentSchema } from "@/lib/validators/assessmentValidators";

// Helper function to check authorization
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET handler to fetch a single Assessment by its ID
export async function GET(req, { params }) {
  const { schoolId, assessmentId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assessment = await prisma.assessment.findFirst({
      where: { 
        id: assessmentId,
        schoolId: schoolId
      },
      include: {
        class: { select: { id: true, name: true, section: true } },
        subject: { select: { id: true, name: true, code: true } },
      }
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found in this school." }, { status: 404 });
    }
    return NextResponse.json(assessment, { status: 200 });

  } catch (error) {
    console.error(`Error fetching assessment ${assessmentId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch assessment details." }, { status: 500 });
  }
}

// PUT handler to update an Assessment
export async function PUT(req, { params }) {
  const { schoolId, assessmentId } = params;
  console.log(`[API PUT Assessment] Update request for schoolId: ${schoolId}, assessmentId: ${assessmentId}`);

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("[API PUT Assessment] Unauthorized: No session found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`[API PUT Assessment] User: ${session.user.email}, Role: ${session.user.role}`);

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      console.error(`[API PUT Assessment] Forbidden: User ${session.user.email} not authorized for school ${schoolId}.`);
      return NextResponse.json({ error: "Forbidden: You are not authorized to edit assessments for this school." }, { status: 403 });
    }

    const assessmentToUpdate = await prisma.assessment.findFirst({
        where: { id: assessmentId, schoolId: schoolId }
    });
    if (!assessmentToUpdate) {
        console.error(`[API PUT Assessment] Assessment with ID ${assessmentId} not found in school ${schoolId}.`);
        return NextResponse.json({ error: "Assessment not found or does not belong to this school." }, { status: 404 });
    }
    console.log("[API PUT Assessment] Assessment to update found:", assessmentToUpdate);

    const requestBody = await req.json();
    console.log("[API PUT Assessment] Request body for update:", requestBody);
    const dataToValidate = { ...requestBody };
    
    if (dataToValidate.description === "") dataToValidate.description = null;
    if (dataToValidate.maxMarks && typeof dataToValidate.maxMarks === 'string') {
        const parsedMarks = parseFloat(dataToValidate.maxMarks);
        dataToValidate.maxMarks = isNaN(parsedMarks) ? undefined : parsedMarks;
    } else if (dataToValidate.maxMarks === "" || dataToValidate.maxMarks === null) {
        dataToValidate.maxMarks = undefined; 
    }
    if (dataToValidate.classId === "") dataToValidate.classId = undefined;
    if (dataToValidate.subjectId === "") dataToValidate.subjectId = undefined;
    if (dataToValidate.academicYear === "") dataToValidate.academicYear = undefined;
    if (dataToValidate.term === "") dataToValidate.term = undefined;

    const validationResult = updateAssessmentSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("[API PUT Assessment] Validation Errors:", JSON.stringify(validationResult.error.flatten().fieldErrors, null, 2));
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    console.log("[API PUT Assessment] Validated data for update:", data);
    const updatePayload = {};

    if ('name' in data) updatePayload.name = data.name;
    if ('maxMarks' in data) updatePayload.maxMarks = data.maxMarks; // Already parsed or undefined
    if ('assessmentDate' in data) updatePayload.assessmentDate = data.assessmentDate ? new Date(data.assessmentDate) : null;
    if ('description' in data) updatePayload.description = data.description;
    if ('classId' in data) updatePayload.classId = data.classId;
    if ('subjectId' in data) updatePayload.subjectId = data.subjectId;
    if ('academicYear' in data) updatePayload.academicYear = data.academicYear;
    if ('term' in data) updatePayload.term = data.term;

    console.log("[API PUT Assessment] Prepared updatePayload:", updatePayload);

    const needsUniquenessCheck = 
        ('name' in updatePayload && updatePayload.name !== assessmentToUpdate.name) || 
        ('classId' in updatePayload && updatePayload.classId !== assessmentToUpdate.classId) || 
        ('subjectId' in updatePayload && updatePayload.subjectId !== assessmentToUpdate.subjectId) || 
        ('academicYear' in updatePayload && updatePayload.academicYear !== assessmentToUpdate.academicYear) || 
        ('term' in updatePayload && updatePayload.term !== assessmentToUpdate.term);

    if (needsUniquenessCheck) {
        console.log("[API PUT Assessment] Performing uniqueness check...");
        const checkName = 'name' in updatePayload ? updatePayload.name : assessmentToUpdate.name;
        const checkClassId = 'classId' in updatePayload ? updatePayload.classId : assessmentToUpdate.classId;
        const checkSubjectId = 'subjectId' in updatePayload ? updatePayload.subjectId : assessmentToUpdate.subjectId;
        const checkAcademicYear = 'academicYear' in updatePayload ? updatePayload.academicYear : assessmentToUpdate.academicYear;
        const checkTerm = 'term' in updatePayload ? updatePayload.term : assessmentToUpdate.term;
        
        console.log("[API PUT Assessment] Uniqueness check values:", { checkName, checkClassId, checkSubjectId, checkAcademicYear, checkTerm });

        if (checkClassId && checkSubjectId && checkAcademicYear && checkTerm && checkName) {
            // *** CORRECTED Prisma Query for findFirst ***
            const existingAssessment = await prisma.assessment.findFirst({
                where: {
                    classId: checkClassId,
                    subjectId: checkSubjectId,
                    academicYear: checkAcademicYear,
                    term: checkTerm,
                    name: checkName,
                    NOT: { id: assessmentId }
                }
            });

            if (existingAssessment) {
                console.error("[API PUT Assessment] Uniqueness constraint violation found on check:", existingAssessment);
                return NextResponse.json({ error: "This exact assessment configuration (name, class, subject, year, term) already exists.", fieldErrors: {name: ["Configuration conflict."]} }, { status: 409 });
            }
            console.log("[API PUT Assessment] Uniqueness check passed.");
        } else {
            console.warn("[API PUT Assessment] One or more key fields for uniqueness check is undefined/null during update check.", 
                         { checkName, checkClassId, checkSubjectId, checkAcademicYear, checkTerm });
        }
    }
    
    if (updatePayload.classId && updatePayload.classId !== assessmentToUpdate.classId) {
        const classInSchool = await prisma.class.findFirst({ where: { id: updatePayload.classId, schoolId: schoolId }});
        if (!classInSchool) return NextResponse.json({ error: "Selected class not found in this school.", fieldErrors: { classId: ["Invalid class."] }}, { status: 400 });
    }
    if (updatePayload.subjectId && updatePayload.subjectId !== assessmentToUpdate.subjectId) {
        const subjectInSchool = await prisma.subject.findFirst({ where: { id: updatePayload.subjectId, schoolId: schoolId }});
        if (!subjectInSchool) return NextResponse.json({ error: "Selected subject not found in this school.", fieldErrors: { subjectId: ["Invalid subject."] }}, { status: 400 });
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log("[API PUT Assessment] No valid changes detected to update after processing.");
      return NextResponse.json({ message: "No valid changes detected to update.", assessment: assessmentToUpdate }, { status: 200 });
    }

    console.log("[API PUT Assessment] Updating assessment in DB with payload:", updatePayload);
    const updatedAssessment = await prisma.assessment.update({
      where: { id: assessmentId },
      data: updatePayload,
    });
    console.log("[API PUT Assessment] Assessment updated successfully:", updatedAssessment);

    return NextResponse.json(
      { message: `Assessment "${updatedAssessment.name}" updated successfully.`, assessment: updatedAssessment },
      { status: 200 }
    );

  } catch (error) {
    console.error(`[API PUT Assessment] Critical error for assessment ${assessmentId}, school ${schoolId}:`, error);
    console.error("[API PUT Assessment] Full error object:", JSON.stringify(error, null, 2));
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Assessment not found for update." }, { status: 404 });
    }
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      let fieldErrorMsg = "A unique constraint was violated during update.";
      // Check if the target matches the fields in your unique_assessment_definition constraint
      if (target.includes('classId') && target.includes('subjectId') && target.includes('academicYear') && target.includes('term') && target.includes('name')) {
        fieldErrorMsg = "This assessment (name, class, subject, year, term combination) already exists.";
      }
      return NextResponse.json({ error: fieldErrorMsg, detailedError: error.meta?.target }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update assessment details.", detailedError: error.message }, { status: 500 });
  }
}

// DELETE handler for an Assessment
export async function DELETE(req, { params }) {
  const { schoolId, assessmentId } = params;
  console.log(`[API DELETE Assessment] Received delete request for schoolId: ${schoolId}, assessmentId: ${assessmentId}`);
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.error("[API DELETE Assessment] Unauthorized: No session found.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (!authorizedSchoolAdmin) {
      console.error(`[API DELETE Assessment] Forbidden: User ${session.user.email} not authorized for school ${schoolId}.`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const assessmentToDelete = await prisma.assessment.findUnique({
        where: { 
            id: assessmentId, 
            schoolId: schoolId // Ensure it belongs to the school before deleting
        },
        select: { name: true }
    });
    if (!assessmentToDelete) {
        console.error(`[API DELETE Assessment] Assessment with ID ${assessmentId} not found in school ${schoolId}.`);
        return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }
    
    console.log(`[API DELETE Assessment] Deleting assessment "${assessmentToDelete.name}" (ID: ${assessmentId}).`);
    // onDelete: Cascade on Assessment.studentMarks will delete associated marks
    await prisma.assessment.delete({ where: { id: assessmentId } });
    console.log(`[API DELETE Assessment] Assessment "${assessmentToDelete.name}" deleted successfully.`);

    return NextResponse.json({ message: `Assessment "${assessmentToDelete.name}" and all associated marks deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`[API DELETE Assessment] Critical error for assessment ${assessmentId}:`, error);
    console.error("[API DELETE Assessment] Full error object:", JSON.stringify(error, null, 2));
    if (error.code === 'P2025') { 
        return NextResponse.json({ error: "Assessment not found for deletion." }, { status: 404 });
    }
    if (error.code === 'P2003') { 
        return NextResponse.json({ error: "Cannot delete assessment due to existing relations that prevent deletion." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to delete assessment." }, { status: 500 });
  }
}