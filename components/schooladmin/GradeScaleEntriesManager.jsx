// File: components/schooladmin/GradeScaleEntriesManager.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusCircle, Edit3, Trash2, Loader2, Save, ShieldAlert } from "lucide-react";

import { gradeScaleEntrySchema } from "@/lib/validators/gradeScaleValidators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Add if not already present
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

// Define the type for a GradeScaleEntry (mirroring Prisma but for client state)
// type GradeScaleEntry = {
//   id?: string; // Optional for new entries
//   minPercentage: number;
//   maxPercentage: number;
//   gradeLetter: string;
//   gradePoint?: number | null;
//   remark?: string | null;
// };

export default function GradeScaleEntriesManager({ schoolId, scaleId, initialEntries = [] }) {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentEntry, setCurrentEntry] = useState(null); // For editing, null for adding

  const [entryToDelete, setEntryToDelete] = useState(null); // { id, gradeLetter }

  // Initialize and sort entries
  useEffect(() => {
    const sortedEntries = [...initialEntries].sort((a, b) => a.minPercentage - b.minPercentage);
    setEntries(sortedEntries);
  }, [initialEntries]);

  const form = useForm({
    resolver: zodResolver(gradeScaleEntrySchema),
    defaultValues: {
      minPercentage: "",
      maxPercentage: "",
      gradeLetter: "",
      gradePoint: "",
      remark: "",
    },
  });

  const handleAddNewEntry = () => {
    form.reset({ // Reset with empty values for a new entry
      minPercentage: "", maxPercentage: "", gradeLetter: "", gradePoint: "", remark: ""
    });
    setCurrentEntry(null); // Ensure it's in "add new" mode
    setIsFormDialogOpen(true);
  };

  const handleEditEntry = (entry) => {
    form.reset({
      minPercentage: entry.minPercentage?.toString() || "",
      maxPercentage: entry.maxPercentage?.toString() || "",
      gradeLetter: entry.gradeLetter || "",
      gradePoint: entry.gradePoint?.toString() || "",
      remark: entry.remark || "",
    });
    setCurrentEntry(entry); // Set entry being edited (contains its ID)
    setIsFormDialogOpen(true);
  };

  const openDeleteDialog = (entry) => {
    setEntryToDelete({ id: entry.id, gradeLetter: entry.gradeLetter });
  };

  const processEntryForm = async (values) => {
    setIsSavingEntry(true);
    const actionVerb = currentEntry ? "Updating" : "Adding";
    const toastId = toast.loading(`${actionVerb} grade entry...`);

    const payload = {
      minPercentage: parseFloat(values.minPercentage),
      maxPercentage: parseFloat(values.maxPercentage),
      gradeLetter: values.gradeLetter,
      gradePoint: values.gradePoint !== "" && values.gradePoint !== null && values.gradePoint !== undefined ? parseFloat(values.gradePoint) : null,
      remark: values.remark === "" ? null : values.remark,
    };

    const apiEndpoint = currentEntry
      ? `/api/schooladmin/${schoolId}/academics/grading/scales/${scaleId}/entries/${currentEntry.id}`
      : `/api/schooladmin/${schoolId}/academics/grading/scales/${scaleId}/entries`;
    const httpMethod = currentEntry ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to save grade entry.", { id: toastId });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in form.control._fields) {
              form.setError(field, { type: "server", message: messages.join(", ") });
            }
          }
        }
      } else {
        toast.success(result.message || "Grade entry saved successfully!", { id: toastId });
        setIsFormDialogOpen(false);
        setCurrentEntry(null);
        router.refresh(); // Re-fetch entries from server on parent page
      }
    } catch (error) {
      console.error("Grade entry submission error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleConfirmDeleteEntry = async () => {
    if (!entryToDelete) return;
    setIsDeletingEntry(true);
    const toastId = toast.loading(`Deleting entry "${entryToDelete.gradeLetter}"...`);

    try {
      const response = await fetch(`/api/schooladmin/${schoolId}/academics/grading/scales/${scaleId}/entries/${entryToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to delete entry.", { id: toastId });
      } else {
        toast.success(result.message || "Entry deleted successfully.", { id: toastId });
        setEntries(prev => prev.filter(e => e.id !== entryToDelete.id)); // Optimistic UI update
        router.refresh(); // Or rely purely on refresh
      }
    } catch (error) {
      console.error("Delete entry error:", error);
      toast.error("An unexpected error occurred.", { id: toastId });
    } finally {
      setIsDeletingEntry(false);
      setEntryToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleAddNewEntry} size="sm">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Grade Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No grade entries defined for this scale yet. Click "Add Grade Entry" to start.
        </p>
      ) : (
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableCaption className="sr-only">Grade scale entries</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">Min %</TableHead>
                <TableHead className="text-center">Max %</TableHead>
                <TableHead>Grade Letter</TableHead>
                <TableHead className="text-center">Grade Point</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-center font-medium">{entry.minPercentage.toFixed(2)}</TableCell>
                  <TableCell className="text-center font-medium">{entry.maxPercentage.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">{entry.gradeLetter}</TableCell>
                  <TableCell className="text-center">{entry.gradePoint ?? "N/A"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{entry.remark || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditEntry(entry)} className="mr-1 h-8 w-8">
                      <Edit3 className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(entry)} className="text-destructive hover:text-destructive h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog for Add/Edit Grade Scale Entry Form */}
      <Dialog open={isFormDialogOpen} onOpenChange={(open) => {
          if (!open) setCurrentEntry(null); // Clear currentEntry when dialog closes
          setIsFormDialogOpen(open);
          if (!open) form.reset(getFormDefaultValues(null)); // Reset form on close if not submitting
      }}>
        <DialogContent className="sm:max-w-[550px]"> {/* Wider dialog */}
          <DialogHeader>
            <DialogTitle>{currentEntry ? "Edit Grade Entry" : "Add New Grade Entry"}</DialogTitle>
            <DialogDescription>
              {currentEntry ? "Modify the details for this grade range." : "Define a new grade range, letter, point, and remark."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(processEntryForm)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="minPercentage" render={({ field }) => (
                    <FormItem><FormLabel>Min % <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 90" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="maxPercentage" render={({ field }) => (
                    <FormItem><FormLabel>Max % <span className="text-destructive">*</span></FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 100" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="gradeLetter" render={({ field }) => (
                  <FormItem><FormLabel>Grade Letter <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., A+, Distinction" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="gradePoint" render={({ field }) => (
                  <FormItem><FormLabel>Grade Point (Optional)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="e.g., 4.0" {...field} /></FormControl><FormDescription>For GPA calculation, if applicable.</FormDescription><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="remark" render={({ field }) => (
                  <FormItem><FormLabel>Remark (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Excellent, Good Effort" {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSavingEntry}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSavingEntry}>
                  {isSavingEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {currentEntry ? "Save Changes" : "Add Entry"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog for Delete Confirmation */}
      {entryToDelete && (
        <AlertDialog open={!!entryToDelete} onOpenChange={(open) => { if (!open && !isDeletingEntry) setEntryToDelete(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the grade entry for: <strong className="px-1 font-semibold">{entryToDelete.gradeLetter}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEntryToDelete(null)} disabled={isDeletingEntry}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeleteEntry} disabled={isDeletingEntry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {isDeletingEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Yes, delete entry
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}