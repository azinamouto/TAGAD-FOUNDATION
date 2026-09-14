import 'dotenv/config';
import { PrismaClient, Role, Sex } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding canonical TAGAD reference data...');

  // 1. Seed Core Offices
  const offices = [
    { code: 'MPDC', name: 'Municipal Planning and Development Coordinator', headName: 'Engr. Planning Officer' },
    { code: 'MSWDO', name: 'Municipal Social Welfare and Development Office', headName: 'Social Welfare Officer' },
    { code: 'MHO', name: 'Municipal Health Office', headName: 'Municipal Health Officer' },
    { code: 'MAO', name: 'Municipal Agriculture Office', headName: 'Municipal Agriculturist' },
    { code: 'MO-GFPS', name: 'Mayor’s Office - GAD Focal Point System', headName: 'GAD Focal Coordinator' },
  ];

  for (const off of offices) {
    await prisma.office.upsert({
      where: { code: off.code },
      update: { name: off.name, headName: off.headName },
      create: off,
    });
  }

  // 2. Seed 25 Barangays of Talibon
  const barangays = [
    { name: 'Bagacay', code: 'TLB-BAG' },
    { name: 'Balintawak', code: 'TLB-BAL' },
    { name: 'Burgos', code: 'TLB-BUR' },
    { name: 'Busalian', code: 'TLB-BUS' },
    { name: 'Calituban', code: 'TLB-CAL' },
    { name: 'Cataban', code: 'TLB-CAT' },
    { name: 'Guindacpan', code: 'TLB-GUI' },
    { name: 'Magsaysay', code: 'TLB-MAG' },
    { name: 'Mahanay', code: 'TLB-MAH' },
    { name: 'Nocnocan', code: 'TLB-NOC' },
    { name: 'Poblacion', code: 'TLB-POB' },
    { name: 'Rizal', code: 'TLB-RIZ' },
    { name: 'San Agustin', code: 'TLB-SAG' },
    { name: 'San Carlos', code: 'TLB-SCA' },
    { name: 'San Francisco', code: 'TLB-SFR' },
    { name: 'San Isidro', code: 'TLB-SIS' },
    { name: 'San Jose', code: 'TLB-SJO' },
    { name: 'San Pedro', code: 'TLB-SPE' },
    { name: 'San Roque', code: 'TLB-SRO' },
    { name: 'Santo Niño', code: 'TLB-STN' },
    { name: 'Sikatuna', code: 'TLB-SIK' },
    { name: 'Suba', code: 'TLB-SUB' },
    { name: 'Tanghaligi', code: 'TLB-TAN' },
    { name: 'Tilmobo', code: 'TLB-TIL' },
    { name: 'Zamora', code: 'TLB-ZAM' },
  ];

  for (const brgy of barangays) {
    await prisma.barangay.upsert({
      where: { name: brgy.name },
      update: { code: brgy.code },
      create: { ...brgy, captainName: 'Hon. Barangay Captain', latitude: null, longitude: null, geoSource: null, geoVerified: false },
    });
  }

  // 3. Seed System Administrator & Super Administrator
  const mpdcOffice = await prisma.office.findUnique({ where: { code: 'MPDC' } });
  const adminEmail = 'admin@talibon.gov.ph';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error('ADMIN_PASSWORD is required to seed the admin account.');
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName: 'System Administrator',
      role: Role.ADMIN,
      officeId: mpdcOffice?.id,
      isActive: true,
    },
    create: {
      email: adminEmail,
      fullName: 'System Administrator',
      passwordHash: hashedPassword,
      role: Role.ADMIN,
      officeId: mpdcOffice?.id,
      isActive: true,
    },
  });

  // 4. Seed Dedicated Super Administrator (System-wide / No office restriction)
  const superAdminEmail = 'superadmin@talibon.gov.ph';
  const superAdminPasswordPlain = process.env.SUPER_ADMIN_PASSWORD;
  if (!superAdminPasswordPlain) throw new Error('SUPER_ADMIN_PASSWORD is required to seed the super-admin account.');
  const hashedSuperAdminPassword = await bcrypt.hash(superAdminPasswordPlain, 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {
      fullName: 'TAGAD Super Administrator',
      role: Role.SUPER_ADMIN,
      officeId: null,
      barangayId: null,
      isActive: true,
    },
    create: {
      email: superAdminEmail,
      fullName: 'TAGAD Super Administrator',
      passwordHash: hashedSuperAdminPassword,
      role: Role.SUPER_ADMIN,
      officeId: null,
      barangayId: null,
      isActive: true,
    },
  });

  console.log('Seeded admin user:', admin.email);
  console.log('Seeded super admin user:', superAdmin.email);
  console.log('Canonical seed completed successfully.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
