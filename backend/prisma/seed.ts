import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? 'owner@radhikajewellers.example';
  const password = process.env.SEED_OWNER_PASSWORD ?? 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Owner user already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const owner = await prisma.user.create({
    data: {
      employeeCode: 'EMP-001',
      name: 'Shop Owner',
      email,
      passwordHash,
      role: 'OWNER',
    },
  });

  console.log(`Created owner user ${owner.email} (employeeCode: ${owner.employeeCode})`);
  console.log(`Login with email="${email}" password="${password}" — change this immediately.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
