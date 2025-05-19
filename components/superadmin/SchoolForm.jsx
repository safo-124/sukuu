// File: components/superadmin/SchoolForm.jsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, PlusCircle } from "lucide-react";
import { TermPeriod } from "@prisma/client"; // Import enum from Prisma Client

import { createSchoolSchema } from "@/lib/validators/schoolValidators"; // Adjust path if needed
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


// Get TermPeriod enum values for the Select component
// This assumes TermPeriod is a plain object enum if directly imported from @prisma/client in a client component
// If it causes issues (e.g. "can't resolve enum"), you might need to list them manually or pass from server.
// For now, let's list them manually to ensure client-side compatibility without complex setup.
const termPeriodOptions = Object.values(TermPeriod);
// const termPeriodOptions = ["FIRST_TERM", "SECOND_TERM", "THIRD_TERM"]; // Manual fallback

export default function SchoolForm({ school, onFormSubmit }) { // school prop for future edit functionality
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: school || { // Use school data if editing, otherwise defaults
      name: "",
      schoolEmail: "",
      phoneNumber: "",
      address: "",
      city: "",
      stateOrRegion: "",
      country: "",
      postalCode: "",
      website: "",
      logoUrl: "", // For now, URL input; file upload is a more complex feature
      currentAcademicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, // Default example
      currentTerm: undefined, // Or a default from TermPeriod if desired
      currency: "GHS", // Default example
      timezone: "Africa/Accra", // Default example
    },
  });

  async function onSubmit(values) {
    setIsSubmitting(true);
    const submissionToast = toast.loading("Submitting school details...");

    try {
      const response = await fetch('/api/superadmin/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "An error occurred.", { id: submissionToast });
        if (result.fieldErrors) {
          // Set form errors for specific fields if provided by the API
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            form.setError(field, { type: "server", message: messages.join(", ") });
          }
        }
      } else {
        toast.success(result.message || "School created successfully!", { id: submissionToast });
        form.reset(); // Reset form on successful submission
        
        // Option 1: Call a prop function if provided (e.g., for closing a modal)
        if (onFormSubmit) {
          onFormSubmit(result.school);
        }
        
        // Option 2: Revalidate path and redirect
        // We can't use revalidatePath directly in client component.
        // router.refresh() is the client-side way to re-fetch current route's data.
        // For navigating and ensuring fresh data on the new page:
        router.push("/superadmin/schools"); // Navigate to the schools list
        router.refresh(); // This will re-fetch data for the new page (schools list)
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
        <CardTitle>{school ? "Edit School" : "Create New School"}</CardTitle>
        <CardDescription>
          {school ? "Update the details of the existing school." : "Fill in the details to register a new school on the platform."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info Section */}
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

            {/* Contact & Location Section */}
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
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Accra" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateOrRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State / Region</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Greater Accra" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Ghana" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., GA-123-4567" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            {/* Web & Branding Section */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                        <Input type="url" placeholder="https://www.sukuuis.edu.gh" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                        <Input type="url" placeholder="https://link.to/logo.png" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormDescription>Direct link to the school's logo image.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            {/* Academic & Financial Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="currentAcademicYear"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Academic Year <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., 2024-2025" {...field} disabled={isSubmitting} />
                        </FormControl>
                         <FormDescription>Format: YYYY-YYYY</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="currentTerm"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Term</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select current term" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {termPeriodOptions.map((term) => (
                            <SelectItem key={term} value={term}>
                                {term.replace("_", " ")} {/* Make it more readable */}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., GHS" {...field} maxLength={3} disabled={isSubmitting} />
                        </FormControl>
                        <FormDescription>3-letter currency code.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Timezone <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Africa/Accra" {...field} disabled={isSubmitting} />
                        </FormControl>
                        <FormDescription>Standard timezone name (e.g., Continent/City).</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlusCircle className="mr-2 h-4 w-4" />
                )}
                {school ? "Update School" : "Create School"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}