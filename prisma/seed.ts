import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@hervovibe.in" },
    update: {},
    create: {
      name: "Master Admin",
      email: "admin@hervovibe.in",
      password: await hash("Admin@123"),
      role: "MASTER_ADMIN",
      rank: "CENTENNIAL",
      memberId: "HV-0001",
    },
  });

  // Team Members
  const tm1 = await prisma.user.upsert({
    where: { email: "rahul.team@hervovibe.in" },
    update: {},
    create: {
      name: "Rahul Sharma",
      email: "rahul.team@hervovibe.in",
      password: await hash("Team@123"),
      role: "TEAM_MEMBER",
      rank: "GOLDEN",
      memberId: "HV-TM01",
      phone: "9876500001",
    },
  });

  const tm2 = await prisma.user.upsert({
    where: { email: "priya.team@hervovibe.in" },
    update: {},
    create: {
      name: "Priya Singh",
      email: "priya.team@hervovibe.in",
      password: await hash("Team@123"),
      role: "TEAM_MEMBER",
      rank: "SILVER_A",
      memberId: "HV-TM02",
      phone: "9876500002",
    },
  });

  // Level 1 — Platinum
  const platinum1 = await prisma.user.upsert({
    where: { email: "vikram.p@hervovibe.in" },
    update: {},
    create: {
      name: "Vikram Patel",
      email: "vikram.p@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "PLATINUM",
      memberId: "HV-0010",
      phone: "9876501010",
      managedBy: tm1.id,
      joiningDate: new Date("2024-01-15"),
    },
  });

  // Level 2 — Diamond
  const diamond1 = await prisma.user.upsert({
    where: { email: "sunita.d@hervovibe.in" },
    update: {},
    create: {
      name: "Sunita Devi",
      email: "sunita.d@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "DIAMOND",
      memberId: "HV-0020",
      phone: "9876502020",
      sponsorId: platinum1.id,
      managedBy: tm1.id,
      joiningDate: new Date("2024-03-10"),
    },
  });

  const diamond2 = await prisma.user.upsert({
    where: { email: "amit.k@hervovibe.in" },
    update: {},
    create: {
      name: "Amit Kumar",
      email: "amit.k@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "SUPER_DIAMOND",
      memberId: "HV-0021",
      phone: "9876502021",
      sponsorId: platinum1.id,
      managedBy: tm2.id,
      joiningDate: new Date("2024-02-20"),
    },
  });

  // Level 3 — Golden
  const golden1 = await prisma.user.upsert({
    where: { email: "meena.g@hervovibe.in" },
    update: {},
    create: {
      name: "Meena Gupta",
      email: "meena.g@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "GOLDEN",
      memberId: "HV-0030",
      phone: "9876503030",
      sponsorId: diamond1.id,
      managedBy: tm1.id,
      joiningDate: new Date("2024-04-05"),
    },
  });

  const golden2 = await prisma.user.upsert({
    where: { email: "ravi.s@hervovibe.in" },
    update: {},
    create: {
      name: "Ravi Shankar",
      email: "ravi.s@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "GOLDEN",
      memberId: "HV-0031",
      phone: "9876503031",
      sponsorId: diamond2.id,
      managedBy: tm2.id,
      joiningDate: new Date("2024-05-12"),
    },
  });

  // Level 4 — Silver variants
  const silver1 = await prisma.user.upsert({
    where: { email: "kavita.r@hervovibe.in" },
    update: {},
    create: {
      name: "Kavita Rani",
      email: "kavita.r@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "SILVER_B",
      memberId: "HV-0040",
      phone: "9876504040",
      sponsorId: golden1.id,
      managedBy: tm1.id,
      joiningDate: new Date("2024-06-01"),
    },
  });

  const silver2 = await prisma.user.upsert({
    where: { email: "deepak.v@hervovibe.in" },
    update: {},
    create: {
      name: "Deepak Verma",
      email: "deepak.v@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "SILVER_A",
      memberId: "HV-0041",
      phone: "9876504041",
      sponsorId: golden2.id,
      managedBy: tm2.id,
      joiningDate: new Date("2024-07-15"),
    },
  });

  // Level 5 — Bronze
  const bronze1 = await prisma.user.upsert({
    where: { email: "pooja.m@hervovibe.in" },
    update: {},
    create: {
      name: "Pooja Mishra",
      email: "pooja.m@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "BRONZE",
      memberId: "HV-0050",
      phone: "9876505050",
      sponsorId: silver1.id,
      managedBy: tm1.id,
      joiningDate: new Date("2024-08-20"),
    },
  });

  const bronze2 = await prisma.user.upsert({
    where: { email: "suresh.t@hervovibe.in" },
    update: {},
    create: {
      name: "Suresh Tiwari",
      email: "suresh.t@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "BRONZE",
      memberId: "HV-0051",
      phone: "9876505051",
      sponsorId: silver2.id,
      managedBy: tm2.id,
      joiningDate: new Date("2024-09-10"),
    },
  });

  // Level 6 — Distributors
  const dist1 = await prisma.user.upsert({
    where: { email: "neha.j@hervovibe.in" },
    update: {},
    create: {
      name: "Neha Joshi",
      email: "neha.j@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "DISTRIBUTOR",
      memberId: "HV-0060",
      phone: "9876506060",
      sponsorId: bronze1.id,
      managedBy: tm1.id,
      joiningDate: new Date("2024-10-05"),
    },
  });

  await prisma.user.upsert({
    where: { email: "ankit.s@hervovibe.in" },
    update: {},
    create: {
      name: "Ankit Singh",
      email: "ankit.s@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "DISTRIBUTOR",
      memberId: "HV-0061",
      phone: "9876506061",
      sponsorId: bronze2.id,
      managedBy: tm2.id,
      joiningDate: new Date("2024-11-15"),
    },
  });

  await prisma.user.upsert({
    where: { email: "rekha.p@hervovibe.in" },
    update: {},
    create: {
      name: "Rekha Pandey",
      email: "rekha.p@hervovibe.in",
      password: await hash("Member@123"),
      role: "DISTRIBUTOR",
      rank: "SILVER",
      memberId: "HV-0062",
      phone: "9876506062",
      sponsorId: bronze1.id,
      managedBy: tm1.id,
      joiningDate: new Date("2024-12-01"),
    },
  });

  // Add demo sales
  const currentMonth = 5;
  const currentYear = 2026;

  const salesData = [
    { memberId: platinum1.id, amount: 2500000, enteredById: platinum1.id },
    { memberId: diamond1.id, amount: 1100000, enteredById: diamond1.id },
    { memberId: diamond2.id, amount: 1300000, enteredById: diamond2.id },
    { memberId: golden1.id, amount: 225000, enteredById: golden1.id },
    { memberId: golden2.id, amount: 198000, enteredById: golden2.id },
    { memberId: silver1.id, amount: 140000, enteredById: silver1.id },
    { memberId: silver2.id, amount: 95000, enteredById: silver2.id },
    { memberId: bronze1.id, amount: 45000, enteredById: bronze1.id },
    { memberId: bronze2.id, amount: 38000, enteredById: bronze2.id },
    { memberId: dist1.id, amount: 12000, enteredById: dist1.id },
  ];

  for (const s of salesData) {
    const existing = await prisma.sale.findFirst({
      where: { memberId: s.memberId, month: currentMonth, year: currentYear },
    });
    if (!existing) {
      await prisma.sale.create({
        data: { ...s, month: currentMonth, year: currentYear },
      });
    }
  }

  console.log("✅ Seed complete: admin + 2 team members + 12 distributors + sales data");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
