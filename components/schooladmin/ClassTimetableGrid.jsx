// File: components/schooladmin/ClassTimetableGrid.jsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusCircle, Edit3, Trash2, Loader2, Save, ShieldAlert, X, GripVertical } from "lucide-react";
import { DayOfWeek } from "@prisma/client"; 

import { timetableSlotSchema, updateTimetableSlotSchema } from "@/lib/validators/timetableValidators"; // Ensure correct path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const DISPLAY_DAYS_ORDER = [
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  // DayOfWeek.SATURDAY, // Uncomment if needed
  // DayOfWeek.SUNDAY,   // Uncomment if needed
];

const formatTimeForDisplay = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h) || isNaN(parseInt(minutes, 10))) return 'Invalid Time';
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${minutes} ${suffix}`;
};

export default function ClassTimetableGrid({
  schoolId,
  classData, 
  schoolPeriods = [], 
  initialTimetableSlots = [], 
  availableAssignments = [], 
  availableTeachers = []
}) {
  const router = useRouter();
  const [timetableSlots, setTimetableSlots] = useState({});
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentSlotContext, setCurrentSlotContext] = useState(null);
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null);
  const [isDeletingSlot, setIsDeletingSlot] = useState(false);

  useEffect(() => {
    const slotsMap = {};
    initialTimetableSlots.forEach(slot => {
      slotsMap[`${slot.dayOfWeek}-${slot.startTime}`] = slot;
    });
    setTimetableSlots(slotsMap);
  }, [initialTimetableSlots]);

  const formSchema = currentSlotContext?.existingSlotId ? updateTimetableSlotSchema : timetableSlotSchema;
  
  const getFormDefaults = useCallback((context) => {
    if (context?.existingSlotId) { // Editing existing slot
        return {
            subjectId: context.subjectId || "",
            teacherId: context.teacherId || "",
            room: context.room || "",
            // Fields set by context, not direct edit usually
            dayOfWeek: context.dayOfWeek,
            startTime: context.startTime,
            endTime: context.endTime,
            classId: classData.id,
        };
    }
    // Adding new slot
    return { 
        subjectId: "", 
        teacherId: "", 
        room: "",
        dayOfWeek: context?.dayOfWeek || "", // From cell clicked
        startTime: context?.startTime || "", // From cell clicked
        endTime: context?.endTime || "",   // From cell clicked
        classId: classData.id,           // From classData prop
    };
  }, [classData.id]);


  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getFormDefaults(null),
  });

  const handleCellClick = useCallback((day, period) => {
    if (period.isBreak) {
        toast.info("Cannot schedule subjects during a break period.");
        return;
    }
    const existingSlotKey = `${day}-${period.startTime}`;
    const existingSlot = timetableSlots[existingSlotKey];
    
    const contextData = {
        dayOfWeek: day,
        startTime: period.startTime,
        endTime: period.endTime,
        periodName: period.name,
        existingSlotId: existingSlot?.id,
        subjectId: existingSlot?.subject?.id || "",
        teacherId: existingSlot?.teacher?.id || "", // Note: existingSlot.teacher.id is the Teacher record ID
        room: existingSlot?.room || "",
    };
    setCurrentSlotContext(contextData);
    form.reset(getFormDefaults(contextData)); // Reset form with context or defaults
    setIsFormDialogOpen(true);
  }, [timetableSlots, form, getFormDefaults]); // Added getFormDefaults

  const processSlotForm = async (values) => {
    if (!currentSlotContext) return;
    setIsSavingSlot(true);
    const actionVerb = currentSlotContext.existingSlotId ? "Updating" : "Creating";
    const toastId = toast.loading(`${actionVerb} timetable slot...`);

    const payload = {
      classId: classData.id, 
      subjectId: values.subjectId,
      teacherId: values.teacherId === "" ? null : values.teacherId,
      dayOfWeek: currentSlotContext.dayOfWeek, // From context, not form values
      startTime: currentSlotContext.startTime, // From context
      endTime: currentSlotContext.endTime,     // From context
      room: values.room === "" ? null : values.room,
    };

    // For PUT, our updateTimetableSlotSchema only includes subjectId, teacherId, room as optional.
    // So, if editing, the payload should only contain what's changed and allowed by schema.
    const finalPayload = currentSlotContext.existingSlotId 
        ? { 
            subjectId: payload.subjectId, // Assuming subject can be changed for a slot, API will validate
            teacherId: payload.teacherId, 
            room: payload.room 
          } 
        : payload;


    const apiEndpoint = currentSlotContext.existingSlotId
      ? `/api/schooladmin/${schoolId}/timetable/slots/${currentSlotContext.existingSlotId}`
      : `/api/schooladmin/${schoolId}/timetable/slots`;
    const httpMethod = currentSlotContext.existingSlotId ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${actionVerb.toLowerCase()} slot.`, { id: toastId, duration: 5000 });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
              console.warn(`API error for unmapped field "${field}" or general error: ${messages.join(", ")}`);
              // A general toast might be better if field isn't directly on form
              toast.error(`Error (${field}): ${messages.join(", ")}`, { id: toastId, duration: 5000 });
            }
          }
        }
      } else {
        toast.success(result.message || "Timetable slot saved!", { id: toastId });
        setIsFormDialogOpen(false);
        setCurrentSlotContext(null);
        router.refresh(); 
      }
    } catch (error) {
      console.error("Slot submission error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSavingSlot(false);
    }
  };
  
  const openDeleteSlotDialog = (slotContext) => { // Expects context from cell click or slot data
    if (!slotContext || !slotContext.existingSlotId) { // Need existingSlotId to delete
        const slotKey = `${slotContext.dayOfWeek}-${slotContext.startTime}`;
        const actualSlotData = timetableSlots[slotKey];
        if (!actualSlotData) {
            toast.error("Cannot clear an empty slot.");
            return;
        }
        setSlotToDelete({
            id: actualSlotData.id,
            subjectName: actualSlotData.subject.name,
            teacherName: actualSlotData.teacher ? `${actualSlotData.teacher.user.firstName} ${actualSlotData.teacher.user.lastName}` : "N/A",
            day: actualSlotData.dayOfWeek,
            time: actualSlotData.startTime
        });
        return;
    }
     setSlotToDelete({ // If called from edit dialog after pre-filling currentSlotContext
        id: slotContext.existingSlotId,
        subjectName: form.getValues("subjectId") ? availableAssignments.find(a => a.subject.id === form.getValues("subjectId"))?.subject.name : "N/A",
        teacherName: form.getValues("teacherId") ? availableTeachers.find(t => t.id === form.getValues("teacherId"))?.user.firstName + " " + availableTeachers.find(t => t.id === form.getValues("teacherId"))?.user.lastName : "N/A",
        day: slotContext.dayOfWeek,
        time: slotContext.startTime
    });
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    setIsDeletingSlot(true);
    const toastId = toast.loading(`Deleting slot for ${slotToDelete.subjectName}...`);
    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/timetable/slots/${slotToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to delete slot.", { id: toastId });
      } else {
        toast.success(result.message || "Slot deleted successfully.", { id: toastId });
        router.refresh();
      }
    } catch (err) {
      toast.error("An error occurred.", { id: toastId });
    } finally {
      setIsDeletingSlot(false);
      setSlotToDelete(null);
    }
  };
  
  const getTeachersForSelectedSubject = useCallback((selectedSubjectId) => {
    if (!selectedSubjectId) return availableTeachers; // Or [] if teacher must be tied to subject assignment
    // Find all assignments for this subject (can be multiple if different teachers for same subject - though our ClassSubjectAssignment model has unique constraint on class-subject-year)
    const assignmentsForSubject = availableAssignments.filter(a => a.subject.id === selectedSubjectId);
    if (assignmentsForSubject.length > 0 && assignmentsForSubject[0].teacher) {
        // If your model ensures only one teacher per subject in a class (via ClassSubjectAssignment unique constraint),
        // then assignmentsForSubject[0].teacher is the one.
        // If multiple teachers could be assigned to the same subject within the same class (e.g. for different groups),
        // this logic would need to list all of them.
        // For now, assuming the first assignment's teacher is the primary one or only one.
        return assignmentsForSubject
            .map(a => a.teacher)
            .filter(Boolean); // Filter out any null/undefined teachers from assignments
    }
    return availableTeachers; // Fallback to all school teachers if no specific assignment found for the subject
  }, [availableAssignments, availableTeachers]);
  
  const watchedSubjectId = form.watch("subjectId");


  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Click on a time slot to add or edit an entry. Ensure subjects and teachers are assigned to this class via "Configure Class".
      </p>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px] sticky left-0 bg-card z-10">Time / Period</TableHead>
              {DISPLAY_DAYS_ORDER.map(day => (
                <TableHead key={day} className="text-center min-w-[160px]"> {/* Increased min-width for cell content */}
                  {day.charAt(0) + day.slice(1).toLowerCase().replace("_", " ")}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {schoolPeriods.map(period => (
              <TableRow key={period.id} className={cn(period.isBreak && "bg-muted/30 dark:bg-muted/20")}>
                <TableCell className="font-semibold sticky left-0 bg-card z-0 py-2 h-24"> {/* Set fixed height */}
                  <div className="text-sm">{period.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeForDisplay(period.startTime)} - {formatTimeForDisplay(period.endTime)}
                  </div>
                </TableCell> {/* <<< THIS IS THE CORRECTED LINE (added >) */}
                {DISPLAY_DAYS_ORDER.map(day => {
                  const slotKey = `${day}-${period.startTime}`;
                  const slotData = timetableSlots[slotKey];
                  return (
                    <TableCell 
                      key={slotKey} 
                      className={cn(
                        "h-24 text-center align-top p-1 border-l cursor-pointer hover:bg-accent/50", // Set fixed height
                        period.isBreak && "cursor-not-allowed bg-muted/50 hover:bg-muted/50 dark:bg-muted/40 dark:hover:bg-muted/40"
                      )}
                      onClick={() => !period.isBreak && handleCellClick(day, period)} // Only allow click if not a break
                    >
                      {slotData ? (
                        <div className="text-xs p-1 rounded-md bg-primary/10 dark:bg-primary/20 text-foreground dark:text-foreground h-full flex flex-col justify-center items-center w-full">
                          <p className="font-semibold truncate max-w-full" title={slotData.subject.name}>{slotData.subject.name}</p>
                          <p className="text-muted-foreground truncate max-w-full" title={slotData.teacher ? `${slotData.teacher.user.firstName} ${slotData.teacher.user.lastName}` : ''}>
                              {slotData.teacher ? `${slotData.teacher.user.firstName} ${slotData.teacher.user.lastName}` : <span className="italic">N/A</span>}
                          </p>
                          {slotData.room && <p className="text-muted-foreground text-[10px] truncate max-w-full">Rm: {slotData.room}</p>}
                        </div>
                      ) : (
                        !period.isBreak && <PlusCircle className="h-5 w-5 text-muted-foreground/30 mx-auto mt-1" />
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          if(isSavingSlot) return;
          setIsFormDialogOpen(open);
          if (!open) setCurrentSlotContext(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentSlotContext?.existingSlotId ? "Edit Timetable Slot" : "Add Timetable Slot"}</DialogTitle>
            <DialogDescription>
              For: {classData.name} {classData.section || ""} <br/>
              On: {currentSlotContext?.dayOfWeek.replace("_"," ").toLowerCase()} during {currentSlotContext?.periodName} ({currentSlotContext?.startTime} - {currentSlotContext?.endTime}).
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processSlotForm)} className="space-y-4 py-2">
              <FormField control={form.control} name="subjectId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject <span className="text-destructive">*</span></FormLabel>
                  <Select 
                    onValueChange={(value) => { field.onChange(value); form.setValue("teacherId", ""); /* Reset teacher on subject change */ }} 
                    value={field.value} 
                    disabled={isSavingSlot || availableAssignments.length === 0}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {availableAssignments.length === 0 ? <SelectItem value="no-assign-placeholder" disabled>No subjects assigned to this class</SelectItem> :
                       availableAssignments.map(asgn => (<SelectItem key={asgn.subject.id} value={asgn.subject.id}>{asgn.subject.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="teacherId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher <span className="text-destructive">*</span></FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""} 
                    disabled={isSavingSlot || !watchedSubjectId || getTeachersForSelectedSubject(watchedSubjectId).length === 0}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {getTeachersForSelectedSubject(watchedSubjectId).length === 0 
                        ? <SelectItem value="no-teacher-placeholder" disabled>{watchedSubjectId ? "No specific teacher assigned or available for this subject" : "Select subject first"}</SelectItem> 
                        : getTeachersForSelectedSubject(watchedSubjectId).map(t => (<SelectItem key={t.id} value={t.id}>{t.user.firstName} {t.user.lastName}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Teacher assigned to this subject for the class.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="room" render={({ field }) => (
                <FormItem><FormLabel>Room (Optional)</FormLabel><FormControl><Input placeholder="e.g., Room 101, Lab A" {...field} disabled={isSavingSlot} /></FormControl><FormMessage /></FormItem>
              )} />

              <DialogFooter className="pt-4 sm:justify-between">
                {currentSlotContext?.existingSlotId && (
                    <Button type="button" variant="destructive" onClick={() => {setIsFormDialogOpen(false); openDeleteSlotDialog(currentSlotContext);}} disabled={isSavingSlot || isDeletingSlot} className="mr-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear Slot
                    </Button>
                )}
                <div className="flex gap-2 justify-end">
                    <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingSlot}>Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSavingSlot}>
                    {isSavingSlot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {currentSlotContext?.existingSlotId ? "Update Slot" : "Add to Timetable"}
                    </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {slotToDelete && (
        <AlertDialog open={!!slotToDelete} onOpenChange={(open) => { if(!isDeletingSlot) setSlotToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Confirm Clear Slot</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to clear the timetable slot for <strong className="px-1">{slotToDelete.subjectName}</strong> on {slotToDelete.day?.replace("_"," ").toLowerCase()} at {slotToDelete.time}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSlotToDelete(null)} disabled={isDeletingSlot}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteSlot} disabled={isDeletingSlot} className="bg-destructive hover:bg-destructive/90">
                {isDeletingSlot ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Yes, Clear Slot
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}