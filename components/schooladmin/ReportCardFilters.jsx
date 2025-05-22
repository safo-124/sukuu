// File: components/schooladmin/ReportCardFilters.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Filter, Loader2, BarChartBig, Printer, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TermPeriod } from "@prisma/client"; // For TermPeriod enum values
import ReportCardDisplay from "./ReportCardDisplay"; // Component to display one report card
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

const termPeriodOptions = Object.values(TermPeriod);

export default function ReportCardFilters({
  schoolId,
  availableAcademicYears = [],
  availableClasses = [],
  defaultAcademicYear = "",
  defaultTerm = "",
  // defaultStudentId = "", // Optional, read from searchParams if needed
}) {
  const router = useRouter();
  const searchParamsHook = useSearchParams();

  const [selectedAcademicYear, setSelectedAcademicYear] = useState(
    searchParamsHook.get('academicYear') || defaultAcademicYear || (availableAcademicYears[0] || "")
  );
  const [selectedTerm, setSelectedTerm] = useState(
    searchParamsHook.get('term') || defaultTerm || (termPeriodOptions[0] || "")
  );
  const [selectedClassId, setSelectedClassId] = useState(searchParamsHook.get('classId') || "");
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(searchParamsHook.get('studentId') || "all"); // "all" or specific ID

  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  // This state will hold the full API response: { reportCards: [], gradeScaleInUse: [] }
  const [reportApiResponse, setReportApiResponse] = useState(null); 
  const [generationError, setGenerationError] = useState(null);

  const classesForSelectedYear = useMemo(() => {
    if (!selectedAcademicYear) return [];
    return availableClasses.filter(cls => cls.academicYear === selectedAcademicYear);
  }, [availableClasses, selectedAcademicYear]);

  // Fetch students when class or academic year changes
  useEffect(() => {
    if (selectedClassId && selectedAcademicYear) {
      const cls = availableClasses.find(c => c.id === selectedClassId);
      if (cls && cls.academicYear === selectedAcademicYear) {
        setIsLoadingStudents(true);
        setStudentsInClass([]);
        setSelectedStudentId("all");
        setReportApiResponse(null); // Clear previous report when class changes
        setGenerationError(null);
        fetch(`/api/schooladmin/${schoolId}/classes/${selectedClassId}/students-basic`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch students (${res.status})`);
            return res.json();
          })
          .then(data => {
            if (Array.isArray(data)) setStudentsInClass(data);
            else { toast.error(data.error || "Received invalid student data."); setStudentsInClass([]);}
          })
          .catch(err => { console.error("Error fetching students:", err); toast.error("Error loading students for class."); setStudentsInClass([]); })
          .finally(() => setIsLoadingStudents(false));
      } else if (selectedClassId) { // Class selected but not for current year
        setSelectedClassId(""); setStudentsInClass([]); setSelectedStudentId("all");
      }
    } else {
      setStudentsInClass([]); setSelectedStudentId("all");
    }
  }, [selectedClassId, selectedAcademicYear, schoolId, availableClasses]);

  const handleGenerateReport = async () => {
    if (!selectedAcademicYear || !selectedTerm || !selectedClassId) {
      toast.error("Please select Academic Year, Term, and Class.");
      return;
    }

    setIsLoadingReport(true);
    setReportApiResponse(null); // Clear previous report
    setGenerationError(null);
    const toastId = toast.loading("Generating report card(s)...");

    const query = new URLSearchParams({
        academicYear: selectedAcademicYear,
        term: selectedTerm,
        classId: selectedClassId,
        studentId: selectedStudentId, // API will handle if "all" or specific ID
    });

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/reports/student-term-report?${query.toString()}`);
      const data = await response.json(); // API returns { reportCards: [], gradeScaleInUse: [] }

      if (!response.ok) {
        toast.error(data.error || "Failed to generate report.", { id: toastId, duration: 5000 });
        setGenerationError(data.error || "An unknown error occurred.");
      } else {
        if (data.reportCards && data.reportCards.length > 0) {
            setReportApiResponse(data); // Store the full response
            toast.success("Report(s) generated successfully!", { id: toastId });
            setTimeout(() => { 
                document.getElementById('report-card-display-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } else {
            setReportApiResponse({ reportCards: [], gradeScaleInUse: data.gradeScaleInUse || [] }); // Still set scale if no reports
            toast.info(data.message || "No report data found for the selected criteria.", { id: toastId, duration: 4000 });
        }
      }
    } catch (err) {
      console.error("Error generating report:", err);
      toast.error("An unexpected error occurred while generating the report.", { id: toastId });
      setGenerationError("A system error occurred.");
    } finally {
      setIsLoadingReport(false);
    }
  };
  
  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-6">
      <Card className="shadow-md print:hidden"> {/* Filters Card - Hidden on Print */}
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5"/>Report Filters</CardTitle>
          <CardDescription>Select criteria to generate student academic reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            {/* Academic Year Select */}
            <div className="space-y-1.5">
              <Label htmlFor="report-academicYear">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={(value) => { setSelectedAcademicYear(value); setSelectedClassId(""); setReportApiResponse(null); setGenerationError(null); }}>
                <SelectTrigger id="report-academicYear" className="h-10"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {availableAcademicYears.length > 0 ? availableAcademicYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)) : <SelectItem value="" disabled>No academic years</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Term Select */}
            <div className="space-y-1.5">
              <Label htmlFor="report-term">Term/Semester</Label>
              <Select value={selectedTerm} onValueChange={(value) => {setSelectedTerm(value); setReportApiResponse(null); setGenerationError(null);}} disabled={!selectedAcademicYear}>
                <SelectTrigger id="report-term" className="h-10"><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  {termPeriodOptions.map(term => (<SelectItem key={term} value={term}>{term.replace("_", " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            {/* Class Select */}
            <div className="space-y-1.5">
              <Label htmlFor="report-class">Class</Label>
              <Select value={selectedClassId} onValueChange={(value) => {setSelectedClassId(value); setReportApiResponse(null); setGenerationError(null);}} disabled={!selectedAcademicYear || classesForSelectedYear.length === 0}>
                <SelectTrigger id="report-class" className="h-10"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classesForSelectedYear.length === 0 && selectedAcademicYear 
                    ? <SelectItem value="no-class-for-year" disabled>No classes for {selectedAcademicYear}</SelectItem> 
                    : classesForSelectedYear.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section || ""}</SelectItem>))
                  }
                </SelectContent>
              </Select>
            </div>

            {/* Student Select */}
            <div className="space-y-1.5">
              <Label htmlFor="report-student">Student</Label>
              <Select value={selectedStudentId} onValueChange={(value) => {setSelectedStudentId(value); setReportApiResponse(null); setGenerationError(null);}} disabled={!selectedClassId || isLoadingStudents}>
                <SelectTrigger id="report-student" className="h-10"><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students in Class</SelectItem>
                  {isLoadingStudents && <SelectItem value="loading-students" disabled>Loading students...</SelectItem>}
                  {!isLoadingStudents && studentsInClass.length === 0 && selectedClassId && <SelectItem value="no-students-in-class" disabled>No students in this class</SelectItem>}
                  {studentsInClass.map(student => (<SelectItem key={student.id} value={student.id}>{student.lastName}, {student.firstName} ({student.studentIdNumber})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-4 flex justify-start">
            <Button onClick={handleGenerateReport} disabled={isLoadingReport || !selectedClassId} className="min-w-[200px]">
              {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChartBig className="mr-2 h-4 w-4" />}
              Generate Report(s)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Area to display the generated report card(s) and Print Button */}
      <div id="report-card-display-area" className="mt-8 space-y-6">
        {isLoadingReport && (
            <div className="space-y-4 p-4">
                <Skeleton className="h-12 w-1/3 mb-4" /> {/* Title Skeleton */}
                <Skeleton className="h-64 w-full" />    {/* Table Skeleton */}
                <Skeleton className="h-48 w-full" />    {/* Summary/Comments Skeleton */}
            </div>
        )}
        {generationError && !isLoadingReport && (
            <Card className="border-destructive bg-destructive/10">
                <CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Report Generation Failed</CardTitle></CardHeader>
                <CardContent>
                    <p>{generationError}</p>
                    <p className="text-xs text-muted-foreground mt-2">Please check your filter selections or contact support if the issue persists.</p>
                </CardContent>
            </Card>
        )}
        {reportApiResponse && reportApiResponse.reportCards && !isLoadingReport && !generationError && (
          <>
            {reportApiResponse.reportCards.length > 0 ? (
                reportApiResponse.reportCards.map((cardData, index) => (
                <ReportCardDisplay 
                    key={cardData.student.id || index} 
                    reportCard={cardData} 
                    gradeScaleInUse={reportApiResponse.gradeScaleInUse || []} 
                />
                ))
            ) : (
                 <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground">
                        <p>No report card data found for the selected criteria.</p>
                        {reportApiResponse.message && <p className="text-xs mt-1">{reportApiResponse.message}</p>}
                    </CardContent>
                </Card>
            )}

            {/* Print button appears below all generated report cards if there are reports */}
            {reportApiResponse.reportCards.length > 0 && (
                <div className="mt-6 flex justify-center print:hidden"> 
                <Button onClick={handlePrint} size="lg" variant="outline">
                    <Printer className="mr-2 h-5 w-5" />
                    Print Generated Report(s)
                </Button>
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}