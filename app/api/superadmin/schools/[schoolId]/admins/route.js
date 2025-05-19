// File: app/api/superadmin/schools/[schoolId]/admins/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client"; // Import UserRole enum

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { createSchoolAdminSchema } from "@/lib/validators/schoolAdminValidators";

// POST handler to create a new School Admin for a specific school
export async function POST(req, { params }) {
  const { schoolId } = params;

  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const requestBody = await req.json();
    const validationResult = createSchoolAdminSchema.safeParse(requestBody);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { firstName, lastName, email, password } = validationResult.data;

    // Check if user with this email already exists
    const existingUserByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "User with this email already exists.", fieldErrors: { email: ["This email is already taken."] } },
        { status: 409 } // Conflict
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Use a transaction to create user and link them as school admin
    const newSchoolAdminUser = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName,
          email,
          hashedPassword,
          role: UserRole.SCHOOL_ADMIN, // Assign SCHOOL_ADMIN role
          isActive: true, // Default to active
        },
      });

      await tx.schoolAdmin.create({
        data: {
          userId: newUser.id,
          schoolId: schoolId,
          jobTitle: "School Administrator", // Default job title
        },
      });
      return newUser; // Return the created user
    });

    // Exclude password from the response
    const { hashedPassword: _, ...userWithoutPassword } = newSchoolAdminUser;

    return NextResponse.json(
      { message: `School Administrator ${firstName} ${lastName} created successfully for ${schoolExists.name}.`, user: userWithoutPassword },
      { status: 201 }
    );

  } catch (error) {
    console.error(`Error creating school admin for school ${schoolId}:`, error);
     if (error.code === 'P2002') { // Prisma unique constraint violation
      // This could happen if somehow SchoolAdmin unique(userId, schoolId) is violated after user creation
      // (should be rare if email check is done properly)
      return NextResponse.json({ error: "This user might already be an admin for this school or another unique constraint violated." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create school administrator." }, { status: 500 });
  }
}

// GET handler to fetch admins for a school (if you want to keep it in the same file)
export async function GET(req, { params }) {
    const { schoolId } = params;
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user || session.user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: {
                admins: {
                    orderBy: { createdAt: 'asc' },
                    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, isActive: true, profilePicture: true } } }
                }
            }
        });

        if (!school) {
            return NextResponse.json({ error: "School not found" }, { status: 404 });
        }
        return NextResponse.json(school.admins.map(sa => ({...sa.user, schoolAdminId: sa.id, jobTitle: sa.jobTitle })), { status: 200 });

    } catch (error) {
        console.error(`Error fetching admins for school ${schoolId}:`, error);
        return NextResponse.json({ error: "Failed to fetch school administrators." }, { status: 500 });
    }
}