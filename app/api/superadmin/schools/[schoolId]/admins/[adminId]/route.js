// File: app/api/superadmin/schools/[schoolId]/admins/[adminId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path
import prisma from "@/lib/prisma";

// DELETE a specific SchoolAdmin link by its own ID, scoped by schoolId for safety
export async function DELETE(req, { params }) {
  const { schoolId, adminId } = params; // adminId here is the ID of the SchoolAdmin record

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the SchoolAdmin record exists and belongs to the specified school
    const schoolAdminToDelete = await prisma.schoolAdmin.findUnique({
      where: {
        id: adminId,
        schoolId: schoolId, // Ensure it's for the correct school
      },
      include: {
        user: { select: { firstName: true, lastName: true } }, // For the success message
        school: { select: { name: true } }
      }
    });

    if (!schoolAdminToDelete) {
      return NextResponse.json({ error: "School Administrator assignment not found or does not belong to this school." }, { status: 404 });
    }

    // Delete the SchoolAdmin record (this unassigns the user as admin for this school)
    await prisma.schoolAdmin.delete({
      where: {
        id: adminId,
      },
    });

    const adminName = `${schoolAdminToDelete.user.firstName} ${schoolAdminToDelete.user.lastName}`;
    const schoolName = schoolAdminToDelete.school.name;

    return NextResponse.json({ message: `Administrator ${adminName} successfully removed from ${schoolName}.` }, { status: 200 });

  } catch (error) {
    console.error(`Error removing school admin ${adminId} from school ${schoolId}:`, error);
    if (error.code === 'P2025') { // Record to delete not found by prisma.schoolAdmin.delete
        return NextResponse.json({ error: "School Administrator assignment not found for deletion." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to remove school administrator. An unexpected error occurred." }, { status: 500 });
  }
}