// File: app/api/schooladmin/[schoolId]/staff/teachers/[teacherId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs"; // For password hashing if password is changed
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateTeacherSchema } from "@/lib/validators/teacherValidators"; // Use the update schema

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET handler for fetching a single teacher (for pre-filling edit form or view page)
export async function GET(req, { params }) {
  const { schoolId, teacherId } = params;
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

    const teacher = await prisma.teacher.findFirst({
      where: { id: teacherId, schoolId: schoolId },
      include: {
        user: {
          select: { // Select specific user fields to avoid sending sensitive data like hashedPassword
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profilePicture: true,
            isActive: true,
            role: true, // Should be TEACHER
          }
        }
      }
    });

    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found in this school." }, { status: 404 });
    }
    return NextResponse.json(teacher, { status: 200 });

  } catch (error) {
    console.error(`Error fetching teacher ${teacherId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch teacher details." }, { status: 500 });
  }
}


// PUT handler to update Teacher (User + Teacher record)
export async function PUT(req, { params }) {
  const { schoolId, teacherId } = params; // teacherId is the ID of the Teacher record

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to edit teachers for this school." }, { status: 403 });
    }

    const teacherRecord = await prisma.teacher.findUnique({
        where: { id: teacherId, schoolId: schoolId },
        include: { user: true } // Need user to get userId for updates
    });

    if (!teacherRecord) {
        return NextResponse.json({ error: "Teacher not found or does not belong to this school." }, { status: 404 });
    }
    const userId = teacherRecord.user.id; // Get the associated User ID

    const requestBody = await req.json();
    const fieldsToClean = ['phoneNumber', 'profilePictureUrl', 'teacherIdNumber', 'dateOfJoining', 'qualifications', 'specialization', 'password', 'confirmPassword'];
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') requestBody[field] = undefined;
    });

    // Email is typically not updatable or handled via a separate verification process.
    // We omit it from the schema used for update if the form disables it.
    const validationResult = updateTeacherSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("Teacher Update Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the teacher's details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Prepare data for User update
    const userDataToUpdate = {};
    if (data.firstName) userDataToUpdate.firstName = data.firstName;
    if (data.lastName) userDataToUpdate.lastName = data.lastName;
    if (data.phoneNumber !== undefined) userDataToUpdate.phoneNumber = data.phoneNumber || null; // Allow clearing
    if (data.profilePictureUrl !== undefined) userDataToUpdate.profilePicture = data.profilePictureUrl || null; // Allow clearing

    // Handle password change
    if (data.password && data.password === data.confirmPassword) { // Zod schema's superRefine already ensures this if both provided
      userDataToUpdate.hashedPassword = await bcrypt.hash(data.password, 10);
    } else if (data.password && data.password !== data.confirmPassword) {
      // This case should be caught by Zod's superRefine on updateTeacherSchema.
      // If it reaches here, it means client-side validation might have been bypassed or schema isn't strict enough.
      return NextResponse.json({ error: "Passwords do not match.", fieldErrors: { confirmPassword: ["Passwords do not match."]}}, { status: 400 });
    }


    // Prepare data for Teacher update
    const teacherDataToUpdate = {};
    if (data.teacherIdNumber && data.teacherIdNumber !== teacherRecord.teacherIdNumber) {
        // Check uniqueness if teacherIdNumber is being changed
        const existingTeacherByIdNumber = await prisma.teacher.findUnique({
            where: { schoolId_teacherIdNumber: { schoolId, teacherIdNumber: data.teacherIdNumber } }
        });
        if (existingTeacherByIdNumber) {
            return NextResponse.json(
            { error: "Another teacher with this ID number already exists in this school.", fieldErrors: { teacherIdNumber: ["This ID number is already in use."] }},
            { status: 409 }
            );
        }
        teacherDataToUpdate.teacherIdNumber = data.teacherIdNumber;
    } else if (data.teacherIdNumber !== undefined) { // Handles if it's present but not changed, or cleared
        teacherDataToUpdate.teacherIdNumber = data.teacherIdNumber || null;
    }

    if (data.dateOfJoining !== undefined) teacherDataToUpdate.dateOfJoining = data.dateOfJoining ? new Date(data.dateOfJoining) : null;
    if (data.qualifications !== undefined) teacherDataToUpdate.qualifications = data.qualifications || null;
    if (data.specialization !== undefined) teacherDataToUpdate.specialization = data.specialization || null;

    const updatedTeacherAndUser = await prisma.$transaction(async (tx) => {
      if (Object.keys(userDataToUpdate).length > 0) {
        await tx.user.update({
          where: { id: userId },
          data: userDataToUpdate,
        });
      }
      let updatedTeacherProfile;
      if (Object.keys(teacherDataToUpdate).length > 0) {
        updatedTeacherProfile = await tx.teacher.update({
          where: { id: teacherId },
          data: teacherDataToUpdate,
        });
      } else {
        updatedTeacherProfile = teacherRecord; // No teacher-specific fields changed
      }
      
      // Fetch the final state to return consistent data
      const finalTeacherData = await tx.teacher.findUnique({
          where: {id: teacherId},
          include: {user: {select: {id:true, firstName:true, lastName:true, email:true, isActive:true, role: true, phoneNumber:true, profilePicture:true}}}
      })
      return finalTeacherData;
    });

    return NextResponse.json(
      { message: `Teacher ${updatedTeacherAndUser.user.firstName} ${updatedTeacherAndUser.user.lastName} updated successfully.`, teacher: updatedTeacherAndUser },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating teacher ${teacherId} for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Teacher not found for update." }, { status: 404 });
    }
    if (error.code === 'P2002') {
         return NextResponse.json({ error: "A unique constraint was violated (e.g., Teacher ID already exists).", detailedError: error.meta?.target }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update teacher details.", detailedError: error.message }, { status: 500 });
  }
}


// DELETE handler (from previous step, ensure it's here and correct)
export async function DELETE(req, { params }) {
  // ... (existing DELETE logic from previous response) ...
  const { schoolId, teacherId } = params;
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
    const teacherToDelete = await prisma.teacher.findUnique({
        where: { id: teacherId, schoolId: schoolId },
        include: { user: { select: { firstName: true, lastName: true } } }
    });
    if (!teacherToDelete) {
        return NextResponse.json({ error: "Teacher profile not found in this school." }, { status: 404 });
    }
    
    // This will also delete the User record due to onDelete: Cascade on Teacher.user
    await prisma.teacher.delete({ where: { id: teacherId } });
    
    const teacherName = `${teacherToDelete.user.firstName} ${teacherToDelete.user.lastName}`;
    return NextResponse.json({ message: `Teacher profile for "${teacherName}" deleted successfully.` }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting teacher ${teacherId} from school ${schoolId}:`, error);
    if (error.code === 'P2025') { return NextResponse.json({ error: "Teacher profile not found." }, { status: 404 }); }
    if (error.code === 'P2003') { return NextResponse.json({ error: "Cannot delete teacher. They have related records (e.g., assigned to classes)." }, { status: 409 }); }
    return NextResponse.json({ error: "Failed to delete teacher profile." }, { status: 500 });
  }
}