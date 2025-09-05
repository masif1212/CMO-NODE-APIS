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

    console.log("Checking for existing analysis services...");
    const existingServices = await prisma.analysisServices.findMany();
    console.log(`Found ${existingServices.length} existing services.`);

    const servicesData = [
      { type: "si", report: "strengthandissues_d1", name: "Strength and Issues", price: 6.0, description: "Recommendations by MO 1" },
      { type: "sma", report: "dashboard2_data", name: "Social Media Analsis", price: 6.0, description: "Data from dashboard 2" },
      { type: "crca", report: "cmorecommendation", name: "CMO recommendation", price: 4.0, description: "Final CMO recommendation" },
      { type: "cwa", report: "dashboard1_Freedata", name: "Comprehensive Website Audit", price: 0, description: "Data from dashboard 1 free analysis" },
      { type: "sa", report: "dashboard_paiddata", name: "SEO audit", price: 12.0, description: "Paid dashboard analysis data" },
      { type: "ca", report: "dashboard3_data", name: "Competitior Analysis", price: 14.0, description: "Data from dashboard 3" },
      { type: "ta", report: "traffic_analysis_id", name: "Traffic Anaylsis", price: 4.0, description: "traffic analysis" },
      { type: "rs", report: "recommendationbymo2", name: "Recommendation", price: 4.0, description: "Recommendations by MO " },
    ];

    if (existingServices.length === 0) {
      console.log("No existing services found, seeding new services...");

      for (const service of servicesData) {
        // Create the service
        const createdService = await prisma.analysisServices.create({
          data: {
            ...service,
            updated_at: now,
            // Create initial history
            AnalysisServiceHistory: {
              create: [
                {
                  price: service.price,
                  created_at: now,
                  valid_from: now,
                },
              ],
            },
          },
        });

        console.log(`Created service ${createdService.name} with initial history`);
      }

      console.log("Seeded analysis services successfully.");
    } else {
      console.log("Analysis services already exist, skipping seeding.");
    }

    /**
     * 4. Seed Email Templates (cmo.email_templates)
     * - Uses parameterized raw SQL to avoid manual string escaping.
     * - Upserts by template_id (updates content if already present).
     * - Matches the SQL you provided, adapted for idempotency and safety.
     */
    console.log("Seeding email templates (cmo.email_templates)...");
    const emailTemplates: {
      template_id: string;
      template_name: string;
      subject: string;
      description: string;
    }[] = [
      {
        template_id: "welcome",
        template_name: "🎉 Welcome Aboard",
        subject: "Welcome to CMOontheGO - Your marketing journey begins now!",
        description: `Hi {{name}},

Welcome to the CMOontheGO family! 🚀

We're thrilled to have you on board. Here's your roadmap to marketing success:

✅ *Step 1: Complete your FREE 5-minute brand audit
✅ **Step 2: Connect your analytics for deeper insights  
✅ **Step 3: Book a strategy session with our experts

🎯 **Did you know?* 89% of our users see measurable improvements within their first 2 weeks!

Ready to transform your marketing? Let's get started!

Best regards,
The CMOontheGO Team`,
      },
      {
        template_id: "audit_reminder",
        template_name: "⚡ Audit Reminder",
        subject: "Your competitors are getting ahead - Don't miss out!",
        description: `Hi {{name}},

Your FREE brand audit is still waiting for you! ⏰

While you're thinking about it, your competitors are:
🔥 Optimizing their conversion rates
💰 Reducing wasted ad spend by 30%+
📈 Discovering hidden growth opportunities

Don't let them get ahead. Your personalized audit takes just 5 minutes and reveals:
• Exactly where your marketing budget is bleeding
• Quick wins you can implement today
• Competitive advantages you're missing

👆 *Click here to start your FREE audit now*

Time is money in marketing!

Best,
Moe from CMOontheGO`,
      },
      {
        template_id: "premium_offer",
        template_name: "👑 Premium Upgrade",
        subject: "Exclusive offer: Unlock your marketing potential",
        description: `Hi {{name}},

Congratulations on completing your brand audit! 🎊

Your results show incredible potential. Ready to unlock it?

🌟 *LIMITED TIME: 50% OFF Premium Features

What you'll get:
🎯 Advanced competitor intelligence
🤖 AI-powered CMO recommendations
📊 Deep-dive traffic analysis
🔥 Priority expert support
📞 1-on-1 strategy calls

Use code: GROWTH50* (Expires in 48 hours)

Join 500+ brands already crushing their marketing goals with Premium.

Ready to level up?

Best regards,
The CMOontheGO Team`,
      },
      {
        template_id: "re_engagement",
        template_name: "💝 We Miss You",
        subject: "Come back and see what's new - You'll love it!",
        description: `Hi {{name}},

We miss you at CMOontheGO! 💔

Since you've been away, we've been busy building amazing new features:

🆕 *What's New:
• Enhanced SEO audit engine
• Social media performance analyzer
• Smart recommendation system 2.0
• Mobile-first audit reports

🎁 **Welcome back gift:* Your next audit is on us!

Your marketing deserves the best tools. Come see what you've been missing.

Ready to dive back in?

With love,
The CMOontheGO Team`,
      },
      {
        template_id: "success_story",
        template_name: "🏆 Success Story",
        subject: "How Sarah increased conversions by 156% (case study inside)",
        description: `Hi {{name}},

Want to see what's possible with the right marketing strategy? 📈

*Case Study: Sarah's E-commerce Success

Sarah was struggling with:
❌ High ad costs, low conversions
❌ Unclear customer journey
❌ Wasted budget on wrong channels

After using CMOontheGO:*
✅ 156% increase in conversions
✅ 43% reduction in cost per acquisition  
✅ 2.3x return on ad spend

"CMOontheGO didn't just audit my marketing - they transformed my entire business approach!" - Sarah K.

Ready to write your own success story?

Best,
The CMOontheGO Team`,
      },
    ];

    // Upsert (insert or update) each template safely with parameterized raw SQL
    for (const t of emailTemplates) {
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO cmo.email_templates
          (template_id, template_name, subject, description, created_at, updated_at)
        VALUES
          ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (template_id)
        DO UPDATE SET
          template_name = EXCLUDED.template_name,
          subject = EXCLUDED.subject,
          description = EXCLUDED.description,
          updated_at = NOW();
        `,
        t.template_id,
        t.template_name,
        t.subject,
        t.description
      );
    }
    console.log("Email templates seeded/updated successfully.");
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
