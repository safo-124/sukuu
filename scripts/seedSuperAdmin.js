// File: scripts/seedSuperAdmin.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// If you created a shared Prisma client instance in lib/prisma.js for your app,
// you could potentially try to import it here, but for scripts, direct instantiation is often simpler.
// For consistency with how scripts often run (outside the app's direct module resolution for aliases like @/),
// direct instantiation is fine.
const prisma = new PrismaClient();

async function main() {
  // --- IMPORTANT: Customize these values! ---
  const email = 'superadmin@sukuu.app'; // Choose a secure, real email if possible or a memorable one
  const password = 'kantanka'; // <<< CHANGE THIS TO A VERY STRONG PASSWORD
  const firstName = 'Sukuu';
  const lastName = 'SuperAdmin';
  // --- End of customization ---

  console.log(`Checking for existing user with email: ${email}...`);
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`User with email ${email} already exists.`);
    // Optionally, you could update the existing user to ensure they have the SUPER_ADMIN role
    // For example:
    // if (existingUser.role !== 'SUPER_ADMIN') {
    //   await prisma.user.update({
    //     where: { email: email },
    //     data: { role: 'SUPER_ADMIN' }
    //   });
    //   console.log(`Updated user ${email} to have SUPER_ADMIN role.`);
    // }
    return; // Exit if user already exists
  }

  console.log(`Creating Super Admin user: ${firstName} ${lastName} (${email})...`);
  const hashedPassword = await bcrypt.hash(password, 10);

  const superAdminUser = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      firstName,
      lastName,
      role: 'SUPER_ADMIN', // Make sure this matches your UserRole enum value
      isActive: true,
      // This creates the linked SuperAdmin profile automatically
      superAdmin: {
        create: {}, // No specific fields needed for SuperAdmin model itself other than userId link
      },
    },
    include: {
      superAdmin: true, // Include the linked SuperAdmin details in the console output
    }
  });
  console.log('Super Admin user created successfully:');
  console.log(superAdminUser);
}

main()
  .then(async () => {
    console.log("Seeding complete.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });