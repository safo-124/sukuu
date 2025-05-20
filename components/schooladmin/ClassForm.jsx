// File: components/schooladmin/ClassForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle, Save } from "lucide-react";

// Ensure these validators are correctly defined and imported
import { createClassSchema, updateClassSchema } from "@/lib/validators/classValidators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
// Card components are usually for page structure, not directly in the form component itself unless it's self-contained.
// Assuming the parent page will wrap this form in a Card.

export default function ClassForm({
  schoolId,
  initialData, // For pre-filling in edit mode
  teachersList = [], // List of teachers for homeroom teacher dropdown
  currentSchoolAcademicYear, // School's current academic year, primarily for defaulting new classes
  onFormSubmit, // Optional callback after successful submission
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const currentZodSchema = isEditMode ? updateClassSchema : createClassSchema;

  // Function to generate default values based on mode and initialData
  const getDefaultFormValues = (data) => {
    if (isEditMode && data) {
      return {
        name: data.name || "",
        section: data.section || "",
        // Academic Year is typically not editable for an existing class record
        academicYear: data.academicYear || currentSchoolAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        homeroomTeacherId: data.homeroomTeacherId || "", // Empty string will show placeholder
      };
    }
    // Create mode
    return {
      name: "",
      section: "",
      academicYear: currentSchoolAcademicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      homeroomTeacherId: "", // Empty string for placeholder
    };
  };

  const form = useForm({
    resolver: zodResolver(currentZodSchema),
    defaultValues: getDefaultFormValues(initialData),
  });
  
  // Effect to reset form if initialData or currentSchoolAcademicYear changes
  useEffect(() => {
    form.reset(getDefaultFormValues(initialData));
  }, [initialData, currentSchoolAcademicYear, form]);


  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Creating";
    const submissionToast = toast.loading(`${actionVerb} class...`);

    // Prepare payload:
    // For optional fields like section and homeroomTeacherId, if the form submits an empty string,
    // convert it to null for Prisma to correctly unset the value if needed.
    const payload = {
        name: values.name,
        section: values.section === "" ? null : values.section,
        homeroomTeacherId: values.homeroomTeacherId === "" ? null : values.homeroomTeacherId,
    };
    
    // AcademicYear is only part of the payload for new classes, not for updates via this form.
    if (!isEditMode) {
        payload.academicYear = values.academicYear;
    }

    const apiEndpoint = isEditMode 
      ? `/api/schooladmin/${schoolId}/academics/classes/${initialData.id}` 
      : `/api/schooladmin/${schoolId}/academics/classes`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} class.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            // Check if field exists in the form before setting error
            if (field in form.control._fields) {
                 form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
                console.warn(`API error for unmapped field "${field}" or general error: ${messages.join(", ")}`);
            }
          }
        }
      } else {
        toast.success(result.message || `Class ${isEditMode ? 'updated' : 'created'} successfully!`, { id: submissionToast });
        if (!isEditMode) { // Reset form only on successful creation to create defaults
            form.reset(getDefaultFormValues(null));
        }
        
        if (onFormSubmit) { // Call parent callback if provided
            onFormSubmit(result.class);
        }
        
        router.push(`/${schoolId}/schooladmin/academics/classes`); // Navigate to classes list
        router.refresh(); // Ensures the list page re-fetches data
      }
    } catch (error) {
      console.error("Class form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField 
            control={form.control} 
            name="name" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class Name <span className="text-destructive">*</span></FormLabel>
                <FormControl><Input placeholder="e.g., Grade 1, Form 1, Class 6" {...field} disabled={isSubmitting} /></FormControl>
                <FormDescription>The main name of the class (e.g., "Primary 1", "JHS 2").</FormDescription>
                <FormMessage />
              </FormItem>
            )} 
          />
          <FormField 
            control={form.control} 
            name="section" 
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section (Optional)</FormLabel>
                <FormControl><Input placeholder="e.g., A, B, Blue, Gold" {...field} disabled={isSubmitting} /></FormControl>
                <FormDescription>Optional section identifier (e.g., "A", "Green").</FormDescription>
                <FormMessage />
              </FormItem>
            )} 
          />
        </div>

        <FormField 
          control={form.control} 
          name="academicYear" 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Academic Year <span className="text-destructive">*</span></FormLabel>
              <FormControl><Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting || isEditMode} /></FormControl>
              <FormDescription>{isEditMode ? `Academic year for this class is ${field.value}. It cannot be changed.` : "Format: YYYY-YYYY (e.g., \"2024-2025\")."}</FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />

        <FormField 
          control={form.control} 
          name="homeroomTeacherId" 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Homeroom Teacher (Optional)</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ""} // Important: use empty string for placeholder to show
                disabled={isSubmitting || teachersList.length === 0}
              >
                <FormControl>
                  <SelectTrigger className="h-11"> {/* Consistent height with inputs */}
                    <SelectValue placeholder="Assign a homeroom teacher" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {/* No <SelectItem value=""> for "no selection" - placeholder handles it */}
                  {teachersList.length === 0 ? (
                      <SelectItem value="no-teachers-placeholder" disabled> 
                          No active teachers available
                      </SelectItem>
                  ) : (
                    // Optionally, add an explicit item to unassign if desired, though not selecting anything achieves this
                    // <SelectItem value="">-- No Homeroom Teacher --</SelectItem> 
                    // The above line might cause the Radix error if value is "".
                    // A better "unassign" option if needed would be:
                    // <SelectItem value="UNASSIGN_TEACHER_VALUE_PLACEHOLDER">-- Unassign Teacher --</SelectItem>
                    // And then handle this special value in onSubmit.
                    // For now, not selecting anything means no teacher.
                    teachersList.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.user.firstName} {teacher.user.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormDescription>Select a teacher to be the primary contact for this class. Leave unselected for no assignment.</FormDescription>
              <FormMessage />
            </FormItem>
          )} 
        />
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[180px]"> {/* Adjusted min-width */}
            {isSubmitting ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (isEditMode ? <Save className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />)}
            {isEditMode ? "Save Class Changes" : "Create New Class"}
          </Button>
        </div>
      </form>
    </Form>
  );
}