// File: components/superadmin/SchoolForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle, Save } from "lucide-react";
import { TermPeriod } from "@prisma/client";

import { createSchoolSchema } from "@/lib/validators/schoolValidators"; // We'll use this for both for now
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch"; // For isActive status

const termPeriodOptions = Object.values(TermPeriod);

// The component now accepts an optional 'school' prop for initial data (edit mode)
export default function SchoolForm({ school, onFormSubmit }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!school; // Determine if we are in edit mode

  const form = useForm({
    resolver: zodResolver(createSchoolSchema), // Using createSchoolSchema for both for now
    defaultValues: school ? {
      ...school, // Spread existing school data
      currentTerm: school.currentTerm || undefined, // Ensure undefined if null for select placeholder
      phoneNumber: school.phoneNumber || "", // Ensure empty string if null for controlled input
      address: school.address || "",
      city: school.city || "",
      stateOrRegion: school.stateOrRegion || "",
      country: school.country || "",
      postalCode: school.postalCode || "",
      website: school.website || "",
      logoUrl: school.logoUrl || "",
    } : {
      name: "",
      schoolEmail: "",
      phoneNumber: "",
      address: "",
      city: "",
      stateOrRegion: "",
      country: "Ghana", // Default country
      postalCode: "",
      website: "",
      logoUrl: "",
      currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      currentTerm: undefined,
      currency: "GHS",
      timezone: "Africa/Accra",
      isActive: true, // Default for new schools
    },
  });
  
  // Reset form if school data changes (e.g., navigating from create to edit page)
  useEffect(() => {
    if (school) {
      const resetData = {
        ...school,
        currentTerm: school.currentTerm || undefined,
        phoneNumber: school.phoneNumber || "",
        address: school.address || "",
        city: school.city || "",
        stateOrRegion: school.stateOrRegion || "",
        country: school.country || "",
        postalCode: school.postalCode || "",
        website: school.website || "",
        logoUrl: school.logoUrl || "",
      };
      form.reset(resetData);
    } else {
        form.reset({ // Default values for create mode
            name: "", schoolEmail: "", phoneNumber: "", address: "", city: "",
            stateOrRegion: "", country: "Ghana", postalCode: "", website: "", logoUrl: "",
            currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            currentTerm: undefined, currency: "GHS", timezone: "Africa/Accra", isActive: true,
        });
    }
  }, [school, form]);


  async function onSubmit(values) {
    setIsSubmitting(true);
    const actionVerb = isEditMode ? "Updating" : "Creating";
    const submissionToast = toast.loading(`${actionVerb} school...`);

    const apiEndpoint = isEditMode ? `/api/superadmin/schools/${school.id}` : '/api/superadmin/schools';
    const httpMethod = isEditMode ? 'PUT' : 'POST';

    // Ensure isActive is part of the values sent to the API
    const submissionValues = { ...values, isActive: values.isActive };


    try {
      const response = await fetch(apiEndpoint, {
        method: httpMethod,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionValues), // Send all form values
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${isEditMode ? 'update' : 'create'} school.`, { id: submissionToast });
        if (result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field, { type: "server", message: messages.join(", ") });
          }
        }
      } else {
        toast.success(result.message || `School ${isEditMode ? 'updated' : 'created'} successfully!`, { id: submissionToast });
        
        if (!isEditMode) { // Reset form only on successful creation
            form.reset();
        }
        
        if (onFormSubmit) {
          onFormSubmit(result.school);
        }
        
        // Redirect to schools list page after create or update
        // For updates, you might want to redirect to the school's detail page if one exists
        router.push("/superadmin/schools");
        router.refresh(); // Ensures the list page re-fetches data
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("An unexpected error occurred. Please try again.", { id: submissionToast });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit School Details" : "Register New School"}</CardTitle>
        <CardDescription>
          {isEditMode ? "Update the information for the existing school." : "Fill in the details to add a new school to the platform."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8"> {/* Increased spacing */}
            {/* Basic Info Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>School Name <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Sukuu International School" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="schoolEmail"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>School Email <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <Input type="email" placeholder="admin@sukuuis.edu.gh" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                </div>
            </div>
            
            {/* Contact & Location Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Contact & Location</h3>
                <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                        <Input type="tel" placeholder="+233 24 000 0000" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                        <Textarea placeholder="P.O. Box 123, School Street, City" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="e.g., Accra" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="stateOrRegion" render={({ field }) => (<FormItem><FormLabel>State / Region</FormLabel><FormControl><Input placeholder="e.g., Greater Accra" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., Ghana" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="postalCode" render={({ field }) => (<FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input placeholder="e.g., GA-123-4567" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            {/* Web & Branding Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Web & Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="website" render={({ field }) => ( <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input type="url" placeholder="https://www.sukuuis.edu.gh" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="logoUrl" render={({ field }) => ( <FormItem><FormLabel>Logo URL</FormLabel><FormControl><Input type="url" placeholder="https://link.to/logo.png" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Direct link to the school's logo image.</FormDescription><FormMessage /></FormItem>)} />
                </div>
            </div>
            
            {/* Academic & Financial Section */}
            <div className="space-y-6">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Academic & Financial</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="currentAcademicYear" render={({ field }) => ( <FormItem><FormLabel>Academic Year <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Format: YYYY-YYYY</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="currentTerm" render={({ field }) => ( <FormItem><FormLabel>Current Term</FormLabel><Select onValueChange={field.onChange} value={field.value || ""} disabled={isSubmitting}><FormControl><SelectTrigger><SelectValue placeholder="Select current term" /></SelectTrigger></FormControl><SelectContent>{termPeriodOptions.map((term) => (<SelectItem key={term} value={term}>{term.replace(/_/g, " ")}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="currency" render={({ field }) => (<FormItem><FormLabel>Currency <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., GHS" {...field} maxLength={3} disabled={isSubmitting} /></FormControl><FormDescription>3-letter currency code.</FormDescription><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="timezone" render={({ field }) => (<FormItem><FormLabel>Timezone <span className="text-destructive">*</span></FormLabel><FormControl><Input placeholder="e.g., Africa/Accra" {...field} disabled={isSubmitting} /></FormControl><FormDescription>Standard timezone name.</FormDescription><FormMessage /></FormItem>)} />
                </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground border-b pb-2">Status</h3>
                <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                            Is this school currently active and operational on the platform?
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
            </div>
            
            <div className="flex justify-end pt-6">
              <Button type="submit" disabled={isSubmitting} size="lg" className="min-w-[150px]">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  isEditMode ? <Save className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />
                )}
                {isEditMode ? "Save Changes" : "Create School"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}