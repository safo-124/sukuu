// File: app/api/schooladmin/[schoolId]/timetable/slots/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { timetableSlotSchema } from "@/lib/validators/timetableValidators";

async function isAuthorizedSchoolAdmin(userId, schoolId) { /* ... same helper ... */ 
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
  return !!assignment;
}

// GET: List all TimetableSlots for a specific class (and optionally academic year)
export async function GET(req, { params }) {
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  // const academicYear = searchParams.get('academicYear'); // Optional filter

  if (!classId) {
    return NextResponse.json({ error: "classId query parameter is required." }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (!authorizedSchoolAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const slots = await prisma.timetableSlot.findMany({
      where: { 
        schoolId: schoolId,
        classId: classId,
        // ...(academicYear && { class: { academicYear: academicYear } }) // Filter by class's academic year
      },
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        class: { select: { name: true, section: true, academicYear: true } } // For context
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
    });
    return NextResponse.json(slots, { status: 200 });
  } catch (error) {
    console.error("Error fetching timetable slots:", error);
    return NextResponse.json({ error: "Failed to fetch timetable slots." }, { status: 500 });
  }
}

// POST: Create a new TimetableSlot
export async function POST(req, { params }) {
  const { schoolId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';
    const authorizedSchoolAdmin = isSuperAdmin ? true : await isAuthorizedSchoolAdmin(session.user.id, schoolId);
    if (!authorizedSchoolAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const requestBody = await req.json();
    // The timetableSlotSchema expects classId, but it's in the payload from the client for validation consistency.
    // The API ensures it matches the class context later.
    const validationResult = timetableSlotSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validationResult.data;

    // Verify classId from payload matches schoolId context
    const classData = await prisma.class.findFirst({ where: {id: data.classId, schoolId: schoolId}, select: {academicYear: true}});
    if (!classData) {
        return NextResponse.json({ error: "Class not found or doesn't belong to this school.", fieldErrors: { classId: ["Invalid class."]}}, { status: 400 });
    }
    
    // Verify subjectId and teacherId belong to the school and are valid
    const subjectExists = await prisma.subject.findFirst({where: {id: data.subjectId, schoolId: schoolId}});
    if (!subjectExists) return NextResponse.json({ error: "Subject not found for this school.", fieldErrors: {subjectId: ["Invalid subject."]}}, {status: 400});
    
    const teacherExists = await prisma.teacher.findFirst({where: {id: data.teacherId, schoolId: schoolId}});
    if (!teacherExists) return NextResponse.json({ error: "Teacher not found for this school.", fieldErrors: {teacherId: ["Invalid teacher."]}}, {status: 400});

    // Check for conflicts based on @@unique constraints in TimetableSlot model
    // (class + day + startTime), (teacher + day + startTime), (room + day + startTime)
    const commonConflictQuery = {
        schoolId: schoolId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime, // Assuming exact match for now, overlap is more complex
    };
    const classConflict = await prisma.timetableSlot.findFirst({ where: { ...commonConflictQuery, classId: data.classId }});
    if (classConflict) return NextResponse.json({ error: "This class already has an activity scheduled at this time." }, { status: 409 });
    
    const teacherConflict = await prisma.timetableSlot.findFirst({ where: { ...commonConflictQuery, teacherId: data.teacherId }});
    if (teacherConflict) return NextResponse.json({ error: "This teacher is already scheduled at this time." }, { status: 409 });

    if (data.room) {
        const roomConflict = await prisma.timetableSlot.findFirst({ where: { ...commonConflictQuery, room: data.room }});
        if (roomConflict) return NextResponse.json({ error: "This room is already booked at this time." }, { status: 409 });
    }

    const newSlot = await prisma.timetableSlot.create({
      data: {
        schoolId: schoolId,
        classId: data.classId,
        subjectId: data.subjectId,
        teacherId: data.teacherId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        room: data.room || null,
      },
    });
    return NextResponse.json({ message: "Timetable slot created.", slot: newSlot }, { status: 201 });

  } catch (error) {
    console.error("Error creating timetable slot:", error);
    if (error.code === 'P2002') return NextResponse.json({ error: "A conflicting timetable slot already exists (unique constraint)." }, { status: 409 });
    return NextResponse.json({ error: "Failed to create timetable slot." }, { status: 500 });
  }
}