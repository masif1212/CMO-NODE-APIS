import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();

  // 1. Seed Roles
  const existingRoles = await prisma.roles.findMany();
  if (existingRoles.length === 0) {
    await prisma.roles.createMany({
      data: [
        { role_name: "Admin", description: "Administrator with full access", updated_at: now },
        { role_name: "Manager", description: "Manager with limited control", updated_at: now },
        { role_name: "User", description: "Regular user with read access", updated_at: now },
      ],
    });
    console.log("Seeded roles");
  } else {
    console.log("Roles already exist, skipping...");
  }

  // 2. Seed Permissions
  const existingPermissions = await prisma.permissions.findMany();
  if (existingPermissions.length === 0) {
    await prisma.permissions.createMany({
      data: [
        { permission_name: "read:all", description: "Can read all data", updated_at: now },
        { permission_name: "write:own", description: "Can write own data", updated_at: now },
        { permission_name: "admin:control", description: "Administrative privileges", updated_at: now },
      ],
    });
    console.log("Seeded permissions");
  } else {
    console.log("Permissions already exist, skipping...");
  }

  // 3. Seed Role-Permission Relationships
  const existingRolePermissions = await prisma.role_permissions.findMany();
  if (existingRolePermissions.length === 0) {
    const rolesMap = await prisma.roles.findMany();
    const permissionsMap = await prisma.permissions.findMany();

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

    await prisma.role_permissions.createMany({ data: rolePerms });
    console.log("Seeded role_permissions");
  } else {
    console.log("Role permissions already exist, skipping...");
  }
}

main()
  .then(() => {
    console.log("Seed completed");
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
