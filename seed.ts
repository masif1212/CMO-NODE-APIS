// // import { PrismaClient } from "@prisma/client";

// // const prisma = new PrismaClient();

// // async function main() {
// //   // Example: Create a dummy user
// //   const newUser = await prisma.users.create({
// //     data: {
// //       email: "dummy@example.com",
// //       first_name: "John",
// //       last_name: "Doe",
// //       is_email_verified: true,
// //       created_at: new Date(),
// //       updated_at: new Date(),
// //     },
// //   });

// //   console.log("Created user:", newUser);

// //   const newWebsite = await prisma.user_websites.create({
// //     data: {
// //       user_id: newUser.user_id, // Use the user_id from the created user
// //       website_url: "https://aiattorney.com.pk/",
// //       website_type: "corporate",
// //       website_name: "AI Attorney",
// //       created_at: new Date(),
// //       updated_at: new Date(),
// //     },
// //   });

// //   console.log("Created website:", newWebsite);
// // }

// // main()
// //   .catch((e) => {
// //     console.error(e);
// //     process.exit(1);
// //   })
// //   .finally(async () => {
// //     await prisma.$disconnect();
// //   });

// import { PrismaClient } from "@prisma/client";

// const prisma = new PrismaClient();

// async function main() {
//   // 🔹 Batch of 10 users
//   const usersData = [
//     {
//       email: "alice@example1.com",
//       first_name: "Alice",
//       last_name: "Smith",
//       role: "user",
//       website: { url: "https://alicecorp.com", name: "Alice Corp" },
//     },
//     {
//       email: "bob@example1.com",
//       first_name: "Bob",
//       last_name: "Johnson",
//       role: "user",
//       website: { url: "https://bobventures.com", name: "Bob Ventures" },
//     },
//     {
//       email: "carol@example1.com",
//       first_name: "Carol",
//       last_name: "Miller",
//       role: "user",
//       website: { url: "https://caroltech.com", name: "Carol Tech" },
//     },
//     {
//       email: "david@example1.com",
//       first_name: "David",
//       last_name: "Brown",
//       role: "user",
//       website: { url: "https://davidglobal.com", name: "David Global" },
//     },
//     {
//       email: "eva@example.com",
//       first_name: "Eva",
//       last_name: "Wilson",
//       role: "user",
//       website: { url: "https://evaconsulting.com", name: "Eva Consulting" },
//     },
//     {
//       email: "frank@example.com",
//       first_name: "Frank",
//       last_name: "Taylor",
//       role: "user",
//       website: { url: "https://frankmedia.com", name: "Frank Media" },
//     },
//     {
//       email: "grace@example.com",
//       first_name: "Grace",
//       last_name: "Martinez",
//       role: "user",
//       website: { url: "https://graceinnovations.com", name: "Grace Innovations" },
//     },
//     {
//       email: "henry@example.com",
//       first_name: "Henry",
//       last_name: "Anderson",
//       role: "user",
//       website: { url: "https://henryventures.com", name: "Henry Ventures" },
//     },
//     {
//       email: "irene@example.com",
//       first_name: "Irene",
//       last_name: "Thomas",
//       role: "user",
//       website: { url: "https://irenedesigns.com", name: "Irene Designs" },
//     },
//     {
//       email: "jack@example.com",
//       first_name: "Jack",
//       last_name: "Moore",
//       role: "user",
//       website: { url: "https://jacksolutions.com", name: "Jack Solutions" },
//     },
//   ];

//   for (const user of usersData) {
//     // 1️⃣ Ensure role exists
//     const role = await prisma.roles.upsert({
//       where: { role_name: user.role },
//       update: {},
//       create: {
//         role_name: user.role,
//         description: `${user.role} role`,
//       },
//     });

//     // 2️⃣ Create user with role + website
//     const newUser = await prisma.users.create({
//       data: {
//         email: user.email,
//         first_name: user.first_name,
//         last_name: user.last_name,
//         is_email_verified: true,
//         created_at: new Date(),
//         updated_at: new Date(),
//         user_roles: {
//           create: { role_id: role.role_id },
//         },
//         user_websites: {
//           create: {
//             website_url: user.website.url,
//             website_type: "corporate",
//             website_name: user.website.name,
//             created_at: new Date(),
//             updated_at: new Date(),
//           },
//         },
//       },
//     });

//     console.log(`✅ Created user ${newUser.first_name} with role ${role.role_name}`);
//   }
// }

// main()
//   .catch((e) => {
//     console.error("❌ Error seeding users:", e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
