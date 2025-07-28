import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// async function main() {
//   // Example: Create a dummy user
//   const newUser = await prisma.users.create({
//     data: {
//       email: "dummyuser@example.com",
//       first_name: "John",
//       last_name: "Doe",
//       is_email_verified: true,
//       created_at: new Date(),
//       updated_at: new Date(),
//     },
//   });

//   console.log("Created user:", newUser);

//   const newWebsite = await prisma.user_websites.create({
//     data: {
//       user_id: newUser.user_id, // Use the user_id from the created user
//       website_url: "https://aiattorney.com.pk/",
//       website_type: "corporate",
//       website_name: "AI Attorney",
//       created_at: new Date(),
//       updated_at: new Date(),
//     },
//   });

//   console.log("Created website:", newWebsite);
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });





const analysisServices = [
   {
    type: 'si',
    name: 'recommendationbymo1',
    price: 6.0,
    description: 'Recommendations by MO 1',
  },

    {
    type: 'sma',
    name: 'dashborad2_data',
    price: 6.0,
    description: 'Data from dashboard 2',
  },

    {
    type: 'crca',
    name: 'cmorecommendation',
    price: 4.0,
    description: 'Final CMO recommendation',
  },
  {
    type: 'cwa',
    name: 'dashborad1_Freedata',
    price: 0,
    description: 'Data from dashboard 1 free analysis',
  },
    {
    type: 'sism',
    name: 'recommendationbymo2',
    price: 6.0,
    description: 'Recommendations by MO 2',
  },
  {
    type: 'sa',
    name: 'dashborad_paiddata',
    price: 12.0,
    description: 'Paid dashboard analysis data',
  },

    {
    type: 'ca',
    name: 'dashborad3_data',
    price: 14.0,
    description: 'Data from dashboard 3',
  },

   {
    type: 'ta',
    name: 'traffic_anaylsis',
    price: 4.0,
    description: 'Recommendations by MO 1',
  },
 
  {
    type: 'cr',
    name: 'recommendationbymo3',
    price: 4.0,
    description: 'Recommendations by MO 3',
  },
  {
    type: 'dd',
    name: 'dashborad4_data',
    price: 140.0,
    description: 'Data from dashboard 4',
  },

];

async function main() {
  console.log('🌱 Seeding analysisServices safely...');

  for (const service of analysisServices) {
    const existing = await prisma.analysisServices.findFirst({
      where: { name: service.name },
    });

    if (existing) {
      await prisma.analysisServices.update({
        where: { id: existing.id },
        data: {
          type: service.type,
          price: service.price,
          description: service.description,
        },
      });
    } else {
      await prisma.analysisServices.create({ data: service });
    }
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



