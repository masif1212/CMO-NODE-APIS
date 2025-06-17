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



// // import { PrismaClient } from '@prisma/client'

// // const prisma = new PrismaClient()

// // async function main() {
// //   const newRequirement = await prisma.user_requirements.create({
// //     data: {
// //       user_id: '33663c2b-f0d4-4ba4-979a-1f3d5fed12d6',
// //       website_id: 'd6692067-67db-423b-aadc-b97110c72875',
// //       property_id: 'dummy-property-id', // Replace with valid one
// //       access_token: 'dummy-access-token',
// //       competitor_urls: JSON.stringify(["https://www.storykind.com/"]),
// //       created_at: new Date(),
// //       updated_at: new Date(),
// //     },
// //   })

// //   console.log('New user requirement created:', newRequirement)
// // }

// // main()
// //   .catch(e => {
// //     console.error(e)
// //     process.exit(1)
// //   })
// //   .finally(() => {
// //     prisma.$disconnect()
// //   })

// import axios from 'axios';
// import dns from 'dns/promises';

// (async () => {
//   const url = 'https://aiattorney.com.pk/'; // Replace with the URL you want to check
//   const domain = new URL(url).hostname;

//   try {
//     const response = await axios.get(url);
//     const ip = await dns.lookup(domain);

//     console.log('Status:', response.status);
//     console.log('IP:', ip.address);
//   } catch (error) {
//     if (error instanceof Error) {
//       console.error('Website check failed:', error.message);
//     } else {
//       console.error('Unknown error:', error);
//     }
//   }
// })();
