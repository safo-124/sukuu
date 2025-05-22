// File: components/schooladmin/StudentAttendanceReportDisplay.jsx
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
    School, CalendarDays, User as UserIcon, BookOpen, Percent, CheckCircle, XCircle, Clock, Info, ListChecks 
} from "lucide-react";
import { AttendanceStatus } from '@prisma/client';

const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const dateParts = dateString.split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) return "Invalid Date";
  const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString('en-US', options);
};

const AttendanceStatusDisplay = ({ status }) => {
  switch (status) {
    case AttendanceStatus.PRESENT: 
      return <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 print:text-green-700"><CheckCircle size={14}/> Present</span>;
    case AttendanceStatus.ABSENT: 
      return <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 print:text-red-700"><XCircle size={14}/> Absent</span>;
    case AttendanceStatus.LATE: 
      return <span className="flex items-center gap-1.5 text-orange-500 dark:text-orange-400 print:text-orange-600"><Clock size={14}/> Late</span>;
    case AttendanceStatus.EXCUSED: 
      return <span className="flex items-center gap-1.5 text-blue-500 dark:text-blue-400 print:text-blue-600"><Info size={14}/> Excused</span>;
    default: 
      return <span className="text-muted-foreground">N/A</span>;
  }
};

export default function StudentAttendanceReportDisplay({ reportData, gradeScaleInUse = [] }) {
  if (!reportData || !reportData.student) {
    return null; 
  }

  const {
    student,
    schoolName,
    className,
    academicYear,
    term,
    attendanceLog = [],
    summary,
    schoolLogoUrl,
    schoolAddress,
    schoolPhoneNumber,
    homeroomTeacherComment, // Assuming these are passed in reportData
    principalComment       // Assuming these are passed in reportData
  } = reportData;

  const fullName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();

  return (
    <div className="report-card-container my-6 bg-white dark:bg-background md:p-0"> 
      <Card className="w-full max-w-3xl mx-auto shadow-xl print:shadow-none print:border print:border-gray-300">
        <CardHeader className="text-center relative border-b pb-3 print:pb-2 print:border-b-2 print:border-black print:text-black">
          <div className="print-only-block school-logo-print-header mb-2 text-center">
            {schoolLogoUrl ? (
              <img src={schoolLogoUrl} alt={`${schoolName} Logo`} className="h-16 w-auto mx-auto mb-2" />
            ) : (
              <School className="h-10 w-10 text-primary mx-auto mb-1" />
            )}
          </div>
          <CardTitle className="text-xl md:text-2xl font-bold print:text-lg">{schoolName}</CardTitle>
          <CardDescription className="text-md md:text-lg font-semibold print:text-base">
            Student Attendance Report
          </CardDescription>
          <p className="text-sm text-muted-foreground print:text-xs">
            {academicYear} - Term: {term}
          </p>
          <div className="print-only-block text-xs text-gray-600 mt-1">
            <p>{schoolAddress || "School Address Placeholder"}</p>
            <p>{schoolPhoneNumber || "School Phone Placeholder"}</p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-4 md:p-6 print:space-y-2 print:p-2 print:text-black">
          <section className="student-info-section print:mb-2">
            <h3 className="text-base font-semibold mb-1.5 print:text-sm print:font-bold screen-only">Student Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm p-3 border rounded-md print:text-xs print:p-1 print:border-gray-300 print:bg-transparent">
              <div className="flex items-center col-span-2 sm:col-span-1">
                <Avatar className="h-10 w-10 mr-3 print:h-8 print:w-8">
                    <AvatarImage src={student.profilePictureUrl || undefined} alt={fullName}/>
                    <AvatarFallback className="print:text-base">{student.firstName?.[0]}{student.lastName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <div><strong>Name:</strong> {fullName}</div>
                    <div><strong>ID:</strong> {student.studentIdNumber || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center"><BookOpen size={14} className="mr-1.5 text-muted-foreground"/><strong>Class:</strong> <span className="ml-1">{className || 'N/A'}</span></div>
              <div className="flex items-center"><CalendarDays size={14} className="mr-1.5 text-muted-foreground"/><strong>Report Date:</strong> <span className="ml-1">{formatDate(new Date().toISOString())}</span></div>
            </div>
          </section>
          
          <Separator className="print:my-1 print:border-gray-300"/>

          {summary && (
            <section className="attendance-summary-section print:mb-2">
              <h3 className="text-base font-semibold mb-1.5 print:text-sm print:font-bold">Attendance Summary for the Term</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-x-4 gap-y-2 text-sm p-3 border rounded-md print:text-xs print:p-1 print:border-gray-300 print:bg-transparent">
                <div><strong>Marked Days:</strong> {summary.totalMarkedDays}</div>
                <div className="text-green-600 dark:text-green-400 print:text-green-700"><strong>Present:</strong> {summary.daysPresent}</div>
                <div className="text-red-600 dark:text-red-400 print:text-red-700"><strong>Absent:</strong> {summary.daysAbsent}</div>
                <div className="text-orange-500 dark:text-orange-400 print:text-orange-600"><strong>Late:</strong> {summary.daysLate}</div>
                <div className="text-blue-500 dark:text-blue-400 print:text-blue-600"><strong>Excused:</strong> {summary.daysExcused}</div>
                <div className="font-semibold flex items-center gap-1"><Percent size={14}/> Attendance: {summary.attendancePercentage}%</div>
              </div>
            </section>
          )}
          
          {attendanceLog.length > 0 && (
            <>
            <Separator className="print:my-1 print:border-gray-300"/>
            <section className="attendance-log-section print:mb-2">
              <h3 className="text-base font-semibold mb-1.5 print:text-sm print:font-bold">Detailed Attendance Log</h3>
              <div className="border rounded-md max-h-[300px] overflow-y-auto print:max-h-none print:overflow-visible print:border-gray-300">
                <Table className="print:text-[8pt]">
                  <TableCaption className="sr-only">Detailed attendance log for {fullName}</TableCaption>
                  <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-sm print:bg-slate-100">
                    <TableRow className="print:border-b print:border-gray-400">
                      <TableHead className="w-[120px] print:w-[90px] print:p-0.5">Date</TableHead>
                      <TableHead className="w-[120px] print:w-[90px] print:p-0.5">Status</TableHead>
                      <TableHead className="print:p-0.5">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceLog.map((log, index) => (
                      <TableRow key={index} className="print:border-b print:border-gray-300">
                        <TableCell className="font-medium print:p-0.5">{formatDate(log.date)}</TableCell>
                        <TableCell className="print:p-0.5"><AttendanceStatusDisplay status={log.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground print:p-0.5">{log.remarks || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
            </>
          )}

          {attendanceLog.length === 0 && !summary && (
            <p className="text-sm text-muted-foreground text-center py-4">No attendance data recorded for this student for the selected period.</p>
          )}
          
          {/* Comments Section - if you add these to reportData */}
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

          {/* Display Grading Key if it was part of academic report. For attendance report, it's not directly relevant */}
          {/* We can remove this section for a pure attendance report or adapt it if needed */}
          {/* {gradeScaleInUse && gradeScaleInUse.length > 0 && ( ... grading key table ... )} */}

          <div className="print-only-grid signature-area mt-10 grid grid-cols-2 gap-16 text-xs pt-8 print:mt-8 print:pt-4">
            <div><div className="border-t border-black pt-1 mt-4">Class Teacher's Signature</div></div>
            <div><div className="border-t border-black pt-1 mt-4">Administrator's Signature</div></div>
          </div>

        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground pt-3 border-t print:pt-1 print:mt-2 print:border-t print:border-black">
            Report Generated: {formatDate(new Date().toISOString(), {year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'})} | Sukuu SMS
        </CardFooter>
      </Card>
    </div>
  );
}