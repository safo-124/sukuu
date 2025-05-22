// File: components/schooladmin/ReportCardFilters.jsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Filter, Loader2, Printer, BarChartBig, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TermPeriod } from "@prisma/client";
import ReportCardDisplay from "./ReportCardDisplay";
import { Skeleton } from "@/components/ui/skeleton";

const termPeriodOptions = Object.values(TermPeriod);

export default function ReportCardFilters({
  schoolId,
  availableAcademicYears = [],
  availableClasses = [],
  defaultAcademicYear = "",
  defaultTerm = "",
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
  const [selectedStudentId, setSelectedStudentId] = useState(searchParamsHook.get('studentId') || "all");

  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportApiResponse, setReportApiResponse] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const classesForSelectedYear = useMemo(() => {
    if (!selectedAcademicYear) return [];
    return availableClasses.filter(cls => cls.academicYear === selectedAcademicYear);
  }, [availableClasses, selectedAcademicYear]);

  useEffect(() => {
    if (selectedClassId && selectedAcademicYear) {
      const cls = availableClasses.find(c => c.id === selectedClassId);
      if (cls && cls.academicYear === selectedAcademicYear) {
        setIsLoadingStudents(true);
        setStudentsInClass([]);
        setSelectedStudentId("all");
        setReportApiResponse(null);
        setGenerationError(null);
        fetch(`/api/schooladmin/${schoolId}/classes/${selectedClassId}/students-basic`)
          .then(res => {
            if (!res.ok) throw new Error(`Failed to fetch students (${res.status})`);
            return res.json();
          })
          .then(data => {
            if (Array.isArray(data)) setStudentsInClass(data);
            else { toast.error(data.error || "Received invalid student data."); setStudentsInClass([]); }
          })
          .catch(err => { console.error("Error fetching students:", err); toast.error("Error loading students."); setStudentsInClass([]); })
          .finally(() => setIsLoadingStudents(false));
      } else if (selectedClassId) {
        setSelectedClassId(""); setStudentsInClass([]); setSelectedStudentId("all");
      }
    } else {
      setStudentsInClass([]); setSelectedStudentId("all");
    }
  }, [selectedClassId, selectedAcademicYear, schoolId, availableClasses]);

  const handleGenerateReport = async () => {
    if (!selectedAcademicYear || !selectedTerm || !selectedClassId) {
      toast.error("Please select Academic Year, Term, and Class."); return;
    }
    setIsLoadingReport(true); setReportApiResponse(null); setGenerationError(null);
    const toastId = toast.loading("Generating report card(s)...");
    const query = new URLSearchParams({
        academicYear: selectedAcademicYear, term: selectedTerm, classId: selectedClassId, studentId: selectedStudentId,
    });
    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/reports/student-term-report?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error || "Failed to generate report.", { id: toastId, duration: 5000 });
        setGenerationError(data.error || "An unknown error occurred.");
      } else {
        setReportApiResponse(data);
        toast.success("Report(s) generated successfully!", { id: toastId });
        setTimeout(() => { document.getElementById('report-card-printable-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
      }
    } catch (err) {
      console.error("Error generating report:", err);
      toast.error("An unexpected error occurred.", { id: toastId });
      setGenerationError("A system error occurred.");
    } finally {
      setIsLoadingReport(false);
    }
  };
  
  const handlePrint = () => { window.print(); };

  return (
    <div className="space-y-6">
      {/* Filters Card - Add no-print class */}
      <Card className="shadow-md no-print"> 
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-6 w-6" />Select Report Criteria</CardTitle>
          <CardDescription>Choose parameters to generate reports.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ... (Your Select dropdowns for filters as before) ... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={(value) => { setSelectedAcademicYear(value); setSelectedClassId(""); setReportApiResponse(null); setGenerationError(null);}}>
                <SelectTrigger id="academicYear" className="h-10"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>
                  {availableAcademicYears.length > 0 ? availableAcademicYears.map(year => (<SelectItem key={year} value={year}>{year}</SelectItem>)) : <SelectItem value="" disabled>No years available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="term">Term/Semester</Label>
              <Select value={selectedTerm} onValueChange={(value) => {setSelectedTerm(value); setReportApiResponse(null); setGenerationError(null);}} disabled={!selectedAcademicYear}>
                <SelectTrigger id="term" className="h-10"><SelectValue placeholder="Select Term" /></SelectTrigger>
                <SelectContent>
                  {termPeriodOptions.map(term => (<SelectItem key={term} value={term}>{term.replace("_", " ")}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class">Class</Label>
              <Select value={selectedClassId} onValueChange={(value) => {setSelectedClassId(value); setReportApiResponse(null); setGenerationError(null);}} disabled={!selectedAcademicYear || classesForSelectedYear.length === 0}>
                <SelectTrigger id="class" className="h-10"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classesForSelectedYear.length === 0 && selectedAcademicYear 
                    ? <SelectItem value="no-class" disabled>No classes for {selectedAcademicYear}</SelectItem> 
                    : classesForSelectedYear.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section || ""}</SelectItem>))
                  }
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="student">Student</Label>
              <Select value={selectedStudentId} onValueChange={(value) => {setSelectedStudentId(value); setReportApiResponse(null); setGenerationError(null);}} disabled={!selectedClassId || isLoadingStudents}>
                <SelectTrigger id="student" className="h-10"><SelectValue placeholder="Select Student" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students in Class</SelectItem>
                  {isLoadingStudents && <SelectItem value="loading" disabled>Loading students...</SelectItem>}
                  {!isLoadingStudents && studentsInClass.length === 0 && selectedClassId && <SelectItem value="no-students" disabled>No students in class</SelectItem>}
                  {studentsInClass.map(student => (<SelectItem key={student.id} value={student.id}>{student.lastName}, {student.firstName} ({student.studentIdNumber})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-4">
            <Button onClick={handleGenerateReport} disabled={isLoadingReport || !selectedClassId} className="w-full sm:w-auto">
              {isLoadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChartBig className="mr-2 h-4 w-4" />}
              Generate Report(s)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Area to display the generated report card(s) */}
      <div id="report-card-printable-area" className="mt-8 space-y-6">
        {isLoadingReport && ( /* ... Skeleton UI ... */ 
             <div className="space-y-4">
                <Skeleton className="h-32 w-full" /> <Skeleton className="h-64 w-full" /> <Skeleton className="h-48 w-full" />
            </div>
        )}
        {generationError && !isLoadingReport && ( /* ... Error Card ... */ 
            <Card className="border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center gap-2"><AlertTriangle/>Report Generation Failed</CardTitle></CardHeader><CardContent><p>{generationError}</p></CardContent></Card>
        )}
        {reportApiResponse && reportApiResponse.reportCards && reportApiResponse.reportCards.length > 0 && !isLoadingReport && !generationError && (
          <>
            {reportApiResponse.reportCards.map((cardData, index) => (
              <ReportCardDisplay 
                key={cardData.student.id || index} 
                reportCard={cardData} 
                gradeScaleInUse={reportApiResponse.gradeScaleInUse || []} 
              />
            ))}
            {/* Print button container - also hide on print */}
            <div className="mt-6 flex justify-center no-print"> 
              <Button onClick={handlePrint} size="lg" variant="outline">
                <Printer className="mr-2 h-5 w-5" />
                Print Generated Report(s)
              </Button>
            </div>
          </>
        )}
        {reportApiResponse && (!reportApiResponse.reportCards || reportApiResponse.reportCards.length === 0) && !isLoadingReport && !generationError && (
             <Card><CardContent className="pt-6 text-center text-muted-foreground"><p>No report card data found for the selected criteria.</p>{reportApiResponse.message && <p className="text-xs mt-1">{reportApiResponse.message}</p>}</CardContent></Card>
        )}
      </div>
    </div>
  );
}