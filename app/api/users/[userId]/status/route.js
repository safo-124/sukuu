// File: app/api/users/[userId]/status/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";
import * as z from "zod";

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

// Helper function to check if the logged-in user is an authorized admin for the school of the target user (if target is teacher/student)
async function isAuthorizedToModifyUser(modifierUserId, modifierRole, targetUserId, targetUserSchoolId) {
  if (modifierRole === 'SUPER_ADMIN') {
    return true; // Super Admins can modify any user status (with caution)
  }

  if (modifierRole === 'SCHOOL_ADMIN' && targetUserSchoolId) {
    // Check if the School Admin is an admin of the target user's school
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
        where: { userId: modifierUserId, schoolId: targetUserSchoolId }
    });
    if (schoolAdminAssignment) {
        // Check if the targetUser is a teacher or student in that school
        const teacherInSchool = await prisma.teacher.findFirst({ where: { userId: targetUserId, schoolId: targetUserSchoolId }});
        const studentInSchool = await prisma.student.findFirst({ where: { userId: targetUserId, schoolId: targetUserSchoolId }}); // Assuming Student has userId link
        return !!teacherInSchool || !!studentInSchool;
    }
  }
  return false;
}


export async function PUT(req, { params }) {
  const { userId: targetUserId } = params; // ID of the user whose status is being changed

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const modifierUserId = session.user.id;
    const modifierRole = session.user.role;

    const requestBody = await req.json();
    const validationResult = updateUserStatusSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed. 'isActive' must be a boolean.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { isActive } = validationResult.data;

    // Fetch the target user to check their current school (if they are a teacher/student) for authorization
    const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        include: { 
            teacherLinks: { select: { schoolId: true } }, // Get schoolId if they are a teacher
            studentLink: { select: { schoolId: true } },  // Get schoolId if they are a student
        }
    });

    if (!targetUser) {
        return NextResponse.json({ error: "User to modify not found." }, { status: 404 });
    }
    
    // Determine target user's school if applicable for auth check
    let targetUserSchoolId = null;
    if (targetUser.teacherLinks && targetUser.teacherLinks.length > 0) {
        targetUserSchoolId = targetUser.teacherLinks[0].schoolId; // Assuming one school per teacher for this check
    } else if (targetUser.studentLink) {
        targetUserSchoolId = targetUser.studentLink.schoolId;
    }


    // Authorization check
    const authorized = await isAuthorizedToModifyUser(modifierUserId, modifierRole, targetUserId, targetUserSchoolId);
    if (!authorized) {
         return NextResponse.json({ error: "Forbidden: You do not have permission to modify this user's status." }, { status: 403 });
    }

    // Prevent deactivating oneself if not a SUPER_ADMIN
    if (targetUserId === modifierUserId && modifierRole !== 'SUPER_ADMIN' && !isActive) {
        return NextResponse.json({ error: "Forbidden: You cannot deactivate your own account." }, { status: 403 });
    }


    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, firstName: true, lastName: true, email: true, isActive: true, role: true } // Select fields to return
    });

    return NextResponse.json(
      { message: `User "${updatedUser.firstName} ${updatedUser.lastName}" status set to ${isActive ? 'Active' : 'Inactive'}.`, user: updatedUser },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating user ${targetUserId} status:`, error);
    if (error.code === 'P2025') { // Record to update not found
        return NextResponse.json({ error: "User not found for status update." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user status." }, { status: 500 });
  }
}