// File: components/schooladmin/AttendanceFilterForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from 'date-fns/format';
import { CalendarIcon, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function AttendanceFilterForm({ schoolId, availableClasses = [], currentAcademicYear }) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date()); // Default to today
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // For future async actions

  // Filter classes by the school's current academic year if provided
  // Or, if `availableClasses` prop is already filtered by parent, this might not be needed
  const classesForCurrentYear = currentAcademicYear 
    ? availableClasses.filter(cls => cls.academicYear === currentAcademicYear)
    : availableClasses;

  const handleViewAttendance = () => {
    if (!selectedDate || !selectedClassId) {
      // Basic validation, can use react-hook-form for more complex forms
      alert("Please select both a date and a class.");
      return;
    }
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    // Navigate to a new page for daily attendance for that class and date
    router.push(`/${schoolId}/schooladmin/attendance/daily/${selectedClassId}/${formattedDate}`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="attendance-date">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="attendance-date"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal h-11", // Consistent height
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                // disabled={(date) => date > new Date() || date < new Date("2000-01-01")} // Optional: disable future/past dates
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="attendance-class">Class</Label>
          <Select
            value={selectedClassId}
            onValueChange={setSelectedClassId}
            disabled={classesForCurrentYear.length === 0}
          >
            <SelectTrigger id="attendance-class" className="h-11">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classesForCurrentYear.length === 0 ? (
                <SelectItem value="no-classes" disabled>
                  No classes available for {currentAcademicYear || "current year"}
                </SelectItem>
              ) : (
                classesForCurrentYear.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.section || ""} ({cls.academicYear})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleViewAttendance} className="w-full md:w-auto h-11" disabled={!selectedDate || !selectedClassId || isSubmitting}>
          <Search className="mr-2 h-4 w-4" />
          View / Mark Attendance
        </Button>
      </div>
    </div>
  );
}