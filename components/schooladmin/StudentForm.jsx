// File: components/schooladmin/StudentForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, Save, CalendarIcon } from "lucide-react";
import { format } from 'date-fns/format'; // Correct specific import
import { Gender } from "@prisma/client"; // Import Gender enum

import { createStudentSchema, updateStudentSchema } from "@/lib/validators/studentValidators"; // Adjust path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Switch } from "../ui/switch";

const genderOptions = Object.values(Gender);

export default function StudentForm({ schoolId, initialData, classes = [], onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const currentSchema = isEditMode ? updateStudentSchema : createStudentSchema;

  // Helper to prepare default values for the form
  const getFormDefaultValues = (data) => {
    const createDefaults = {
      studentIdNumber: "",
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "",
      gender: undefined,
      enrollmentDate: format(new Date(), "yyyy-MM-dd"), // Default to today
      currentClassId: "",
      address: "", city: "", stateOrRegion: "",
      country: "Ghana", // Default country
      postalCode: "",
      emergencyContactName: "", emergencyContactPhone: "",
      bloodGroup: "", allergies: "", medicalNotes: "",
      profilePictureUrl: "",
      isActive: true, // Default for new students
    };

    if (!data) return createDefaults;

    // Edit mode: Populate from initialData
    return {
      studentIdNumber: data.studentIdNumber || "", // Usually not editable
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      middleName: data.middleName || "",
      dateOfBirth: data.dateOfBirth ? format(new Date(data.dateOfBirth), "yyyy-MM-dd") : "",
      gender: data.gender || undefined,
      enrollmentDate: data.enrollmentDate ? format(new Date(data.enrollmentDate), "yyyy-MM-dd") : "",
      currentClassId: data.currentClassId || "",
      address: data.address || "",
      city: data.city || "",
      stateOrRegion: data.stateOrRegion || "",
      country: data.country || "",
      postalCode: data.postalCode || "",
      emergencyContactName: data.emergencyContactName || "",
      emergencyContactPhone: data.emergencyContactPhone || "",
      bloodGroup: data.bloodGroup || "",
      allergies: data.allergies || "",
      medicalNotes: data.medicalNotes || "",
      profilePictureUrl: data.profilePictureUrl || "",
      isActive: typeof data.isActive === 'boolean' ? data.isActive : true, // Ensure boolean for switch
    };
  };

  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: getFormDefaultValues(initialData),
  });
  
  useEffect(() => {
    form.reset(getFormDefaultValues(initialData));
  }, [initialData, form]);


  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Enrolling";
    const submissionToast = toast.loading(`${actionVerb} student...`);

    let payload = { ...values };
    // Ensure currentClassId is null if it's an empty string
    if (payload.currentClassId === "") {
      payload.currentClassId = null;
    }
    // In edit mode, studentIdNumber is typically not changed.
    // If form field is disabled, it won't be in 'values'. If it is but shouldn't be updated,
    // ensure your updateStudentSchema omits it or the API handles it.
    if (isEditMode) {
        // delete payload.studentIdNumber; // Example if studentIdNumber should never be updated
    }


    const apiEndpoint = isEditMode 
      ? `/api/schooladmin/${schoolId}/students/${initialData.id}` 
      : `/api/schooladmin/${schoolId}/students`;
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'enroll'} student.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
             if (field in form.control._fields) {
                form.setError(field, { type: "server", message: messages.join(", ") });
            } else {
                console.warn(`API error for unmapped field "${field}": ${messages.join(", ")}`);
            }
          }
        }
      } else {
        toast.success(result.message || `Student ${isEditMode ? 'updated' : 'enrolled'} successfully!`, { id: submissionToast });
        if (!isEditMode) form.reset(getFormDefaultValues(null));
        
        if (onFormSubmit) onFormSubmit(result.student);
        
        router.push(`/${schoolId}/schooladmin/students`);
        router.refresh();
      }
    } catch (error) {
      console.error("Student form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Section 1: Personal Information */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-6 border-b pb-3">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-6">
            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Adjoa" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="middleName" render={({ field }) => (<FormItem><FormLabel>Middle Name(s)</FormLabel><FormControl><Input placeholder="e.g., Kwesiwa" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Mensah" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("h-11 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={1990} toYear={new Date().getFullYear() - 2} disabled={(date) => date > new Date(new Date().setFullYear(new Date().getFullYear() - 2)) || date < new Date("1950-01-01")} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem>
                <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting}>
                  <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                  <SelectContent>{genderOptions.map(g => (<SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase().replace("_", " ")}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </section>

        {/* Section 2: Enrollment & Academic Details */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-6 border-b pb-3">Enrollment & Academic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField control={form.control} name="studentIdNumber" render={({ field }) => (<FormItem><FormLabel>Student ID Number <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., SUK00123" {...field} disabled={isSubmitting || isEditMode} /></FormControl>{isEditMode && <FormDescription>Student ID cannot be changed.</FormDescription>}<FormMessage /></FormItem>)} />
            <FormField control={form.control} name="enrollmentDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Enrollment Date <span className="text-destructive">*</span></FormLabel>
                 <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("h-11 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 20} toYear={new Date().getFullYear() + 1} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="currentClassId" render={({ field }) => (
            <FormItem className="mt-4">
              <FormLabel>Assign to Class</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting || !classes || classes.length === 0}>
                <FormControl><SelectTrigger className="h-11"><SelectValue placeholder="Select a class" /></SelectTrigger></FormControl>
                <SelectContent>
                  {classes?.length > 0 ? 
                    classes.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section || ""}</SelectItem>)) :
                    <SelectItem value="no-classes" disabled>No classes available</SelectItem>
                  }
                </SelectContent>
              </Select>
              <FormDescription>You can assign or change the student's class later.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </section>

        {/* Section 3: Contact Information */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-6 border-b pb-3">Contact Information</h3>
          <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Residential Address, House No., Street Name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mt-4">
            <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City / Town</FormLabel><FormControl><Input placeholder="e.g., Aburi" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="stateOrRegion" render={({ field }) => (<FormItem><FormLabel>State / Region</FormLabel><FormControl><Input placeholder="e.g., Eastern Region" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., Ghana" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Postal Code / Digital Address</FormLabel><FormControl><Input placeholder="e.g., GA-123-4567" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        </section>

        {/* Section 4: Emergency Contact & Medical Info */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-6 border-b pb-3">Emergency Contact & Medical Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <FormField control={form.control} name="emergencyContactName" render={({ field }) => (<FormItem><FormLabel>Emergency Contact Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (<FormItem><FormLabel>Emergency Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="+233 XX XXX XXXX" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-4">
            <FormField control={form.control} name="bloodGroup" render={({ field }) => (<FormItem><FormLabel>Blood Group</FormLabel><FormControl><Input placeholder="e.g., O+" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="allergies" render={({ field }) => (<FormItem><FormLabel>Known Allergies</FormLabel><FormControl><Textarea placeholder="e.g., Peanuts, Penicillin" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="medicalNotes" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Other Medical Notes</FormLabel><FormControl><Textarea placeholder="Any other relevant medical conditions or notes" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        </section>
        
        {/* Section 5: Other Details */}
        <section>
          <h3 className="text-lg font-semibold text-foreground mb-6 border-b pb-3">Other Details</h3>
          <FormField control={form.control} name="profilePictureUrl" render={({ field }) => ( <FormItem><FormLabel>Profile Picture URL</FormLabel><FormControl><Input type="url" placeholder="https://example.com/path/to/profile.png" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Direct link to the student's photo (optional).</FormDescription><FormMessage /></FormItem>)} />
          
          {isEditMode && ( // Only show isActive toggle in edit mode
             <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mt-6">
                    <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Student Status</FormLabel>
                    <FormDescription>
                        Is this student currently active and enrolled? Inactive students may not appear in all lists.
                    </FormDescription>
                    </div>
                    <FormControl>
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                    />
                    </FormControl>
                </FormItem>
                )}
            />
          )}
        </section>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[220px]"> {/* Wider button */}
            {isSubmitting ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (isEditMode ? <Save className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />)}
            {isEditMode ? "Save Student Changes" : "Enroll New Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
}