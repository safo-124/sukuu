// File: app/api/schooladmin/[schoolId]/students/[studentId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateStudentSchema } from "@/lib/validators/studentValidators"; // Use the update schema

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
    if (!userId || !schoolId) return false;
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
        where: { userId: userId, schoolId: schoolId }
    });
    return !!schoolAdminAssignment;
}

// GET handler for fetching a single student (can be added here for view/edit page prefill)
export async function GET(req, { params }) {
  const { schoolId, studentId } = params;
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

    const student = await prisma.student.findFirst({
      where: { id: studentId, schoolId: schoolId }, // Ensure student belongs to the school
      include: { currentClass: {select: {id: true, name: true, section: true}} } // Include class for prefill
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json(student, { status: 200 });
  } catch (error) {
    console.error(`Error fetching student ${studentId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch student details." }, { status: 500 });
  }
}


// PUT handler to update student details
export async function PUT(req, { params }) {
  const { schoolId, studentId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (!authorizedSchoolAdmin) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to update students for this school." }, { status: 403 });
    }

    const studentToUpdate = await prisma.student.findFirst({
        where: { id: studentId, schoolId: schoolId }
    });
    if (!studentToUpdate) {
        return NextResponse.json({ error: "Student not found in this school." }, { status: 404 });
    }

    const requestBody = await req.json();
    
    // Clean optional empty strings to undefined for Zod .optional() to work correctly.
    // Or, for fields that should become NULL in DB if empty, convert to null.
    const dataToValidate = { ...requestBody };
    for (const key in dataToValidate) {
        if (dataToValidate[key] === "") {
            // For optional text fields, Zod's .optional().or(z.literal('')) handles empty strings
            // If schema expects undefined for optional, then: dataToValidate[key] = undefined;
            // If schema expects null and field is nullable in DB: dataToValidate[key] = null;
            // For currentClassId, an empty string from form means "no class" -> null
            if (key === 'currentClassId') dataToValidate[key] = null;
            // For other optional strings, Zod's .optional().or(z.literal('')) handles ""
        }
    }
    // Dates come as strings YYYY-MM-DD, Prisma handles conversion if schema expects DateTime

    const validationResult = updateStudentSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("Student Update Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    
    // Prepare data for Prisma update, converting dates if necessary
    const updateData = { ...data };
    if (data.dateOfBirth) updateData.dateOfBirth = new Date(data.dateOfBirth);
    if (data.enrollmentDate) updateData.enrollmentDate = new Date(data.enrollmentDate);
    
    // Prevent studentIdNumber from being changed if it's not allowed
    if (updateData.studentIdNumber && updateData.studentIdNumber !== studentToUpdate.studentIdNumber) {
        // Check uniqueness if it's being changed
        const existingStudentByIdNumber = await prisma.student.findUnique({
          where: { schoolId_studentIdNumber: { schoolId, studentIdNumber: updateData.studentIdNumber } }
        });
        if (existingStudentByIdNumber) {
          return NextResponse.json(
            { error: "Another student with this ID number already exists in this school.", fieldErrors: { studentIdNumber: ["This ID number is already in use."] }},
            { status: 409 }
          );
        }
    } else if (updateData.studentIdNumber === undefined && studentToUpdate.studentIdNumber) {
        // If schema makes studentIdNumber optional, and it's not sent, Prisma won't update it.
        // If it's sent as "" or null and you want to disallow clearing it, add specific check.
        // For now, updateStudentSchema makes it optional. If form submits it, it's updated.
    }


    if (data.currentClassId === null || data.currentClassId === "" || data.currentClassId === undefined) {
        updateData.currentClassId = null;
    } else {
        // Verify class exists in this school
        const classExists = await prisma.class.findFirst({where: {id: data.currentClassId, schoolId: schoolId}});
        if (!classExists) {
            return NextResponse.json({ error: "Selected class is invalid for this school.", fieldErrors: {currentClassId: ["Invalid class."]} }, { status: 400 });
        }
        updateData.currentClassId = data.currentClassId;
    }


    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: updateData,
    });

    return NextResponse.json(
      { message: `Student "${updatedStudent.firstName} ${updatedStudent.lastName}" updated successfully.`, student: updatedStudent },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating student ${studentId} in school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Student not found for update." }, { status: 404 });
    }
     if (error.code === 'P2002' && error.meta?.target?.includes('studentIdNumber')) {
      return NextResponse.json(
        { error: "A student with this ID number already exists.", fieldErrors: { studentIdNumber: ["This ID number is already in use by another student."] }},
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to update student details." }, { status: 500 });
  }
}

// DELETE handler (from previous step, ensure it's here)
export async function DELETE(req, { params }) {
  const { schoolId, studentId } = params;
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
    const studentToDelete = await prisma.student.findFirst({
        where: { id: studentId, schoolId: schoolId },
        select: { firstName: true, lastName: true }
    });
    if (!studentToDelete) {
        return NextResponse.json({ error: "Student not found in this school." }, { status: 404 });
    }
    await prisma.student.delete({ where: { id: studentId } });
    const studentName = `${studentToDelete.firstName} ${studentToDelete.lastName}`;
    return NextResponse.json({ message: `Student "${studentName}" permanently deleted.` }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting student ${studentId} from school ${schoolId}:`, error);
    if (error.code === 'P2025') { return NextResponse.json({ error: "Student not found." }, { status: 404 }); }
    if (error.code === 'P2003') { return NextResponse.json({ error: "Cannot delete student due to related records." }, { status: 409 }); }
    return NextResponse.json({ error: "Failed to delete student." }, { status: 500 });
  }
}