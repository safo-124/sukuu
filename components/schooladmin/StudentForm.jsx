// File: components/schooladmin/StudentForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, UserPlus, Save, CalendarIcon } from "lucide-react";
import { format } from "date-fns"; // For date picker
import { Gender } from "@prisma/client"; // Import Gender enum from Prisma Client

import { createStudentSchema } from "@/lib/validators/studentValidators"; // Adjust path if needed
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
import { cn } from "@/lib/utils"; // For conditional class names in Date Picker

const genderOptions = Object.values(Gender); // Get gender options from Prisma enum

// StudentForm can be used for both creating and editing students
export default function StudentForm({ schoolId, initialData, classes, onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!initialData;

  const form = useForm({
    resolver: zodResolver(createStudentSchema),
    defaultValues: initialData ? {
        ...initialData,
        // Ensure dates are formatted as YYYY-MM-DD strings for the form's controlled input
        dateOfBirth: initialData.dateOfBirth ? format(new Date(initialData.dateOfBirth), "yyyy-MM-dd") : "",
        enrollmentDate: initialData.enrollmentDate ? format(new Date(initialData.enrollmentDate), "yyyy-MM-dd") : "",
        currentClassId: initialData.currentClassId || "", // Use empty string for "no selection" to show placeholder
        // Ensure other optional text fields are empty strings if null/undefined for controlled inputs
        middleName: initialData.middleName || "",
        address: initialData.address || "",
        city: initialData.city || "",
        stateOrRegion: initialData.stateOrRegion || "",
        country: initialData.country || "",
        postalCode: initialData.postalCode || "",
        emergencyContactName: initialData.emergencyContactName || "",
        emergencyContactPhone: initialData.emergencyContactPhone || "",
        bloodGroup: initialData.bloodGroup || "",
        allergies: initialData.allergies || "",
        medicalNotes: initialData.medicalNotes || "",
        profilePictureUrl: initialData.profilePictureUrl || "",
    } : { // Default values for new student enrollment
      studentIdNumber: "",
      firstName: "",
      lastName: "",
      middleName: "",
      dateOfBirth: "", // Expecting yyyy-MM-dd string from date picker
      gender: undefined, // So placeholder for Select shows
      enrollmentDate: format(new Date(), "yyyy-MM-dd"), // Default to today
      currentClassId: "", // Empty string for "no selection" to show placeholder
      address: "",
      city: "",
      stateOrRegion: "",
      country: "Ghana", // Default example from your region
      postalCode: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      bloodGroup: "",
      allergies: "",
      medicalNotes: "",
      profilePictureUrl: "",
    },
  });
  
  // Effect to reset form if initialData changes (e.g. navigating between edit pages or data loads)
  useEffect(() => {
    if (initialData) {
      form.reset({
        ...initialData,
        dateOfBirth: initialData.dateOfBirth ? format(new Date(initialData.dateOfBirth), "yyyy-MM-dd") : "",
        enrollmentDate: initialData.enrollmentDate ? format(new Date(initialData.enrollmentDate), "yyyy-MM-dd") : "",
        currentClassId: initialData.currentClassId || "",
        middleName: initialData.middleName || "",
        address: initialData.address || "",
        city: initialData.city || "",
        stateOrRegion: initialData.stateOrRegion || "",
        country: initialData.country || "",
        postalCode: initialData.postalCode || "",
        emergencyContactName: initialData.emergencyContactName || "",
        emergencyContactPhone: initialData.emergencyContactPhone || "",
        bloodGroup: initialData.bloodGroup || "",
        allergies: initialData.allergies || "",
        medicalNotes: initialData.medicalNotes || "",
        profilePictureUrl: initialData.profilePictureUrl || "",
      });
    } else { // Reset to creation defaults if initialData becomes null/undefined
        form.reset({
            studentIdNumber: "", firstName: "", lastName: "", middleName: "", dateOfBirth: "",
            gender: undefined, enrollmentDate: format(new Date(), "yyyy-MM-dd"), currentClassId: "",
            address: "", city: "", stateOrRegion: "", country: "Ghana", postalCode: "",
            emergencyContactName: "", emergencyContactPhone: "", bloodGroup: "", allergies: "",
            medicalNotes: "", profilePictureUrl: "",
        });
    }
  }, [initialData, form]);


  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Enrolling";
    const submissionToast = toast.loading(`${actionVerb} student...`);

    const payload = {
        ...values,
        // Ensure currentClassId is null if it's an empty string (for optional selection)
        currentClassId: values.currentClassId === "" ? null : values.currentClassId,
    };

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
            form.setError(field, { type: "server", message: messages.join(", ") });
          }
        }
      } else {
        toast.success(result.message || `Student ${isEditMode ? 'updated' : 'enrolled'} successfully!`, { id: submissionToast });
        if (!isEditMode) form.reset(); // Reset form only on successful creation
        
        if (onFormSubmit) onFormSubmit(result.student); // Callback for parent component
        
        router.push(`/${schoolId}/schooladmin/students`); // Navigate to students list
        router.refresh(); // Ensure list page re-fetches data
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
        {/* Personal Information Section */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Personal Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <FormField control={form.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Adjoa" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="middleName" render={({ field }) => (<FormItem><FormLabel>Middle Name(s)</FormLabel><FormControl><Input placeholder="e.g., Kwesi" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Mensah" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Birth <span className="text-destructive">*</span></FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("h-12 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={1990} toYear={new Date().getFullYear() - 2} // Students usually at least 2-3 years old
                     disabled={(date) => date > new Date(new Date().setFullYear(new Date().getFullYear() - 2)) || date < new Date("1950-01-01")} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="gender" render={({ field }) => (
              <FormItem>
                <FormLabel>Gender <span className="text-destructive">*</span></FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting}>
                  <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                  <SelectContent>{genderOptions.map(g => (<SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase().replace("_", " ")}</SelectItem>))}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </section>

        {/* Enrollment & Academic Details Section */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Enrollment & Academic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="studentIdNumber" render={({ field }) => (<FormItem><FormLabel>Student ID Number <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., SUK00123" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="enrollmentDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Enrollment Date <span className="text-destructive">*</span></FormLabel>
                 <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("h-12 pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 10} toYear={new Date().getFullYear() + 1} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="currentClassId" render={({ field }) => (
            <FormItem className="mt-6">
              <FormLabel>Assign to Class (Optional)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting}>
                <FormControl><SelectTrigger className="h-12"><SelectValue placeholder="Select a class if applicable" /></SelectTrigger></FormControl>
                <SelectContent>
                  {/* This ensures the placeholder works without a dedicated empty value item */}
                  {/* No <SelectItem value=""> needed if placeholder is handled by SelectValue and value can be "" or undefined */}
                  {classes?.map(cls => (<SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section || ""}</SelectItem>))}
                </SelectContent>
              </Select>
              <FormDescription>You can assign or change the student's class later.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        </section>

        {/* Contact Information Section */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Contact Information</h3>
          <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Residential Address, House No., Street Name" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City / Town</FormLabel><FormControl><Input placeholder="e.g., Aburi" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="stateOrRegion" render={({ field }) => (<FormItem><FormLabel>State / Region</FormLabel><FormControl><Input placeholder="e.g., Eastern Region" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., Ghana" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem className="mt-6"><FormLabel>Postal Code / Digital Address</FormLabel><FormControl><Input placeholder="e.g., GA-123-4567" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        </section>

        {/* Emergency Contact & Medical Info Section */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Emergency Contact & Medical Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={form.control} name="emergencyContactName" render={({ field }) => (<FormItem><FormLabel>Emergency Contact Full Name</FormLabel><FormControl><Input placeholder="e.g., Jane Doe" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (<FormItem><FormLabel>Emergency Contact Phone</FormLabel><FormControl><Input type="tel" placeholder="+233 XX XXX XXXX" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <FormField control={form.control} name="bloodGroup" render={({ field }) => (<FormItem><FormLabel>Blood Group</FormLabel><FormControl><Input placeholder="e.g., O+" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="allergies" render={({ field }) => (<FormItem><FormLabel>Known Allergies</FormLabel><FormControl><Textarea placeholder="e.g., Peanuts, Penicillin" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
          </div>
          <FormField control={form.control} name="medicalNotes" render={({ field }) => (<FormItem className="mt-6"><FormLabel>Other Medical Notes</FormLabel><FormControl><Textarea placeholder="Any other relevant medical conditions or notes" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        </section>
        
        {/* Other Details Section */}
        <section>
          <h3 className="text-lg font-medium text-foreground mb-4 border-b pb-2">Other Details</h3>
          <FormField control={form.control} name="profilePictureUrl" render={({ field }) => ( <FormItem><FormLabel>Profile Picture URL</FormLabel><FormControl><Input type="url" placeholder="https://example.com/path/to/profile.png" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Direct link to the student's photo (optional).</FormDescription><FormMessage /></FormItem>)} />
        </section>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[200px]"> {/* Increased min-width */}
            {isSubmitting ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (isEditMode ? <Save className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />)}
            {isEditMode ? "Save Student Changes" : "Enroll New Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
}