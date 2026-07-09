import { prismaClient } from "../src/infrastructure/db/client";

async function check() {
  const users = await prismaClient.user.findMany();
  console.log("USERS IN DB:");
  users.forEach(u => {
    console.log(`Email: ${u.email}, ID: ${u.id}, Hash: ${u.passwordHash}, Token: ${u.verificationToken}, isVerified: ${u.isVerified}`);
  });
  process.exit(0);
}

check();
