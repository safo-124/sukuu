// File: components/schooladmin/MarksEntryTable.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // For router.refresh()
import { toast } from "sonner";
import { Save, Loader2, AlertCircle } from "lucide-react";

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
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label"; // For better accessibility with inputs
import { cn } from "@/lib/utils";

export default function MarksEntryTable({
  assessmentId,
  maxMarks,
  initialStudentsWithMarks = [], // Ensure it defaults to an array
  schoolId, // Needed for API endpoint construction if not already part of assessmentId route
}) {
  const router = useRouter();
  const [marksData, setMarksData] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({}); // To store per-student errors { studentId: "error message" }

  useEffect(() => {
    // Initialize marksData from props, ensuring marksObtained is a string for input fields
    setMarksData(
      initialStudentsWithMarks.map(student => ({
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        studentIdNumber: student.studentIdNumber,
        profilePictureUrl: student.profilePictureUrl,
        // Ensure marksObtained is a string for controlled input, handle null/undefined
        marksObtained: student.marksObtained === null || student.marksObtained === undefined ? "" : String(student.marksObtained),
        remarks: student.remarks || "",
      }))
    );
  }, [initialStudentsWithMarks]);

  const handleMarkChange = (studentId, value) => {
    const newErrors = { ...errors };
    let numericValue = parseFloat(value);

    if (value === "") { // Allow clearing the input
      newErrors[studentId] = undefined; // Clear error if input is empty
    } else if (isNaN(numericValue)) {
      newErrors[studentId] = "Must be a number.";
      numericValue = undefined; // Don't update state with NaN
    } else if (numericValue < 0) {
      newErrors[studentId] = "Marks cannot be negative.";
    } else if (numericValue > maxMarks) {
      newErrors[studentId] = `Max marks: ${maxMarks}.`;
    } else {
      newErrors[studentId] = undefined; // Clear error
    }
    setErrors(newErrors);

    setMarksData((prevData) =>
      prevData.map((entry) =>
        entry.studentId === studentId ? { ...entry, marksObtained: value } : entry
      )
    );
  };

  const handleRemarkChange = (studentId, value) => {
    setMarksData((prevData) =>
      prevData.map((entry) =>
        entry.studentId === studentId ? { ...entry, remarks: value } : entry
      )
    );
  };

  const handleSaveAllMarks = async () => {
    // Check for any existing client-side validation errors
    const hasErrors = Object.values(errors).some(error => error !== undefined);
    if (hasErrors) {
      toast.error("Please correct the errors in the marks entered.");
      return;
    }

    setIsSubmitting(true);
    const submissionToast = toast.loading("Saving marks...");

    const payloadMarks = marksData.map(entry => ({
      studentId: entry.studentId,
      // Convert to float for API, or null if empty. API Zod schema handles optional.
      marksObtained: entry.marksObtained === "" ? null : parseFloat(entry.marksObtained),
      remarks: entry.remarks === "" ? null : entry.remarks,
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
        // Handle field-specific errors from API if any (e.g., result.invalidEntries)
        if (result.invalidEntries || result.invalidStudentIds) {
            const serverErrors = {};
            (result.invalidEntries || result.invalidStudentIds || []).forEach(studentIdWithError => {
                serverErrors[studentIdWithError] = "Invalid mark or student data from server.";
            });
            setErrors(prev => ({...prev, ...serverErrors}));
        }

      } else {
        toast.success(result.message || `${marksData.length} marks saved successfully!`, { id: submissionToast });
        // Optionally refresh to get any generated IDs or server-calculated grades
        router.refresh(); 
      }
    } catch (error) {
      console.error("Save marks error:", error);
      toast.error("An unexpected error occurred while saving marks.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <Table>
          <TableCaption className="mt-4 sr-only">Marks entry table for students.</TableCaption>
          <TableHeader className="bg-muted/50 dark:bg-muted/30">
            <TableRow>
              <TableHead className="w-[50px] px-2 py-3">Avatar</TableHead>
              <TableHead className="min-w-[150px] py-3 px-4">Student Name</TableHead>
              <TableHead className="min-w-[120px] py-3 px-4">Student ID</TableHead>
              <TableHead className="w-[150px] py-3 px-4 text-center">Marks Obtained ({maxMarks})</TableHead>
              <TableHead className="min-w-[200px] py-3 px-4">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {marksData.map((entry, index) => (
              <TableRow key={entry.studentId} className="hover:bg-muted/20 dark:hover:bg-muted/10">
                <TableCell className="px-2 py-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={entry.profilePictureUrl || undefined} alt={`${entry.firstName} ${entry.lastName}`} />
                    <AvatarFallback>{entry.firstName?.[0]}{entry.lastName?.[0]}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium py-3 px-4">
                  {entry.lastName}, {entry.firstName} {entry.middleName || ""}
                </TableCell>
                <TableCell className="text-muted-foreground py-3 px-4">{entry.studentIdNumber}</TableCell>
                <TableCell className="py-2 px-4">
                  <Label htmlFor={`marks-${entry.studentId}`} className="sr-only">Marks for {entry.firstName}</Label>
                  <Input
                    id={`marks-${entry.studentId}`}
                    type="number"
                    step="0.01" // Allows decimal marks
                    min="0"
                    max={maxMarks}
                    placeholder={`0 - ${maxMarks}`}
                    value={entry.marksObtained}
                    onChange={(e) => handleMarkChange(entry.studentId, e.target.value)}
                    className={cn("w-full text-center", errors[entry.studentId] && "border-destructive focus-visible:ring-destructive")}
                    disabled={isSubmitting}
                  />
                  {errors[entry.studentId] && (
                    <p className="text-xs text-destructive mt-1 flex items-center">
                        <AlertCircle size={14} className="mr-1"/> {errors[entry.studentId]}
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
                    className="min-h-[40px] resize-none" // Allow slight resize
                    disabled={isSubmitting}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end mt-6">
        <Button onClick={handleSaveAllMarks} disabled={isSubmitting || Object.values(errors).some(e => !!e)} size="lg">
          {isSubmitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Save className="mr-2 h-5 w-5" />
          )}
          Save All Marks
        </Button>
      </div>
    </div>
  );
}