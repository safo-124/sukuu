// File: components/auth/SignInForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn, getCsrfToken } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react"; // Added KeyRound for an icon

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
// import Image from 'next/image'; // If you have a proper logo

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password cannot be empty." }),
});

export default function SignInForm() {
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const token = await getCsrfToken();
        if (token) setCsrfToken(token);
      } catch (e) {
        console.error("Error fetching CSRF token:", e);
        // toast.error("Security token error. Please refresh."); // Optional: can be noisy
      }
    };
    fetchCsrfToken();
  }, []);

  const onSubmit = async (values) => {
    setLoading(true);
    if (!csrfToken && process.env.NODE_ENV === 'production') {
        toast.error("Security validation failed. Please refresh and try again.");
        setLoading(false);
        return;
    }
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: values.email,
        password: values.password,
      });
      if (result?.error) {
        toast.error(result.error === "CredentialsSignin" ? "Invalid email or password." : "Login failed. Please try again.");
      } else if (result?.ok && !result.error) {
        toast.success("Signed in successfully! Redirecting...");
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        router.push(callbackUrl);
        router.refresh();
      } else {
        toast.error("Login failed. An unexpected error occurred.");
      }
    } catch (err) {
      console.error("SignIn System Exception:", err);
      toast.error("A system error occurred during sign in. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg  border border-white/20 rounded-xl  shadow-2xl  text-white  ">
      <CardHeader className="space-y-2 text-center pt-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/70 backdrop-blur-sm border border-white/30 mb-4">
          <KeyRound className="h-8 w-8 text-primary-foreground" /> {/* Icon */ }
        </div>
        <CardTitle className="text-3xl font-bold tracking-tight !text-white"> {/* Ensure title is white */}
          Secure Login
        </CardTitle>
        <CardDescription className="!text-slate-200"> {/* Lighter description text */}
          Access your Sukuu Management dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8 pt-6"> {/* Adjusted padding */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium !text-slate-100">Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="you@example.com" 
                      {...field} 
                      type="email" 
                      disabled={loading} 
                      className="h-12 text-base px-4 bg-white/5 border-white/30 placeholder:text-slate-400 text-white focus-visible:ring-primary/80"
                    />
                  </FormControl>
                  <FormMessage className="!text-red-300"/> {/* Ensure error message is visible */}
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium !text-slate-100">Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      {...field} 
                      disabled={loading} 
                      placeholder="••••••••"
                      className="h-12 text-base px-4 bg-white/5 border-white/30 placeholder:text-slate-400 text-white focus-visible:ring-primary/80"
                    />
                  </FormControl>
                  <FormMessage className="!text-red-300"/>
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold 
                         bg-primary hover:bg-primary/80 text-primary-foreground
                         focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" // shadcn focus style
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In Securely"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}