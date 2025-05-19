// File: app/api/auth/[...nextauth]/route.js

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client"; // Or import your shared Prisma client instance if you have one (e.g., from '@/lib/prisma')
import bcrypt from "bcryptjs";
import prisma from '@/lib/prisma';

// It's good practice to instantiate PrismaClient once and reuse it.
// If you create a lib/prisma.js, import it from there.
const prisma = new PrismaClient();

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password) {
          console.log("Missing credentials");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          console.log("No user found with email:", credentials.email);
          return null;
        }

        if (!user.hashedPassword) {
          console.log("User does not have a hashed password set.");
          return null;
        }
        
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (isPasswordCorrect) {
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            // Any other user properties to include in the session/token
          };
        }
        console.log("Password incorrect for user:", credentials.email);
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { // user object is only passed on initial sign in
        token.id = user.id;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin", // We will create this custom page
    // error: '/auth/error', // Optional: custom error page
  },
  secret: process.env.AUTH_SECRET,
  debug: process.env.NODE_ENV === "development", // Enable debug messages in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };