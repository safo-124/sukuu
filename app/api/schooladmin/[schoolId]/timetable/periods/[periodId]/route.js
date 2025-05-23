// File: app/api/schooladmin/[schoolId]/timetable/periods/[periodId]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { updateSchoolPeriodSchema } from "@/lib/validators/timetableValidators"; // Using partial schema for update

async function authorizeAndGetPeriod(userId, userRole, schoolId, periodId) {
    const isSuperAdmin = userRole === 'SUPER_ADMIN';
    let authorizedSchoolAdmin = isSuperAdmin;
    if (!isSuperAdmin && userId) {
        const assignment = await prisma.schoolAdmin.findFirst({ where: { userId: userId, schoolId: schoolId }});
        authorizedSchoolAdmin = !!assignment;
    }
    if (!authorizedSchoolAdmin) return { error: "Forbidden", status: 403, period: null };

    const period = await prisma.schoolPeriod.findFirst({
        where: { id: periodId, schoolId: schoolId }
    });
    if (!period) return { error: "School period not found.", status: 404, period: null };
    return { error: null, status: 200, period };
}

// PUT: Update a specific SchoolPeriod
export async function PUT(req, { params }) {
  const { schoolId, periodId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authResult = await authorizeAndGetPeriod(session.user.id, session.user.role, schoolId, periodId);
    if (authResult.error || !authResult.period) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const periodToUpdate = authResult.period;

    const requestBody = await req.json();
    const validationResult = updateSchoolPeriodSchema.safeParse(requestBody); // update schema allows partial

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const data = validationResult.data; // Contains only provided and valid fields

    // Server-side check for time overlaps and sortOrder/name uniqueness if these fields are being changed
    const existingPeriods = await prisma.schoolPeriod.findMany({ where: { schoolId, NOT: { id: periodId } } });
    
    if (data.sortOrder !== undefined && data.sortOrder !== periodToUpdate.sortOrder) {
        if (existingPeriods.some(p => p.sortOrder === data.sortOrder)) {
            return NextResponse.json({ error: "Sort order must be unique.", fieldErrors: { sortOrder: ["This sort order is already in use."]}}, { status: 409 });
        }
    }
    if (data.name !== undefined && data.name !== periodToUpdate.name) {
        if (existingPeriods.some(p => p.name === data.name)) {
            return NextResponse.json({ error: "Period name must be unique.", fieldErrors: { name: ["This name is already in use."]}}, { status: 409 });
        }
    }

    const newStartTimeStr = data.startTime || periodToUpdate.startTime;
    const newEndTimeStr = data.endTime || periodToUpdate.endTime;
    const newStartTime = parseInt(newStartTimeStr.split(':')[0]) * 60 + parseInt(newStartTimeStr.split(':')[1]);
    const newEndTime = parseInt(newEndTimeStr.split(':')[0]) * 60 + parseInt(newEndTimeStr.split(':')[1]);

    // Check only if time is actually changing
    if ( (data.startTime && data.startTime !== periodToUpdate.startTime) || (data.endTime && data.endTime !== periodToUpdate.endTime) ) {
        if (newStartTime >= newEndTime && data.startTime && data.endTime) { // Ensure refine on schema caught this, but good server check
             return NextResponse.json({ error: "End time must be after start time.", fieldErrors: {endTime: ["End time must be after start time."]}}, { status: 400 });
        }
        for (const p of existingPeriods) {
            const existingStartTime = parseInt(p.startTime.split(':')[0]) * 60 + parseInt(p.startTime.split(':')[1]);
            const existingEndTime = parseInt(p.endTime.split(':')[0]) * 60 + parseInt(p.endTime.split(':')[1]);
            if (Math.max(newStartTime, existingStartTime) < Math.min(newEndTime, existingEndTime)) {
                return NextResponse.json({ error: `Time overlaps with existing period: ${p.name} (${p.startTime}-${p.endTime})`, fieldErrors: {startTime: ["Time overlap."], endTime: ["Time overlap."]}}, { status: 409 });
            }
        }
    }

    const updatedPeriod = await prisma.schoolPeriod.update({
      where: { id: periodId },
      data: data, // Prisma handles partial updates if 'data' only contains changed fields
    });
    return NextResponse.json({ message: "School period updated successfully.", period: updatedPeriod }, { status: 200 });

  } catch (error) {
    console.error(`Error updating school period ${periodId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Period not found for update." }, { status: 404 });
    if (error.code === 'P2002') return NextResponse.json({ error: "A unique constraint was violated (name or sort order)." }, { status: 409 });
    return NextResponse.json({ error: "Failed to update school period." }, { status: 500 });
  }
}

// DELETE: Delete a specific SchoolPeriod
export async function DELETE(req, { params }) {
  const { schoolId, periodId } = params;
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const authResult = await authorizeAndGetPeriod(session.user.id, session.user.role, schoolId, periodId);
    if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const periodToDelete = authResult.period;

    // Check if this period is used in any TimetableSlots
    const usageInTimetable = await prisma.timetableSlot.count({ 
        // TimetableSlot does not directly link to SchoolPeriod.id in current schema.
        // It stores startTime, endTime strings. Deletion of a SchoolPeriod is more about removing a template.
        // If TimetableSlot *did* link to SchoolPeriod.id, this check would be:
        // where: { schoolPeriodId: periodId } 
        // For now, deleting a SchoolPeriod definition doesn't automatically affect existing timetable slots
        // unless your application logic re-validates timetable slots against defined periods.
    });

    // If you want to prevent deletion if it *would* make existing timetable slots invalid:
    // This check is complex as it requires comparing times.
    // A simpler rule: if any timetable slot uses the exact startTime of this period, warn or prevent.
    // For now, we'll allow deletion as it's deleting a "period definition".

    await prisma.schoolPeriod.delete({ where: { id: periodId } });
    return NextResponse.json({ message: `School period "${periodToDelete.name}" deleted successfully.` }, { status: 200 });

  } catch (error) {
    console.error(`Error deleting school period ${periodId}:`, error);
    if (error.code === 'P2025') return NextResponse.json({ error: "Period not found." }, { status: 404 });
    return NextResponse.json({ error: "Failed to delete school period." }, { status: 500 });
  }
}