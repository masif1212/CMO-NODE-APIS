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



// import { PrismaClient } from '@prisma/client'

// const prisma = new PrismaClient()

// async function main() {
//   const newRequirement = await prisma.user_requirements.create({
//     data: {
//         user_id: "867aef1a-189e-46f1-bab4-291de5717713",
  

//       website_id: "27fd005a-a825-454d-943b-b0fe6e1c443c",
//       property_id: 'dummy-property-id', // Replace with valid one
//       access_token: 'dummy-access-token',
//       industry: 'LAW, AI, LEGAL',

//       target_audience:"law students, lawyers",
//       region_of_operation: 'pakistan',
//       target_location: 'pakistan',
//       primary_offering: 'AI Legal Services',
//       USP: 'AI-driven legal solutions for efficiency and accuracy',

//       created_at: new Date(),
//       updated_at: new Date(),

//     },
//   })

//   console.log('New user requirement created:', newRequirement)
// }

// main()
//   .catch(e => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(() => {
//     prisma.$disconnect()
//   })
