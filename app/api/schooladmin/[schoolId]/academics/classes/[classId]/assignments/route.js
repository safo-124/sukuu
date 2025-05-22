// File: app/api/schooladmin/[schoolId]/academics/classes/[classId]/assignments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust this path
import prisma from "@/lib/prisma";
import { createClassSubjectAssignmentSchema } from "@/lib/validators/classSubjectAssignmentValidators"; // Adjust path

// Helper function for authorization
async function authorizeAndGetClass(userId, userRole, schoolId, classId) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  let authorizedSchoolAdmin = isSuperAdmin;

  if (!isSuperAdmin && userId) {
    const assignment = await prisma.schoolAdmin.findFirst({
        where: { userId: userId, schoolId: schoolId }
    });
    authorizedSchoolAdmin = !!assignment;
  }
  if (!authorizedSchoolAdmin) {
    return { error: "Forbidden: Not authorized for this school.", status: 403, classData: null };
  }

  const classData = await prisma.class.findFirst({
    where: { id: classId, schoolId: schoolId },
    select: { id: true, academicYear: true, schoolId: true } // Select needed fields
  });

  if (!classData) {
    return { error: "Class not found in this school.", status: 404, classData: null };
  }
  return { error: null, status: 200, classData };
}

// GET: List all ClassSubjectAssignments for a specific Class
export async function GET(req, { params }) {
  const { schoolId, classId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAndGetClass(session.user.id, session.user.role, schoolId, classId);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const assignments = await prisma.classSubjectAssignment.findMany({
      where: { classId: classId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id:true, firstName: true, lastName: true } } } },
      },
      orderBy: { subject: { name: 'asc' } },
    });
    return NextResponse.json(assignments, { status: 200 });

  } catch (error) {
    console.error(`Error fetching subject assignments for class ${classId}:`, error);
    return NextResponse.json({ error: "Failed to fetch subject assignments." }, { status: 500 });
  }
}

// POST: Create a new ClassSubjectAssignment for a Class
export async function POST(req, { params }) {
  const { schoolId, classId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAndGetClass(session.user.id, session.user.role, schoolId, classId);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const classDataForAssignment = authResult.classData;

    const requestBody = await req.json();
    // Clean optional fields (teacherId for now)
    const dataToValidate = { 
        ...requestBody, 
        classId: classId, // Add classId from params for validation context
        academicYear: classDataForAssignment.academicYear, // Use the class's academic year
    };
    if (dataToValidate.teacherId === "") dataToValidate.teacherId = undefined;


    const validationResult = createClassSubjectAssignmentSchema.safeParse(dataToValidate);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { subjectId, teacherId } = validationResult.data; // academicYear comes from classDataForAssignment

    // Verify subjectId belongs to the school
    const subjectExists = await prisma.subject.findFirst({ where: { id: subjectId, schoolId: schoolId }});
    if (!subjectExists) {
        return NextResponse.json({ error: "Selected subject not found in this school.", fieldErrors: { subjectId: ["Invalid subject."] }}, { status: 400 });
    }
    // Verify teacherId (if provided) belongs to the school
    if (teacherId) {
        const teacherExists = await prisma.teacher.findFirst({ where: { id: teacherId, schoolId: schoolId }});
        if (!teacherExists) {
            return NextResponse.json({ error: "Selected teacher not found in this school.", fieldErrors: { teacherId: ["Invalid teacher."] }}, { status: 400 });
        }
    }

    // Check for existing unique assignment (classId, subjectId, academicYear)
    const existingAssignment = await prisma.classSubjectAssignment.findUnique({
        where: {
            classId_subjectId_academicYear: {
                classId: classId,
                subjectId: subjectId,
                academicYear: classDataForAssignment.academicYear,
            }
        }
    });
    if (existingAssignment) {
        return NextResponse.json({ error: "This subject is already assigned to this class for this academic year.", fieldErrors: { subjectId: ["Subject already assigned."]}}, { status: 409 });
    }

    const newAssignment = await prisma.classSubjectAssignment.create({
      data: {
        classId: classId,
        subjectId: subjectId,
        teacherId: teacherId || null, // Store null if no teacher assigned
        academicYear: classDataForAssignment.academicYear,
      },
      include: { // Include related data in the response
        subject: { select: { id: true, name: true, code: true } },
        teacher: { include: { user: { select: { id:true, firstName: true, lastName: true } } } },
      }
    });

    return NextResponse.json({ message: "Subject assignment created successfully.", assignment: newAssignment }, { status: 201 });

  } catch (error) {
    console.error(`Error creating subject assignment for class ${classId}:`, error);
    if (error.code === 'P2002') { // Unique constraint failed
        return NextResponse.json({ error: "This subject assignment (subject for this class and academic year) already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create subject assignment." }, { status: 500 });
  }
}