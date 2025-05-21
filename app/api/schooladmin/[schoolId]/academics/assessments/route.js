// File: app/api/schooladmin/[schoolId]/academics/assessments/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { createAssessmentSchema } from "@/lib/validators/assessmentValidators";

async function isAuthorizedSchoolAdmin(userId, schoolId) {
  if (!userId || !schoolId) return false;
  const assignment = await prisma.schoolAdmin.findFirst({
      where: { userId: userId, schoolId: schoolId }
  });
  return !!assignment;
}

// POST handler to create a new Assessment
export async function POST(req, { params }) {
  const { schoolId } = params;

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

    const schoolExists = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!schoolExists) {
      return NextResponse.json({ error: "School not found." }, { status: 404 });
    }

    const requestBody = await req.json();
    const fieldsToClean = ['description']; // Only description is truly optional text
    fieldsToClean.forEach(field => {
      if (requestBody[field] === '') requestBody[field] = undefined;
    });
     // Convert maxMarks from string to number if it comes as string from form
    if (requestBody.maxMarks && typeof requestBody.maxMarks === 'string') {
        requestBody.maxMarks = parseFloat(requestBody.maxMarks);
    }


    const validationResult = createAssessmentSchema.safeParse(requestBody);

    if (!validationResult.success) {
      console.error("Assessment Creation Validation Errors:", validationResult.error.flatten().fieldErrors);
      return NextResponse.json(
        { error: "Validation failed.", fieldErrors: validationResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify classId and subjectId belong to the school
    const classInSchool = await prisma.class.findFirst({ where: { id: data.classId, schoolId: schoolId }});
    if (!classInSchool) return NextResponse.json({ error: "Selected class not found in this school.", fieldErrors: { classId: ["Invalid class."] }}, { status: 400 });
    
    const subjectInSchool = await prisma.subject.findFirst({ where: { id: data.subjectId, schoolId: schoolId }});
    if (!subjectInSchool) return NextResponse.json({ error: "Selected subject not found in this school.", fieldErrors: { subjectId: ["Invalid subject."] }}, { status: 400 });

    // Check for duplicate assessment (name, class, subject, year, term)
    const existingAssessment = await prisma.assessment.findUnique({
        where: {
            unique_assessment_definition: {
                classId: data.classId,
                subjectId: data.subjectId,
                academicYear: data.academicYear,
                term: data.term,
                name: data.name,
            }
        }
    });
    if (existingAssessment) {
        return NextResponse.json({ error: "This exact assessment (name, class, subject, year, term) already exists.", fieldErrors: {name: ["Assessment already defined."]} }, { status: 409 });
    }


    const newAssessment = await prisma.assessment.create({
      data: {
        ...data,
        schoolId: schoolId,
        assessmentDate: new Date(data.assessmentDate), // Convert string to Date
        maxMarks: parseFloat(data.maxMarks), // Ensure it's a float
        createdByUserId: session.user.id,
      },
    });

    return NextResponse.json(
      { message: `Assessment "${newAssessment.name}" created successfully!`, assessment: newAssessment },
      { status: 201 }
    );

  } catch (error) {
    console.error(`Error creating assessment for school ${schoolId}:`, error);
    if (error.code === 'P2002') { // Unique constraint failed
      return NextResponse.json({ error: "An assessment with these details already exists (check unique constraints).", detailedError: error.meta?.target }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create assessment.", detailedError: error.message }, { status: 500 });
  }
}

// GET handler (for listing assessments on ManageAssessmentsPage)
export async function GET(req, { params }) {
    const { schoolId } = params;
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
        
        const assessments = await prisma.assessment.findMany({
            where: { schoolId: schoolId },
            include: {
                class: { select: { name: true, section: true } },
                subject: { select: { name: true } },
                // createdByUser: { select: {firstName: true, lastName: true} } // Optional
            },
            orderBy: [{ academicYear: 'desc' }, { term: 'asc' }, { assessmentDate: 'desc' }, { name: 'asc' }],
        });
        return NextResponse.json(assessments, { status: 200 });

    } catch (error) {
        console.error(`Error fetching assessments for school ${schoolId}:`, error);
        return NextResponse.json({ error: "Failed to fetch assessments." }, { status: 500 });
    }
}