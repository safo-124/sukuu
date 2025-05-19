// File: lib/validators/schoolAdminValidators.js
import * as z from "zod";

export const createSchoolAdminSchema = z.object({
  firstName: z.string().min(2, { message: "First name must be at least 2 characters." }).max(50),
  lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }).max(50),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." })
    // .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
    // .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
    // .regex(/[0-9]/, { message: "Password must contain at least one number." })
    // .regex(/[^a-zA-Z0-9]/, { message: "Password must contain at least one special character." }), // Optional stronger password rules
});