// File: app/api/schooladmin/[schoolId]/academics/classes/[classId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateClassSchema } from "@/lib/validators/classValidators"; // Using new update schema

// Helper function
async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// GET handler to fetch a single class by its ID
export async function GET(req, { params }) {
  const { schoolId, classId } = params;
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

    const classDetails = await prisma.class.findUnique({
      where: { 
        id: classId,
        schoolId: schoolId // Ensure class belongs to the school
      },
      include: { // Include any related data needed to pre-fill the form
        homeroomTeacher: { select: { id: true, user: { select: { firstName: true, lastName: true }} } }
      }
    });

    if (!classDetails) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }
    return NextResponse.json(classDetails, { status: 200 });

  } catch (error) {
    console.error(`Error fetching class ${classId} for school ${schoolId}:`, error);
    return NextResponse.json({ error: "Failed to fetch class details." }, { status: 500 });
  }
}


// PUT handler to update a Class
export async function PUT(req, { params }) {
  const { schoolId, classId } = params;

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);

    if (!authorizedSchoolAdmin) {
      return NextResponse.json({ error: "Forbidden: You are not authorized to edit classes for this school." }, { status: 403 });
    }

    const classToUpdate = await prisma.class.findUnique({
        where: { id: classId, schoolId: schoolId }
    });
    if (!classToUpdate) {
        return NextResponse.json({ error: "Class not found or does not belong to this school." }, { status: 404 });
    }

    const requestBody = await req.json();
    
    // Clean fields: empty strings for optionals that can be cleared should become null
    const dataToValidate = { ...requestBody };
    if (dataToValidate.section === "") dataToValidate.section = null;
    if (dataToValidate.homeroomTeacherId === "") dataToValidate.homeroomTeacherId = null;

    const validationResult = updateClassSchema.safeParse(dataToValidate);

    if (!validationResult.success) {
      console.error("Class Update Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed. Please check the class details.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data; // Contains only fields defined in updateClassSchema

    // Prepare data for Prisma update, only including fields that were actually submitted and validated
    const updatePayload = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    // section can be set to null to clear it, or a new string value
    if (data.section !== undefined) updatePayload.section = data.section; // data.section can be null here
    // homeroomTeacherId can be set to null to clear it
    if (data.homeroomTeacherId !== undefined) updatePayload.homeroomTeacherId = data.homeroomTeacherId; // data.homeroomTeacherId can be null

    // AcademicYear is typically not updated. If it were, add it to updateClassSchema and here.

    // Check for duplicate class name + section within the same academic year (which is NOT being changed)
    if (data.name || data.section !== undefined) { // Only check if name or section is part of the update
        const newName = data.name || classToUpdate.name;
        const newSection = data.section !== undefined ? data.section : classToUpdate.section;

        const existingClass = await prisma.class.findFirst({
            where: {
            schoolId: schoolId,
            name: newName,
            section: newSection, // Prisma handles null for section correctly in unique checks
            academicYear: classToUpdate.academicYear, // Check against the original academic year
            NOT: { id: classId } // Exclude the current class being edited
            }
        });
        if (existingClass) {
            return NextResponse.json(
            { error: `A class named "${newName}${newSection ? ` (${newSection})` : ''}" already exists for academic year ${classToUpdate.academicYear}.`, 
                fieldErrors: { name: ["This class configuration already exists."], section: ["This class configuration already exists."] }
            }, { status: 409 });
        }
    }
    
    // Verify homeroomTeacherId if provided and changed
    if (data.homeroomTeacherId && data.homeroomTeacherId !== classToUpdate.homeroomTeacherId) {
        const teacherExistsInSchool = await prisma.teacher.findFirst({
            where: { id: data.homeroomTeacherId, schoolId: schoolId }
        });
        if (!teacherExistsInSchool) {
            return NextResponse.json(
                { error: "Selected homeroom teacher is invalid.", fieldErrors: { homeroomTeacherId: ["Invalid teacher selection."] }},
                { status: 400 }
            );
        }
    }


    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ message: "No changes provided.", class: classToUpdate }, { status: 200 });
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: updatePayload,
    });

    return NextResponse.json(
      { message: `Class "${updatedClass.name} ${updatedClass.section || ''}".trim() updated successfully.`, class: updatedClass },
      { status: 200 }
    );

  } catch (error) {
    console.error(`Error updating class ${classId} for school ${schoolId}:`, error);
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Class not found for update." }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "A unique constraint was violated during update." , detailedError: error.meta?.target }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update class. An unexpected error occurred." }, { status: 500 });
  }
}


// DELETE handler for classes (we created this previously for ClassesDataTable)
export async function DELETE(req, { params }) {
  const { schoolId, classId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (!authorizedSchoolAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const classToDelete = await prisma.class.findUnique({ where: { id: classId, schoolId: schoolId }, select: {name: true, section: true}});
    if (!classToDelete) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    // Add checks for related data (students enrolled, timetable entries) before deleting
    // For example, if students are enrolled:
    const studentEnrollments = await prisma.studentClassEnrollment.count({ where: { classId: classId }});
    // Or if using currentClassId on Student:
    // const studentsInClass = await prisma.student.count({ where: { currentClassId: classId }});
    if (studentEnrollments > 0 /* || studentsInClass > 0 */) {
        return NextResponse.json({ error: "Cannot delete class. Students are currently enrolled in it. Please reassign students first." }, { status: 409 });
    }
    // Add similar checks for timetable slots, etc.

    await prisma.class.delete({ where: { id: classId } });
    return NextResponse.json({ message: `Class "${classToDelete.name} ${classToDelete.section || ''}".trim() deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting class ${classId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Class not found" }, { status: 404 });
    if (error.code === 'P2003') return NextResponse.json({ error: "Cannot delete class due to existing relations (e.g., timetable entries). Please remove these first." }, { status: 409 });
    return NextResponse.json({ error: "Failed to delete class" }, { status: 500 });
  }
}