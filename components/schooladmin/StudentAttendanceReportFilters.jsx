// File: components/schooladmin/StudentAttendanceReportFilters.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Filter, Loader2, BarChartBig, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TermPeriod } from "@prisma/client";
import StudentAttendanceReportDisplay from "./StudentAttendanceReportDisplay"; // We will create this next
import { Skeleton } from "../ui/skeleton";

const termPeriodOptions = Object.values(TermPeriod);

export default function StudentAttendanceReportFilters({
  schoolId,
  availableAcademicYears = [],
  availableStudents = [], // List of { id, firstName, lastName, studentIdNumber }
  defaultAcademicYear = "",
  defaultTerm = "",
  defaultStudentId = "",
}) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  const [selectedAcademicYear, setSelectedAcademicYear] = useState(
    searchParamsHook.get('academicYear') || defaultAcademicYear || (availableAcademicYears[0] || "")
  );
  const [selectedTerm, setSelectedTerm] = useState(
    searchParamsHook.get('term') || defaultTerm || (termPeriodOptions[0] || "")
  );
  const [selectedStudentId, setSelectedStudentId] = useState(
    searchParamsHook.get('studentId') || defaultStudentId || ""
  );

  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const handleGenerateReport = async () => {
    if (!selectedAcademicYear || !selectedTerm || !selectedStudentId) {
      toast.error("Please select Academic Year, Term, and Student.");
      return;
    }

    setIsLoadingReport(true);
    setReportData(null);
    setGenerationError(null);
    const toastId = toast.loading("Generating student attendance report...");

    const query = new URLSearchParams({
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        studentId: selectedStudentId,
    });

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/reports/attendance/student?${query.toString()}`);
      const apiResult = await response.json();

      if (!response.ok) {
        toast.error(apiResult.error || "Failed to generate report.", { id: toastId, duration: 5000 });
        setGenerationError(apiResult.error || "An unknown error occurred.");
      } else {
        setReportData(apiResult.reportData); // API returns { reportData: { ... } }
        toast.success("Report generated successfully!", { id: toastId });
        setTimeout(() => { document.getElementById('student-attendance-report-display')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
      }
    } catch (err) {
      console.error("Error generating attendance report:", err);
      toast.error("An unexpected error occurred.", { id: toastId });
      setGenerationError("A system error occurred.");
    } finally {
      setIsLoadingReport(false);
    }
  };
  
  const handlePrint = () => { window.print(); };

  // Update URL search params when filters change (optional, good for shareable links)
  useEffect(() => {
    const params = new URLSearchParams(searchParamsHook.toString());
    if (selectedAcademicYear) params.set("academicYear", selectedAcademicYear); else params.delete("academicYear");
    if (selectedTerm) params.set("term", selectedTerm); else params.delete("term");
    if (selectedStudentId) params.set("studentId", selectedStudentId); else params.delete("studentId");
    // Debounce this or use a button to apply filters to URL to avoid too many history entries
    // router.replace(`${window.location.pathname}?${params.toString()}`);
  }, [selectedAcademicYear, selectedTerm, selectedStudentId, searchParamsHook, router]);

  return (
    <div className="space-y-6">
      <Card className="shadow-md print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/>Report Filters</CardTitle>
          <CardDescription>Select criteria to generate the student attendance report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="report-academicYear">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={val => {setSelectedAcademicYear(val); setReportData(null); setGenerationError(null);}}>
                <SelectTrigger id="report-academicYear" className="h-10"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {availableAcademicYears.length > 0 ? availableAcademicYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)) : <SelectItem value="" disabled>No years available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-term">Term/Semester</Label>
              <Select value={selectedTerm} onValueChange={val => {setSelectedTerm(val); setReportData(null); setGenerationError(null);}} disabled={!selectedAcademicYear}>
                <SelectTrigger id="report-term" className="h-10"><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  {termPeriodOptions.map(term => (<SelectItem key={term} value={term}>{term.replace("_", " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-student">Student</Label>
              <Select value={selectedStudentId} onValueChange={val => {setSelectedStudentId(val); setReportData(null); setGenerationError(null);}} disabled={!selectedAcademicYear || availableStudents.length === 0}>
                <SelectTrigger id="report-student" className="h-10"><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  {availableStudents.length === 0 && selectedAcademicYear ? <SelectItem value="" disabled>No students to select</SelectItem> :
                   availableStudents.map(student => (<SelectItem key={student.id} value={student.id}>{student.lastName}, {student.firstName} ({student.studentIdNumber})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button onClick={handleGenerateReport} disabled={isLoadingReport || !selectedStudentId} className="w-full sm:w-auto">
              {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChartBig className="mr-2 h-4 w-4" />}
              Generate Attendance Report
            </Button>
            {reportData && (
              <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" /> Print Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Display Area for the Report */}
      <div id="student-attendance-report-display" className="mt-8">
        {isLoadingReport && (
            <div className="space-y-4 p-4 border rounded-md">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        )}
        {generationError && !isLoadingReport && (
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Report Generation Failed</CardTitle></CardHeader><CardContent><p>{generationError}</p></CardContent></Card>
        )}
        {reportData && !isLoadingReport && !generationError && (
          <StudentAttendanceReportDisplay reportData={reportData} />
        )}
      </div>
    </div>
  );
}