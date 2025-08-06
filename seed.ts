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





// const analysisServices = [
//    {
//     type: 'si',
//     report: 'recommendationbymo1',
//     name:'Strength and Issues',
//     price: 6.0,
//     description: 'Recommendations by MO 1',
//   },

//     {
//     type: 'sma',
//     report: 'dashboard2_data',
//     name : "Social Media Analsis",
//     price: 6.0,
//     description: 'Data from dashboard 2',
//   },

//     {
//     type: 'crca',
//     report: 'cmorecommendation',
//    name : "CMO recommendation",

//     price: 4.0,
//     description: 'Final CMO recommendation',
//   },
//   {
//     type: 'cwa',
//     name : "Comprehensive Website Audit",

//     report: 'dashboard1_Freedata',
//     price: 0,
//     description: 'Data from dashboard 1 free analysis',
//   },
//     {
//     type: 'sism',
//     name : "Strength and Issues (Social Media)",

//     report: 'recommendationbymo2',
//     price: 6.0,
//     description: 'Recommendations by MO 2',
//   },
//   {
//     type: 'sa',
//     name : "SEO audit",

//     report: 'dashboard_paiddata',
//     price: 12.0,
//     description: 'Paid dashboard analysis data',
//   },

//     {
//     type: 'ca',
//     name : "Competitior Analysis",

//     report: 'dashboard3_data',
//     price: 14.0,
//     description: 'Data from dashboard 3',
//   },

//    {
//     type: 'ta',
//     name :"Traffic Anaylsis",
//     report: 'traffic_anaylsis',
//     price: 4.0,
//     description: 'Recommendations by MO 1',
//   },
 
//   {
//     type: 'rs',
//     name : "Recommendation",
//     report: 'recommendationbymo3',
//     price: 4.0,
//     description: 'Recommendations by MO 3',
//   },
//   {
//     type: 'dd',
//     report: 'dashboard4_data',
//     price: 140.0,
//     description: 'Data from dashboard 4',
//   },

// ];


   const     analysisServices = [
   {
    type: 'si',
    report: 'strengthandissues_d1',
    name:'Strength and Issues',
    price: 6.0,
    description: 'Recommendations by MO 1',
  },

    {
    type: 'sma',
    report: 'dashboard2_data',
    name : "Social Media Analsis",
    price: 6.0,
    description: 'Data from dashboard 2',
  },

    {
    type: 'crca',
    report: 'cmorecommendation',
   name : "CMO recommendation",

    price: 4.0,
    description: 'Final CMO recommendation',
  },
  {
    type: 'cwa',
    name : "Comprehensive Website Audit",

    report: 'dashboard1_Freedata',
    price: 0,
    description: 'Data from dashboard 1 free analysis',
  },
    {
    type: 'sism',
    name : "Strength and Issues (Social Media)",

    report: 'strengthandissues_d2',
    price: 6.0,
    description: 'Recommendations by MO 2',
  },
  {
    type: 'sa',
    name : "SEO audit",

    report: 'dashboard_paiddata',
    price: 12.0,
    description: 'Paid dashboard analysis data',
  },

    {
    type: 'ca',
    name : "Competitior Analysis",

    report: 'dashboard3_data',
    price: 14.0,
    description: 'Data from dashboard 3',
  },

   {
    type: 'ta',
    name :"Traffic Anaylsis",
    report: 'traffic_analysis_id',
    price: 4.0,
    description: 'Recommendations by MO 1',
  },
 
  {
    type: 'rs',
    name : "Recommendation",
    report: 'recommendationbymo',
    price: 4.0,
    description: 'Recommendations by MO ',
  },
  {
    type: 'dd',
    report: 'dashboard4_data',
    price: 140.0,
    description: 'Data from dashboard 4',
  },

];


async function main() {
  console.log('🧹 Cleaning analysisServices table...');
  await prisma.analysisServices.deleteMany({});

  console.log('🌱 Seeding analysisServices...');

  for (const service of analysisServices) {
    await prisma.analysisServices.create({ data: service });
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




