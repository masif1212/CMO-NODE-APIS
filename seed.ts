import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Example: Create a dummy user
  const newUser = await prisma.users.create({
    data: {
      email: "dummyuser@example.com", 
      first_name: "John",
      last_name: "Doe",
      is_email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log("Created user:", newUser);

  // Example: Create a website for the user
  const newWebsite = await prisma.user_websites.create({
    data: {
      user_id: newUser.user_id, // Use the user_id from the created user
      website_url: "https://aiattorney.com.pk/", 
      website_type: "corporate",
      website_name: "AI Attorney",
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log("Created website:", newWebsite);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
