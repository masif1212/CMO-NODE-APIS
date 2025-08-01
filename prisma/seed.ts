import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed process...");
  const now = new Date();

  try {
    // Test database connection
    await prisma.$connect();
    console.log("Successfully connected to database");

    // 1. Seed Roles
    const existingRoles = await prisma.roles.findMany();
    console.log(`Found ${existingRoles.length} existing roles`);
    if (existingRoles.length === 0) {
      await prisma.roles.createMany({
        data: [
          { role_name: "Admin", description: "Administrator with full access", updated_at: now },
          { role_name: "Manager", description: "Manager with limited control", updated_at: now },
          { role_name: "User", description: "Regular user with read access", updated_at: now },
        ],
        skipDuplicates: true, // Prevent duplicate errors
      });
      console.log("Seeded roles successfully");
    } else {
      console.log("Roles already exist, skipping seeding roles...");
    }

    // 2. Seed Permissions
    const existingPermissions = await prisma.permissions.findMany();
    console.log(`Found ${existingPermissions.length} existing permissions`);
    if (existingPermissions.length === 0) {
      await prisma.permissions.createMany({
        data: [
          { permission_name: "read:all", description: "Can read all data", updated_at: now },
          { permission_name: "write:own", description: "Can write own data", updated_at: now },
          { permission_name: "admin:control", description: "Administrative privileges", updated_at: now },
          { permission_name: "user_authentication", description: "Allows user authentication", updated_at: now },
        ],
        skipDuplicates: true,
      });
      console.log("Seeded permissions successfully");
    } else {
      console.log("Permissions already exist, skipping seeding permissions...");
    }

    // 3. Seed Role-Permission Relationships
    const existingRolePermissions = await prisma.role_permissions.findMany();
    console.log(`Found ${existingRolePermissions.length} existing role_permissions`);
    if (existingRolePermissions.length === 0) {
      const rolesMap = await prisma.roles.findMany();
      const permissionsMap = await prisma.permissions.findMany();
      console.log(`Roles found: ${rolesMap.length}, Permissions found: ${permissionsMap.length}`);

      const rolePerms: { role_id: string; permission_id: string }[] = [];
      const map = {
        Admin: ["read:all", "write:own", "admin:control"],
        Manager: ["read:all", "write:own"],
        User: ["read:all"],
      };

      for (const role of rolesMap) {
        for (const perm of map[role.role_name as keyof typeof map] || []) {
          const p = permissionsMap.find((per) => per.permission_name === perm);
          if (p) {
            rolePerms.push({ role_id: role.role_id, permission_id: p.permission_id });
          }
        }
      }

      await prisma.role_permissions.createMany({ data: rolePerms, skipDuplicates: true });
      console.log("Seeded role_permissions successfully");
    } else {
      console.log("Role permissions already exist, skipping seeding role_permissions...");
    }

    // 4. Seed Analysis Services
    console.log("Checking for existing analysis services...");
    const existingServices = await prisma.analysisServices.findMany();
    console.log(`Found ${existingServices.length} existing services.`);
    if (existingServices.length === 0) {
      console.log("No existing services found, seeding new services...");
      await prisma.analysisServices.createMany({
       
        
        data : [
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
    description: 'traffic analysis',
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

],
        skipDuplicates: true,
      });
      console.log("Seeded analysis services successfully.");
    } else {
      console.log("Analysis services already exist, skipping seeding.");
    }
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error; // Ensure the script fails explicitly
  }
}

main()
  .then(() => {
    console.log("Seed completed successfully");
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Disconnecting from database");
    await prisma.$disconnect();
  });