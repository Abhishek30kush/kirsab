import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

async function createAdmin() {
  const args = process.argv.slice(2);
  const email = (args[0] || process.env.ADMIN_INITIAL_EMAIL || 'admin@kirsab.in').toLowerCase().trim();
  const password = args[1] || process.env.ADMIN_INITIAL_PASSWORD || 'KirsabAdmin@2026';
  const name = args[2] || 'KIRSAB Admin';

  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password> [name]');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long');
    process.exit(1);
  }

  console.log(`🔐 Creating / Updating admin account for: ${email}`);

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      name,
    },
    create: {
      email,
      name,
      passwordHash,
      role: 'admin',
    },
  });

  console.log('✅ Admin account configured successfully!');
  console.log(`   ID:    ${admin.id}`);
  console.log(`   Name:  ${admin.name}`);
  console.log(`   Email: ${admin.email}`);
  console.log('---------------------------------------------------------');
  console.log('⚠️  Store your password securely and do not share it.');
}

createAdmin()
  .catch((e) => {
    console.error('❌ Failed to create admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
