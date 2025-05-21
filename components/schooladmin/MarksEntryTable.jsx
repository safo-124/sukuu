// File: components/schooladmin/MarksEntryTable.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, AlertCircle, UserCircle } from "lucide-react"; // UserCircle might not be used directly here, but fine to keep

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
  TableFooter,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Helper to format date (can be moved to a utils file)
const formatDate = (dateString, options = { year: 'numeric', month: 'short', day: 'numeric' }) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    console.warn("Invalid date string passed to formatDate:", dateString);
    return "Invalid Date";
  }
  return date.toLocaleDateString('en-US', options);
};

export default function MarksEntryTable({
  assessmentId,
  maxMarks,
  initialStudentsWithMarks = [],
  schoolId,
}) {
  const router = useRouter();
  const [marksData, setMarksData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setMarksData(
      initialStudentsWithMarks.map(student => ({
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        studentIdNumber: student.studentIdNumber,
        profilePictureUrl: student.profilePictureUrl,
        marksObtained: student.marksObtained === null || student.marksObtained === undefined 
                       ? "" 
                       : String(student.marksObtained),
        remarks: student.remarks || "",
      }))
    );
    setErrors({});
  }, [initialStudentsWithMarks]);

  const handleMarkChange = useCallback((studentId, value) => {
    setMarksData((prevData) =>
      prevData.map((entry) =>
        entry.studentId === studentId ? { ...entry, marksObtained: value.trim() } : entry
      )
    );

    const newErrors = { ...errors };
    if (value.trim() === "") {
      newErrors[studentId] = undefined;
    } else {
      const numericValue = parseFloat(value);
      if (isNaN(numericValue)) {
        newErrors[studentId] = "Marks must be a number.";
      } else if (numericValue < 0) {
        newErrors[studentId] = "Marks cannot be negative.";
      } else if (numericValue > maxMarks) {
        newErrors[studentId] = `Cannot exceed max marks (${maxMarks}).`;
      } else {
        newErrors[studentId] = undefined;
      }
    }
    setErrors(newErrors);
  }, [maxMarks, errors]);

  const handleRemarkChange = useCallback((studentId, value) => {
    setMarksData((prevData) =>
      prevData.map((entry) =>
        entry.studentId === studentId ? { ...entry, remarks: value } : entry
      )
    );
  }, []);

  // CORRECTED FUNCTION NAME HERE
  const validateAllEntriesBeforeSubmission = () => {
    let currentValidationErrors = {};
    let hasAnyError = false;
    marksData.forEach(entry => {
      const studentId = entry.studentId;
      const value = entry.marksObtained.trim();
      if (value !== "") {
        const numericValue = parseFloat(value);
        if (isNaN(numericValue)) {
          currentValidationErrors[studentId] = "Marks must be a number.";
          hasAnyError = true;
        } else if (numericValue < 0) {
          currentValidationErrors[studentId] = "Marks cannot be negative.";
          hasAnyError = true;
        } else if (numericValue > maxMarks) {
          currentValidationErrors[studentId] = `Max marks: ${maxMarks}.`;
          hasAnyError = true;
        } else {
          currentValidationErrors[studentId] = undefined;
        }
      } else {
        currentValidationErrors[studentId] = undefined;
      }
    });
    setErrors(currentValidationErrors);
    return !hasAnyError;
  };

  const handleSaveAllMarks = async () => {
    if (!validateAllEntriesBeforeSubmission()) { // Using corrected function name
      toast.error("Please correct the highlighted errors in the marks entered before saving.");
      return;
    }

    setIsSubmitting(true);
    const submissionToast = toast.loading("Saving all marks...");

    const payloadMarks = marksData.map(entry => ({
      studentId: entry.studentId,
      marksObtained: entry.marksObtained.trim() === "" ? null : parseFloat(entry.marksObtained),
      remarks: entry.remarks.trim() === "" ? null : entry.remarks.trim(),
    }));

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/grading/marks-entry/${assessmentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks: payloadMarks }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to save marks.", { id: submissionToast });
        if (result.fieldErrors || result.invalidEntries || result.invalidStudentIds) {
            const serverErrors = {...errors};
            (result.fieldErrors?.marks || []).forEach((fieldError, index) => {
                if (fieldError && fieldError.studentId && fieldError._errors) {
                    serverErrors[fieldError.studentId] = fieldError._errors.join(' ');
                }
            });
            (result.invalidEntries || result.invalidStudentIds || []).forEach(studentIdWithError => {
                serverErrors[studentIdWithError] = serverErrors[studentIdWithError] || "Invalid data from server.";
            });
            setErrors(serverErrors);
            console.error("Server validation errors:", result);
        }
      } else {
        toast.success(result.message || `${payloadMarks.length} marks saved successfully!`, { id: submissionToast });
        router.refresh(); 
      }
    } catch (error) {
      console.error("Save marks system error:", error);
      toast.error("An unexpected system error occurred while saving marks.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <Table className="min-w-[700px]">
          <TableCaption className="mt-4 sr-only">Marks entry table for students. Maximum marks: {maxMarks}</TableCaption>
          <TableHeader className="bg-muted/50 dark:bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px] px-2 py-3 sticky left-0 bg-inherit z-10">Avatar</TableHead>
              <TableHead className="min-w-[200px] py-3 px-4 sticky left-[66px] bg-inherit z-10">Student Name</TableHead>
              <TableHead className="min-w-[120px] py-3 px-4">Student ID</TableHead>
              <TableHead className="w-[180px] py-3 px-4 text-center">Marks (Out of {maxMarks})</TableHead>
              <TableHead className="min-w-[250px] py-3 px-4">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marksData.map((entry, index) => (
              <TableRow key={entry.studentId} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                <TableCell className="px-2 py-2 sticky left-0 bg-inherit z-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={entry.profilePictureUrl || undefined} alt={`${entry.firstName} ${entry.lastName}`} />
                    <AvatarFallback>{entry.firstName?.[0]}{entry.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium py-3 px-4 sticky left-[66px] bg-inherit z-0">
                  {entry.lastName}, {entry.firstName} {entry.middleName || ""}
                </TableCell>
                <TableCell className="text-muted-foreground py-3 px-4">{entry.studentIdNumber}</TableCell>
                <TableCell className="py-2 px-4">
                  <Label htmlFor={`marks-${entry.studentId}`} className="sr-only">Marks for {entry.firstName}</Label>
                  <Input
                    id={`marks-${entry.studentId}`}
                    type="number"
                    step="any"
                    min="0"
                    max={maxMarks}
                    placeholder={`0 - ${maxMarks}`}
                    value={entry.marksObtained}
                    onChange={(e) => handleMarkChange(entry.studentId, e.target.value)}
                    className={cn(
                        "w-full text-center h-10", 
                        errors[entry.studentId] && "border-destructive focus-visible:ring-destructive/50"
                    )}
                    disabled={isSubmitting}
                  />
                  {errors[entry.studentId] && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                        <AlertCircle size={14} className="shrink-0"/> {errors[entry.studentId]}
                    </p>
                  )}
                </TableCell>
                <TableCell className="py-2 px-4">
                  <Label htmlFor={`remarks-${entry.studentId}`} className="sr-only">Remarks for {entry.firstName}</Label>
                  <Textarea
                    id={`remarks-${entry.studentId}`}
                    placeholder="Optional remarks..."
                    value={entry.remarks}
                    onChange={(e) => handleRemarkChange(entry.studentId, e.target.value)}
                    rows={1}
                    className="min-h-[40px] resize-y"
                    disabled={isSubmitting}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
           <TableFooter className="sticky bottom-0 bg-card/95 backdrop-blur-sm z-20">
            <TableRow>
              <TableCell colSpan={4} className="py-3">
                <p className="text-sm text-muted-foreground">
                  Ensure all marks are entered correctly before saving. Max marks: {maxMarks}.
                </p>
              </TableCell>
              <TableCell className="text-right py-3 px-4">
                <Button 
                  onClick={handleSaveAllMarks} 
                  disabled={isSubmitting || Object.values(errors).some(e => !!e)} 
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  Save All Marks
                </Button>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}