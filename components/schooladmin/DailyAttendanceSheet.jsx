// File: components/schooladmin/DailyAttendanceSheet.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, AlertCircle, UserCircle, CheckCircle, XCircle, Clock, Info } from "lucide-react";
import { AttendanceStatus } from "@prisma/client"; // Import enums

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption, TableFooter,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

const attendanceStatusOptions = Object.values(AttendanceStatus);

// Helper function to get an appropriate icon for the status
const StatusIcon = ({ status }) => {
  switch (status) {
    case AttendanceStatus.PRESENT: return <CheckCircle className="h-4 w-4 text-green-500" />;
    case AttendanceStatus.ABSENT: return <XCircle className="h-4 w-4 text-red-500" />;
    case AttendanceStatus.LATE: return <Clock className="h-4 w-4 text-orange-500" />;
    case AttendanceStatus.EXCUSED: return <Info className="h-4 w-4 text-blue-500" />;
    default: return null;
  }
};

export default function DailyAttendanceSheet({
  schoolId,
  classId,
  targetDate, // YYYY-MM-DD string
  academicYear,
  termPeriod, // Enum string value
  initialStudentsWithAttendance = [],
}) {
  const router = useRouter();
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markAllStatus, setMarkAllStatus] = useState("");

  useEffect(() => {
    setAttendanceRecords(
      initialStudentsWithAttendance.map(student => ({
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        studentIdNumber: student.studentIdNumber,
        profilePictureUrl: student.profilePictureUrl,
        status: student.currentStatus || undefined, // Use undefined for placeholder
        remarks: student.currentRemarks || "",
      }))
    );
  }, [initialStudentsWithAttendance]);

  const handleStatusChange = useCallback((studentId, newStatus) => {
    setAttendanceRecords(prevRecords =>
      prevRecords.map(record =>
        record.studentId === studentId ? { ...record, status: newStatus } : record
      )
    );
  }, []);

  const handleRemarkChange = useCallback((studentId, newRemarks) => {
    setAttendanceRecords(prevRecords =>
      prevRecords.map(record =>
        record.studentId === studentId ? { ...record, remarks: newRemarks } : record
      )
    );
  }, []);

  const handleMarkAll = (newStatus) => {
    if (!newStatus) return;
    setAttendanceRecords(prevRecords =>
      prevRecords.map(record => ({ ...record, status: newStatus }))
    );
    setMarkAllStatus(""); 
  };

  const handleSaveAttendance = async () => {
    setIsSubmitting(true);
    const submissionToast = toast.loading("Saving attendance records...");

    const recordsToSave = attendanceRecords
      .filter(record => record.status) 
      .map(record => ({
        studentId: record.studentId,
        status: record.status, 
        remarks: record.remarks.trim() === "" ? null : record.remarks.trim(),
      }));

    if (recordsToSave.length === 0) {
      toast.info("No attendance statuses were marked to save.", { id: submissionToast });
      setIsSubmitting(false);
      return;
    }

    const payload = {
      classId: classId,
      date: targetDate,
      academicYear: academicYear,
      term: termPeriod,
      records: recordsToSave,
    };

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/attendance/daily`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to save attendance records.", { id: submissionToast, duration: 5000 });
        if (result.fieldErrors) {
          console.error("Server validation errors on attendance:", result.fieldErrors);
        }
      } else {
        toast.success(result.message || "Attendance records saved successfully!", { id: submissionToast });
        router.refresh(); 
      }
    } catch (error) {
      console.error("Save attendance error:", error);
      toast.error("An unexpected error occurred while saving attendance.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle>Attendance Sheet</CardTitle>
            <CardDescription>Mark attendance for each student below. Ensure all students are marked.</CardDescription>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[200px]">
            <Select value={markAllStatus} onValueChange={handleMarkAll} disabled={isSubmitting || attendanceRecords.length === 0}>
              <SelectTrigger id="mark-all-status" className="h-9">
                <SelectValue placeholder="Mark All As..." />
              </SelectTrigger>
              <SelectContent>
                {attendanceStatusOptions.map(status => (
                  <SelectItem key={status} value={status}>
                    Mark All As {status.replace("_", " ").toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[750px]">
            <TableCaption className="sr-only">Student attendance records.</TableCaption>
            <TableHeader className="bg-muted/30 dark:bg-muted/20">
              <TableRow>
                <TableHead className="w-[50px] px-2 py-3 sticky left-0 bg-inherit z-10">Avatar</TableHead>
                <TableHead className="min-w-[180px] py-3 px-4 sticky left-[66px] bg-inherit z-10">Student Name</TableHead>
                <TableHead className="min-w-[120px] py-3 px-4 hidden sm:table-cell">Student ID</TableHead>
                <TableHead className="w-[200px] py-3 px-4 text-center">Status</TableHead>
                <TableHead className="min-w-[250px] py-3 px-4">Remarks (Optional)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceRecords.map((record) => (
                <TableRow key={record.studentId} className="hover:bg-muted/10 dark:hover:bg-muted/5">
                  <TableCell className="px-2 py-2 sticky left-0 bg-inherit">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={record.profilePictureUrl || undefined} alt={`${record.firstName} ${record.lastName}`} />
                      <AvatarFallback>{record.firstName?.[0]}{record.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium py-3 px-4 sticky left-[66px] bg-inherit">
                    {record.lastName}, {record.firstName} {record.middleName || ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground py-3 px-4 hidden sm:table-cell">{record.studentIdNumber}</TableCell>
                  <TableCell className="py-2 px-4">
                    <Select
                      value={record.status || ""} // Use empty string for placeholder
                      onValueChange={(value) => handleStatusChange(record.studentId, value)} 
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-10 w-full sm:w-[180px]">
                        <div className="flex items-center gap-2">
                            <StatusIcon status={record.status} />
                            <SelectValue placeholder="Select status..." />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {attendanceStatusOptions.map(statusOpt => (
                          <SelectItem key={statusOpt} value={statusOpt}>
                            <div className="flex items-center gap-2">
                                <StatusIcon status={statusOpt} />
                                {statusOpt.replace("_", " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <Textarea
                      placeholder="Optional remarks..."
                      value={record.remarks}
                      onChange={(e) => handleRemarkChange(record.studentId, e.target.value)}
                      rows={1}
                      className="min-h-[40px] resize-y"
                      disabled={isSubmitting}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableFooter className="sticky bottom-0 bg-card/95 backdrop-blur-sm z-20 print:hidden">
                <TableRow>
                <TableCell colSpan={5} className="text-right py-3 px-4"> {/* Changed colSpan to 5 */}
                    <Button onClick={handleSaveAttendance} disabled={isSubmitting || attendanceRecords.length === 0} size="lg">
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-5 w-5" />
                    )}
                    Save Attendance
                    </Button>
                </TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}