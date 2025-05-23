// File: components/schooladmin/SchoolPeriodsManager.jsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Edit3, Trash2, Loader2, Save, ShieldAlert, GripVertical, Clock4 } from "lucide-react"; // Added GripVertical for drag (future)

import { schoolPeriodSchema, updateSchoolPeriodSchema } from "@/lib/validators/timetableValidators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
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
import { Badge } from "../ui/badge";

// Helper to convert HH:MM to total minutes
const timeToMinutes = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to format time for display (optional, input type=time handles it)
// const formatTime = (timeStr) => timeStr; // Placeholder

export default function SchoolPeriodsManager({ schoolId, initialPeriods = [] }) {
  const router = useRouter();
  const [periods, setPeriods] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentPeriodToEdit, setCurrentPeriodToEdit] = useState(null);

  const [periodToDelete, setPeriodToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const sortedPeriods = [...initialPeriods].sort((a, b) => a.sortOrder - b.sortOrder);
    setPeriods(sortedPeriods);
  }, [initialPeriods]);

  const formSchema = currentPeriodToEdit ? updateSchoolPeriodSchema : schoolPeriodSchema;
  
  const getFormDefaults = useCallback((period) => {
    if (period) { // Editing
        return {
            name: period.name || "",
            startTime: period.startTime || "00:00",
            endTime: period.endTime || "00:00",
            sortOrder: period.sortOrder?.toString() || "0", // Input type number needs string
            isBreak: typeof period.isBreak === 'boolean' ? period.isBreak : false,
        };
    }
    // Adding new - suggest next sortOrder
    const nextSortOrder = periods.length > 0 ? Math.max(...periods.map(p => p.sortOrder)) + 1 : 0;
    return { 
        name: "", startTime: "08:00", endTime: "08:40", 
        sortOrder: nextSortOrder.toString(), 
        isBreak: false 
    };
  }, [periods]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: getFormDefaults(null),
  });

  const handleOpenFormDialog = useCallback((period = null) => {
    setCurrentPeriodToEdit(period);
    form.reset(getFormDefaults(period));
    setIsFormDialogOpen(true);
  }, [form, getFormDefaults]);

  const processPeriodForm = async (values) => {
    setIsSaving(true);
    const actionVerb = currentPeriodToEdit ? "Updating" : "Creating";
    const toastId = toast.loading(`${actionVerb} school period...`);

    const payload = {
      ...values,
      sortOrder: parseInt(values.sortOrder, 10), // Ensure it's a number
      isBreak: !!values.isBreak, // Ensure it's a boolean
    };

    const apiEndpoint = currentPeriodToEdit
      ? `/api/schooladmin/${schoolId}/timetable/periods/${currentPeriodToEdit.id}`
      : `/api/schooladmin/${schoolId}/timetable/periods`;
    const httpMethod = currentPeriodToEdit ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to save period.", { id: toastId, duration: 5000 });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
              toast.error(`Error: ${messages.join(", ")}`, {id: toastId, duration: 5000});
            }
          }
        }
      } else {
        toast.success(result.message || "School period saved!", { id: toastId });
        setIsFormDialogOpen(false);
        setCurrentPeriodToEdit(null);
        router.refresh();
      }
    } catch (error) {
      console.error("Period form submission error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const openDeleteConfirmation = (period) => {
    setPeriodToDelete({ id: period.id, name: period.name });
  };

  const handleConfirmDeletePeriod = async () => {
    if (!periodToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading(`Deleting period "${periodToDelete.name}"...`);
    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/timetable/periods/${periodToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Failed to delete period.", { id: toastId });
      } else {
        toast.success(result.message || "Period deleted.", { id: toastId });
        router.refresh();
      }
    } catch (err) {
      toast.error("An error occurred.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setPeriodToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Define the standard time slots for school days. These will be used to build timetables.
        </p>
        <Button onClick={() => handleOpenFormDialog(null)} size="sm" variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Period
        </Button>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-10 border rounded-lg bg-muted/20 dark:bg-muted/10">
          <Clock4 className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground">No school periods defined yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Click "Add New Period" to get started.</p>
        </div>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">School Time Periods</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px] text-center">Order</TableHead>
                <TableHead>Period Name</TableHead>
                <TableHead className="w-[120px] text-center">Start Time</TableHead>
                <TableHead className="w-[120px] text-center">End Time</TableHead>
                <TableHead className="w-[100px] text-center">Type</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((period) => (
                <TableRow key={period.id}>
                  <TableCell className="text-center font-medium">{period.sortOrder}</TableCell>
                  <TableCell className="font-semibold">{period.name}</TableCell>
                  <TableCell className="text-center">{period.startTime}</TableCell>
                  <TableCell className="text-center">{period.endTime}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={period.isBreak ? "secondary" : "outline"}>
                      {period.isBreak ? "Break" : "Teaching"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenFormDialog(period)} className="mr-1 h-8 w-8" title="Edit Period">
                      <Edit3 className="h-4 w-4" /> <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteConfirmation(period)} className="text-destructive hover:text-destructive h-8 w-8" title="Delete Period">
                      <Trash2 className="h-4 w-4" /> <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog for Add/Edit School Period Form */}
      <Dialog open={isFormDialogOpen} onOpenChange={(open) => { if(!isSaving) {setIsFormDialogOpen(open); if (!open) setCurrentPeriodToEdit(null); }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentPeriodToEdit ? "Edit School Period" : "Add New School Period"}</DialogTitle>
            <DialogDescription>
              {currentPeriodToEdit ? "Modify the details for this time slot." : "Define a new time slot for the school day."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processPeriodForm)} className="space-y-4 py-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Period Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Period 1, Lunch" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem><FormLabel>Start Time <span className="text-destructive">*</span></FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem><FormLabel>End Time <span className="text-destructive">*</span></FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="sortOrder" render={({ field }) => (
                <FormItem><FormLabel>Sort Order <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" placeholder="e.g., 1, 2, 3" {...field} /></FormControl><FormDescription>Determines sequence in timetable.</FormDescription><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="isBreak" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-6">
                  <div className="space-y-0.5"><FormLabel>Is this a break time?</FormLabel><FormDescription>Break periods are typically excluded from subject scheduling.</FormDescription></div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <DialogFooter className="pt-4">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSaving}>Cancel</Button></DialogClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {currentPeriodToEdit ? "Save Changes" : "Add Period"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation */}
      {periodToDelete && (
        <AlertDialog open={!!periodToDelete} onOpenChange={(open) => { if(!isDeleting) setPeriodToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the period: <strong className="px-1 font-semibold">{periodToDelete.name} ({periodToDelete.startTime}-{periodToDelete.endTime})</strong>? 
                This might affect existing timetable structures if this period definition is in use.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPeriodToDelete(null)} disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeletePeriod} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Yes, delete period
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}