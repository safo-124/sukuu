// File: app/api/schooladmin/[schoolId]/staff/teachers/[teacherId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
    if (!userId || !schoolId) return false;
    const schoolAdminAssignment = await prisma.schoolAdmin.findFirst({
        where: { userId: userId, schoolId: schoolId }
    });
    return !!schoolAdminAssignment;
}

// DELETE a Teacher record (and associated User due to cascade)
export async function DELETE(req, { params }) {
  const { schoolId, teacherId } = params; // teacherId is the ID of the Teacher record

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
        return NextResponse.json({ error: "Forbidden: You are not authorized to manage teachers for this school." }, { status: 403 });
    }

    // Find the teacher record to ensure it exists and to get user details for message
    const teacherToDelete = await prisma.teacher.findUnique({
      where: { 
        id: teacherId,
        schoolId: schoolId // Ensure teacher belongs to the specified school
      },
      include: {
        user: { select: { firstName: true, lastName: true, id: true } }
      }
    });

    if (!teacherToDelete) {
      return NextResponse.json({ error: "Teacher profile not found in this school." }, { status: 404 });
    }

    // Due to `onDelete: Cascade` on `Teacher.user User @relation(fields: [userId], references: [id], onDelete: Cascade)`,
    // deleting the Teacher record will also attempt to delete the User record.
    // If the User has other relations that restrict deletion (e.g., is also a Parent, or SchoolAdmin for another school without cascade),
    // this could fail. This is a complex area depending on your desired data integrity rules.
    // A safer approach for "removing a teacher" might be to only delete the Teacher record and deactivate the User,
    // which would require changing onDelete rule on Teacher.user.
    // For now, proceeding with delete based on current schema's cascade:
    
    await prisma.teacher.delete({
      where: { id: teacherId },
    });
    
    // If onDelete: Cascade is on Teacher.user, the user record is also deleted.
    // If you didn't want to delete the User, you'd first nullify Teacher.userId or change schema.

    const teacherName = `${teacherToDelete.user.firstName} ${teacherToDelete.user.lastName}`;
    return NextResponse.json({ message: `Teacher profile for "${teacherName}" (and associated user account) deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting teacher ${teacherId} from school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found
        return NextResponse.json({ error: "Teacher profile not found for deletion." }, { status: 404 });
    }
    // P2003: Foreign key constraint failed (e.g., teacher assigned as homeroom, and Class.homeroomTeacherId is Restrict)
    if (error.code === 'P2003') {
        return NextResponse.json({ error: "Cannot delete teacher. They have related records (e.g., assigned as homeroom teacher to a class that restricts deletion). Please reassign or remove these assignments first." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to delete teacher profile." }, { status: 500 });
  }
}

// GET and PUT handlers for individual teacher details would go here later for edit/view
// export async function GET(req, { params }) { ... }
// export async function PUT(req, { params }) { ... } // For editing Teacher model specific fields