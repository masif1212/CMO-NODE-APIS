import { PrismaClient, AccountStatus } from '@prisma/client'; // 👈 import the enum
const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      is_email_verified: true,
      is_mfa_enabled: false,
      account_status: AccountStatus.active, // ✅ use enum
    },
    {
      email: 'jane.smith@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      is_email_verified: false,
      is_mfa_enabled: true,
      account_status: AccountStatus.suspended, // ✅ use enum
    },
    {
      email: 'bob.brown@example.com',
      first_name: 'Bob',
      last_name: 'Brown',
      is_email_verified: true,
      is_mfa_enabled: false,
      account_status: AccountStatus.deleted, // ✅ use enum
    },
  ];

  for (const userData of users) {
    await prisma.user.create({
      data: userData,
    });
  }

  console.log('✅ Dummy users added successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding users:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
