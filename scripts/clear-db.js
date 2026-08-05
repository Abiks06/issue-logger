import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all issues...");
  await prisma.issue.deleteMany({});
  console.log("Clearing all user accounts...");
  await prisma.user.deleteMany({});
  console.log("Database cleared.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
