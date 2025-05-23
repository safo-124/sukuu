// File: app/api/schooladmin/[schoolId]/timetable/slots/[slotId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateTimetableSlotSchema } from "@/lib/validators/timetableValidators";

async function authorizeAndGetSlot(userId, userRole, schoolId, slotId) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", status: 403, slot: null };

    const slot = await prisma.timetableSlot.findFirst({
        where: { id: slotId, schoolId: schoolId } // Ensure slot belongs to school
    });
    if (!slot) return { error: "Timetable slot not found.", status: 404, slot: null };
    return { error: null, status: 200, slot };
}

// PUT: Update a specific TimetableSlot
export async function PUT(req, { params }) {
  const { schoolId, slotId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const authResult = await authorizeAndGetSlot(session.user.id, session.user.role, schoolId, slotId);
    if (authResult.error || !authResult.slot) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const slotToUpdate = authResult.slot;

    const requestBody = await req.json();
    const validationResult = updateTimetableSlotSchema.safeParse(requestBody); // Uses partial schema

    if (!validationResult.success) {
      return NextResponse.json({ error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = validationResult.data; // Contains only provided & valid fields

    // Prepare update payload - only update what's provided
    const updatePayload = {};
    if (data.subjectId !== undefined) updatePayload.subjectId = data.subjectId;
    if (data.teacherId !== undefined) updatePayload.teacherId = data.teacherId;
    if (data.room !== undefined) updatePayload.room = data.room || null;
    // Day, startTime, endTime are usually part of slot identity and not changed this way.
    // If they can change, add them to schema and payload, and re-run conflict checks.
    // For now, assume only subject, teacher, room are updatable on an existing slot's time.

    // Re-run conflict checks if relevant fields (teacher, room) are changing
    // For simplicity, this example assumes day/time are fixed for the slot being edited.
    // A full update allowing time change would need more complex conflict checks.
    const checkDay = slotToUpdate.dayOfWeek; // Fixed for this slot
    const checkStartTime = slotToUpdate.startTime; // Fixed for this slot

    if (updatePayload.teacherId && updatePayload.teacherId !== slotToUpdate.teacherId) {
        const teacherConflict = await prisma.timetableSlot.findFirst({ where: { schoolId, dayOfWeek: checkDay, startTime: checkStartTime, teacherId: updatePayload.teacherId, NOT: {id: slotId} }});
        if (teacherConflict) return NextResponse.json({ error: "This teacher is already scheduled at this time." }, { status: 409 });
    }
    if (updatePayload.room && updatePayload.room !== slotToUpdate.room) {
        const roomConflict = await prisma.timetableSlot.findFirst({ where: { schoolId, dayOfWeek: checkDay, startTime: checkStartTime, room: updatePayload.room, NOT: {id: slotId} }});
        if (roomConflict) return NextResponse.json({ error: "This room is already booked at this time." }, { status: 409 });
    }


    if (Object.keys(updatePayload).length === 0) {
        return NextResponse.json({ message: "No changes provided.", slot: slotToUpdate }, {status: 200 });
    }

    const updatedSlot = await prisma.timetableSlot.update({
      where: { id: slotId },
      data: updatePayload,
    });
    return NextResponse.json({ message: "Timetable slot updated.", slot: updatedSlot }, { status: 200 });
  } catch (error) {
    console.error(`Error updating timetable slot ${slotId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    if (error.code === 'P2002') return NextResponse.json({ error: "A conflicting timetable slot already exists." }, { status: 409 });
    return NextResponse.json({ error: "Failed to update slot." }, { status: 500 });
  }
}

// DELETE: Delete a specific TimetableSlot
export async function DELETE(req, { params }) {
  const { schoolId, slotId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const authResult = await authorizeAndGetSlot(session.user.id, session.user.role, schoolId, slotId);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

    // Check for related StudentAttendance records if onDelete is not Cascade
    // const attendanceRecords = await prisma.studentAttendance.count({ where: {timetableSlotId: slotId}});
    // if (attendanceRecords > 0) return NextResponse.json({ error: "Cannot delete slot, attendance already marked." }, { status: 409 });

    await prisma.timetableSlot.delete({ where: { id: slotId } });
    return NextResponse.json({ message: "Timetable slot deleted." }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting timetable slot ${slotId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Slot not found." }, { status: 404 });
    if (error.code === 'P2003') return NextResponse.json({ error: "Cannot delete slot due to existing relations (e.g. attendance records)."}, {status: 409});
    return NextResponse.json({ error: "Failed to delete slot." }, { status: 500 });
  }
}