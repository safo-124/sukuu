// File: components/schooladmin/ReportCardDisplay.jsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { School, CalendarDays, User as UserIcon, BookOpen, Percent, TrendingUp, MessageSquare, CheckSquare, Award, Star, ListChecks, XCircle } from "lucide-react";

const formatDate = (dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', options);
};

export default function ReportCardDisplay({ reportCard, gradeScaleInUse = [] }) {
  if (!reportCard) {
    return null;
  }

  const {
    student,
    schoolName,
    academicYear,
    term,
    className,
    subjects = [],
    overall,
    homeroomTeacherComment,
    principalComment,
    attendanceSummary,
    schoolLogoUrl,
    schoolAddress,
    schoolPhoneNumber
  } = reportCard;

  const fullName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="report-card-container my-6 bg-white dark:bg-background md:p-4">
      <Card className="w-full max-w-4xl mx-auto shadow-xl print:shadow-none print:border-none print:p-0">
        <CardHeader className="text-center relative border-b pb-4 print:pb-2 print:border-b-2 print:border-black print:text-black">
          <div className="print-only-block school-logo-print-header mb-2 text-center">
            {schoolLogoUrl ? (
              <img src={schoolLogoUrl} alt={`${schoolName} Logo`} className="h-16 w-auto mx-auto mb-2" />
            ) : (
              <School className="h-10 w-10 text-primary mx-auto mb-1" />
            )}
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold print:text-xl print:text-black">{schoolName}</CardTitle>
          <CardDescription className="text-lg md:text-xl font-semibold print:text-base print:text-black">
            STUDENT ACADEMIC REPORT
          </CardDescription>
          <p className="text-md text-muted-foreground print:text-sm print:text-gray-700">
            {academicYear} - Term: {term}
          </p>
          <div className="print-only-block text-xs text-gray-600 mt-1">
            <p>{schoolAddress || "School Address Placeholder"}</p>
            <p>{schoolPhoneNumber || "School Phone Placeholder"}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 md:space-y-6 p-4 md:p-6 print:space-y-2 print:p-2 print:text-black">
          <section className="student-info-section print:mb-2">
            <h3 className="text-lg font-semibold mb-2 print:text-base print:font-bold print:mb-1 screen-only">Student Information</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm p-3 border rounded-md bg-muted/10 print:text-xs print:p-1 print:border-gray-300 print:bg-transparent">
              <div className="flex items-center"><UserIcon size={14} className="mr-1.5 text-muted-foreground"/><strong>Name:</strong> <span className="ml-1">{fullName}</span></div>
              <div className="flex items-center"><UserIcon size={14} className="mr-1.5 text-muted-foreground"/><strong>ID:</strong> <span className="ml-1">{student.studentIdNumber || 'N/A'}</span></div>
              <div className="flex items-center"><BookOpen size={14} className="mr-1.5 text-muted-foreground"/><strong>Class:</strong> <span className="ml-1">{className || 'N/A'}</span></div>
              <div className="flex items-center col-span-2 sm:col-span-1"><CalendarDays size={14} className="mr-1.5 text-muted-foreground"/><strong>Report Date:</strong> <span className="ml-1">{formatDate(new Date().toISOString())}</span></div>
            </div>
          </section>

          <Separator className="my-4 print:my-1 print:border-gray-300" />

          <section className="academic-performance-section print:mb-2">
            <h3 className="text-lg font-semibold mb-2 print:text-base print:font-bold print:mb-1">Academic Performance</h3>
            <div className="border rounded-md overflow-x-auto print:border print:border-gray-300">
              <Table className="print:text-[9pt]">
                {/* Ensure TableCaption, TableHeader, TableBody are direct children */}
                <TableCaption className="sr-only">Student Academic Performance</TableCaption>
                <TableHeader className="print:bg-slate-100">
                  <TableRow className="print:border-b-2 print:border-gray-500">
                    <TableHead className="w-[180px] print:w-[150px] print:p-1">Subject</TableHead>
                    <TableHead className="text-center print:w-[50px] print:p-1">Max Marks</TableHead>
                    <TableHead className="text-center print:w-[50px] print:p-1">Score</TableHead>
                    <TableHead className="text-center print:w-[50px] print:p-1">%</TableHead>
                    <TableHead className="text-center print:w-[40px] print:p-1">Grade</TableHead>
                    <TableHead className="text-center print:w-[40px] print:p-1 hidden xs:table-cell">Point</TableHead> 
                    <TableHead className="print:min-w-[150px] print:p-1">Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subj, index) => (
                    <TableRow key={subj.subjectId || index} className="print:border-b print:border-gray-300">
                      <TableCell className="font-medium print:p-1">{subj.subjectName}</TableCell>
                      <TableCell className="text-center print:p-1">{subj.totalMaxMarks?.toFixed(1)}</TableCell>
                      <TableCell className="text-center print:p-1">{subj.totalMarksObtained !== null ? subj.totalMarksObtained?.toFixed(1) : "AB"}</TableCell>
                      <TableCell className="text-center print:p-1">{subj.percentage?.toFixed(1)}%</TableCell>
                      <TableCell className="text-center font-semibold print:p-1">{subj.gradeLetter}</TableCell>
                      <TableCell className="text-center print:p-1 hidden xs:table-cell">{subj.gradePoint?.toFixed(1) || '-'}</TableCell>
                      <TableCell className="text-xs print:p-1 print:min-w-[150px]">{subj.remark}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
          
          <Separator className="my-4 print:my-1 print:border-gray-300" />

          <section className="overall-summary-section print:mb-2">
             <h3 className="text-lg font-semibold mb-2 print:text-base print:font-bold print:mb-1">Term Summary</h3>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm p-3 border rounded-md bg-muted/10 print:text-xs print:p-1 print:border-gray-300 print:bg-transparent">
                <div><strong>Total Score:</strong> {overall.totalMarksObtained?.toFixed(1)} / {overall.totalMaxMarks?.toFixed(1)}</div>
                <div className="font-semibold"><strong>Overall %:</strong> {overall.percentage?.toFixed(1)}%</div>
                <div className="font-bold"><strong>Overall Grade:</strong> {overall.gradeLetter}</div>
                {overall.termGPA !== null && <div className="font-bold"><strong>Term GPA:</strong> {overall.termGPA?.toFixed(2)}</div>}
                <div className="col-span-full"><strong>General Remark:</strong> {overall.remark}</div>
             </div>
          </section>

          {(homeroomTeacherComment || principalComment) && <Separator className="my-4 print:my-1 print:border-gray-300" />}
          <section className="comments-section space-y-3 print:space-y-1 print:mb-2">
            {homeroomTeacherComment && (
              <div>
                <h4 className="font-semibold text-sm mb-0.5 print:text-xs print:font-bold">Homeroom Teacher's Comment:</h4>
                <p className="text-xs border p-2 rounded-md min-h-[40px] bg-background print:min-h-[25px] print:p-1 print:border-gray-300">{homeroomTeacherComment}</p>
              </div>
            )}
            {principalComment && (
              <div>
                <h4 className="font-semibold text-sm mb-0.5 print:text-xs print:font-bold">Head of School's Comment:</h4>
                <p className="text-xs border p-2 rounded-md min-h-[40px] bg-background print:min-h-[25px] print:p-1 print:border-gray-300">{principalComment}</p>
              </div>
            )}
          </section>

          {attendanceSummary && (attendanceSummary.totalSchoolDays > 0) && (
            <>
              <Separator className="my-4 print:my-1 print:border-gray-300" />
              <section className="attendance-summary-section print:mb-2">
                <h3 className="text-lg font-semibold mb-2 print:text-base print:font-bold print:mb-1">Attendance Summary (Term)</h3>
                <div className="grid grid-cols-3 gap-4 text-sm p-3 border rounded-md bg-muted/10 print:text-xs print:p-1 print:border-gray-300 print:bg-transparent">
                    <div><CheckSquare size={14} className="inline mr-1"/><strong>Present:</strong> {attendanceSummary.daysPresent}</div>
                    <div><XCircle size={14} className="inline mr-1 text-destructive"/><strong>Absent:</strong> {attendanceSummary.daysAbsent}</div>
                    <div><ListChecks size={14} className="inline mr-1"/><strong>School Days:</strong> {attendanceSummary.totalSchoolDays}</div>
                </div>
              </section>
            </>
          )}

          {gradeScaleInUse && gradeScaleInUse.length > 0 && (
            <>
              <Separator className="my-4 print:my-1 print:border-gray-300" />
              <section className="grading-key-section print:mb-1 print:text-[7pt]">
                <h3 className="text-md font-semibold mb-1.5 print:text-sm print:font-bold print:mb-0.5">Grading Key Used</h3>
                <div className="overflow-x-auto border rounded-md print:border-gray-300">
                  <Table className="min-w-[450px]">
                     {/* Ensure TableCaption, TableHeader, TableBody are direct children */}
                    <TableCaption className="sr-only">Grading Key</TableCaption>
                    <TableHeader className="print:bg-slate-100">
                      <TableRow className="print:border-b print:border-gray-400">
                        <TableHead className="h-8 print:h-auto print:p-0.5">Range (%)</TableHead>
                        <TableHead className="h-8 print:h-auto print:p-0.5">Grade</TableHead>
                        <TableHead className="h-8 print:h-auto print:p-0.5">Point</TableHead>
                        <TableHead className="h-8 print:h-auto print:p-0.5">Remark</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeScaleInUse.map(entry => (
                        <TableRow key={entry.id || entry.gradeLetter} className="print:border-b print:border-gray-300">
                          <TableCell className="print:p-0.5">{entry.minPercentage?.toFixed(1)} - {entry.maxPercentage?.toFixed(1)}</TableCell>
                          <TableCell className="font-semibold print:p-0.5">{entry.gradeLetter}</TableCell>
                          <TableCell className="print:p-0.5">{entry.gradePoint?.toFixed(1) || '-'}</TableCell>
                          <TableCell className="text-xs print:p-0.5">{entry.remark || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </>
          )}
          
          <div className="print-only-grid signature-area mt-10 grid grid-cols-2 gap-16 text-xs pt-8 print:mt-8 print:pt-4">
            <div><div className="border-t border-black pt-1 mt-4">Homeroom Teacher's Signature</div></div>
            <div><div className="border-t border-black pt-1 mt-4">Head of School's Signature</div></div>
          </div>

        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground pt-4 border-t print:pt-1 print:mt-2 print:border-t print:border-black">
            Report Generated on {formatDate(new Date().toISOString())} | Sukuu School Management System
        </CardFooter>
      </Card>
    </div>
  );
}