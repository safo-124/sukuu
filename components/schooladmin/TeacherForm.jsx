// File: components/schooladmin/TeacherForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, Save, CalendarIcon } from "lucide-react";
import { format } from 'date-fns/format'; // Correct specific import

import { createTeacherSchema, updateTeacherSchema } from "@/lib/validators/teacherValidators"; // Ensure these are correctly defined
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export default function TeacherForm({ schoolId, initialData, onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  // Choose schema based on mode. Email is not part of updateTeacherSchema by default if omitted.
  // If updateTeacherSchema includes email (e.g. as optional), then form will try to validate it.
  // For now, assuming updateTeacherSchema is defined appropriately for teacher updates.
  const currentSchema = isEditMode ? updateTeacherSchema : createTeacherSchema;


  const getFormDefaultValues = (data) => {
    const defaults = {
      firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
      phoneNumber: "", profilePictureUrl: "", teacherIdNumber: "",
      dateOfJoining: "", // Default to empty string for date picker placeholder
      qualifications: "", specialization: "",
    };

    if (!data) { // Create mode
      defaults.dateOfJoining = format(new Date(), "yyyy-MM-dd"); // Default joining date to today for new teachers
      return defaults;
    }

    // Edit mode: Populate from initialData
    return {
      firstName: data.user?.firstName || "",
      lastName: data.user?.lastName || "",
      email: data.user?.email || "", // Email will be disabled in the form for edit mode
      password: "", // Password fields are for setting initial or changing, not pre-filled
      confirmPassword: "",
      phoneNumber: data.user?.phoneNumber || "",
      profilePictureUrl: data.user?.profilePicture || "", // Ensure field name matches your User model for profile picture
      teacherIdNumber: data.teacherIdNumber || "",
      dateOfJoining: data.dateOfJoining ? format(new Date(data.dateOfJoining), "yyyy-MM-dd") : "",
      qualifications: data.qualifications || "",
      specialization: data.specialization || "",
    };
  };

  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: getFormDefaultValues(initialData),
    // mode: "onChange", // Uncomment for testing validation feedback
  });
  
  useEffect(() => {
    // Reset form when initialData changes (e.g., when navigating to edit another teacher)
    form.reset(getFormDefaultValues(initialData));
  }, [initialData, form]);


  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Registering";
    const submissionToast = toast.loading(`${actionVerb} teacher...`);

    // Prepare payload: remove confirmPassword, handle optional password for edit
    let payload = { ...values };
    delete payload.confirmPassword; 

    if (isEditMode) {
      // If password field is empty in edit mode, don't send it, meaning password is not being changed.
      if (!values.password || values.password === "") {
        delete payload.password;
      }
      // Email is disabled in the form, so it won't be part of 'values' if HTML respects disabled.
      // If it somehow is, and you don't want to update it, ensure API or updateTeacherSchema handles it.
      // For now, assuming form structure prevents email submission on edit.
      // Or, explicitly delete it if your updateTeacherSchema omits it or it shouldn't be sent.
      // delete payload.email; 
    }

    const apiEndpoint = isEditMode 
      ? `/api/schooladmin/${schoolId}/staff/teachers/${initialData.id}` // initialData.id is Teacher.id
      : `/api/schooladmin/${schoolId}/staff/teachers`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'register'} teacher.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            // Check if field actually exists in the form before trying to set an error
            if (field in form.control._fields) {
                 form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
                // Handle general errors not specific to a form field, perhaps by showing a global toast
                console.warn(`API returned error for unmapped field or general error: "${field}": ${messages.join(", ")}`);
                // Potentially add to a general form error display if you have one
            }
          }
        }
      } else {
        toast.success(result.message || `Teacher ${isEditMode ? 'updated' : 'registered'} successfully!`, { id: submissionToast });
        if (!isEditMode) {
            form.reset(getFormDefaultValues(null)); // Reset to blank for create mode
        }
        
        if (onFormSubmit) { // Optional callback for parent component
            onFormSubmit(result.teacher);
        }
        
        router.push(`/${schoolId}/schooladmin/staff/teachers`); // Navigate to teachers list
        router.refresh(); // Ensures the list page re-fetches data
      }
    } catch (error) {
      console.error("Teacher form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Account Credentials */}
        <section>
          <h3 className="text-xl font-semibold text-foreground mb-6 border-b pb-3">Account Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Abena" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Asante" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <div className="mt-4"> {/* Email field full width */}
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address <span className="text-destructive">*</span></FormLabel><FormControl><Input type="email" placeholder="teacher.name@example.com" {...field} disabled={isEditMode || isSubmitting} /></FormControl><FormDescription>{isEditMode ? "Email address cannot be changed." : "This will be their login email."}</FormDescription><FormMessage /></FormItem>)} />
          </div>
          
          {/* Password fields are shown only in create mode or if a "change password" flow is explicitly initiated in edit mode */}
          {/* For this version, we simplify: password fields only for create mode. */}
          {!isEditMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
              <FormField control={form.control} name="password" render={({ field }) => (<FormItem><FormLabel>Password <span className="text-destructive">*</span></FormLabel><FormControl><Input type="password" placeholder="Minimum 8 characters" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm Password <span className="text-destructive">*</span></FormLabel><FormControl><Input type="password" placeholder="Re-type password" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            </div>
          )}
        </section>

        {/* Section 2: Contact & Profile Picture */}
        <section>
          <h3 className="text-xl font-semibold text-foreground mb-6 border-b pb-3">Contact & Profile Picture</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField control={form.control} name="phoneNumber" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input type="tel" placeholder="+233 XX XXX XXXX" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="profilePictureUrl" render={({ field }) => (<FormItem><FormLabel>Profile Picture URL</FormLabel><FormControl><Input type="url" placeholder="https://example.com/path/to/photo.png" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Direct link to a publicly accessible photo (optional).</FormDescription><FormMessage /></FormItem>)} />
          </div>
        </section>
        
        {/* Section 3: Professional Details */}
        <section>
          <h3 className="text-xl font-semibold text-foreground mb-6 border-b pb-3">Professional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField control={form.control} name="teacherIdNumber" render={({ field }) => (<FormItem><FormLabel>Teacher ID Number</FormLabel><FormControl><Input placeholder="e.g., TCH-00123" {...field} disabled={isSubmitting} /></FormControl><FormDescription>School-specific ID, if applicable.</FormDescription><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="dateOfJoining" render={({ field }) => (
              <FormItem className="flex flex-col pt-2"> {/* Added pt-2 for better alignment with label */}
                <FormLabel>Date of Joining</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("h-10 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 30} toYear={new Date().getFullYear() + 5} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="mt-4">
            <FormField control={form.control} name="specialization" render={({ field }) => (<FormItem><FormLabel>Primary Specialization(s)</FormLabel><FormControl><Input placeholder="e.g., Mathematics, Physics, Lower Primary" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Main subject(s) or area(s) of expertise.</FormDescription><FormMessage /></FormItem>)} />
          </div>
          <div className="mt-4">
            <FormField control={form.control} name="qualifications" render={({ field }) => (<FormItem><FormLabel>Qualifications & Experience</FormLabel><FormControl><Textarea placeholder="List relevant degrees, certifications, teaching experience, etc." {...field} rows={5} disabled={isSubmitting} /></FormControl><FormDescription>Provide a summary of qualifications and relevant experience.</FormDescription><FormMessage /></FormItem>)} />
          </div>
        </section>
        
        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[200px]"> {/* Increased min-width for longer text */}
            {isSubmitting ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (isEditMode ? <Save className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />)}
            {isEditMode ? "Save Teacher Changes" : "Register New Teacher"}
          </Button>
        </div>
      </form>
    </Form>
  );
}