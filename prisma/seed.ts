import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function createUser(data: any) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return existing;
  return prisma.user.create({ data });
}

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  const admin = await createUser({
    name: "Master Admin", email: "admin@hervovibe.in",
    password: await hash("Admin@123"),
    role: "MASTER_ADMIN", rank: "CENTENNIAL", memberId: "HV-0001",
  });

  const tm1 = await createUser({
    name: "Rahul Sharma", email: "rahul.team@hervovibe.in",
    password: await hash("Team@123"),
    role: "TEAM_MEMBER", rank: "GOLDEN", memberId: "HV-TM01", phone: "9876500001",
  });

  const tm2 = await createUser({
    name: "Priya Singh", email: "priya.team@hervovibe.in",
    password: await hash("Team@123"),
    role: "TEAM_MEMBER", rank: "SILVER_A", memberId: "HV-TM02", phone: "9876500002",
  });

  const platinum1 = await createUser({
    name: "Vikram Patel", email: "vikram.p@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "PLATINUM", memberId: "HV-0010", phone: "9876501010",
    managedBy: tm1.id, joiningDate: new Date("2024-01-15"),
  });

  const diamond1 = await createUser({
    name: "Sunita Devi", email: "sunita.d@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "DIAMOND", memberId: "HV-0020", phone: "9876502020",
    sponsorId: platinum1.id, managedBy: tm1.id, joiningDate: new Date("2024-03-10"),
  });

  const diamond2 = await createUser({
    name: "Amit Kumar", email: "amit.k@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "SUPER_DIAMOND", memberId: "HV-0021", phone: "9876502021",
    sponsorId: platinum1.id, managedBy: tm2.id, joiningDate: new Date("2024-02-20"),
  });

  const golden1 = await createUser({
    name: "Meena Gupta", email: "meena.g@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "GOLDEN", memberId: "HV-0030", phone: "9876503030",
    sponsorId: diamond1.id, managedBy: tm1.id, joiningDate: new Date("2024-04-05"),
  });

  const golden2 = await createUser({
    name: "Ravi Shankar", email: "ravi.s@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "GOLDEN", memberId: "HV-0031", phone: "9876503031",
    sponsorId: diamond2.id, managedBy: tm2.id, joiningDate: new Date("2024-05-12"),
  });

  const silver1 = await createUser({
    name: "Kavita Rani", email: "kavita.r@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "SILVER_B", memberId: "HV-0040", phone: "9876504040",
    sponsorId: golden1.id, managedBy: tm1.id, joiningDate: new Date("2024-06-01"),
  });

  const silver2 = await createUser({
    name: "Deepak Verma", email: "deepak.v@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "SILVER_A", memberId: "HV-0041", phone: "9876504041",
    sponsorId: golden2.id, managedBy: tm2.id, joiningDate: new Date("2024-07-15"),
  });

  const silver3 = await createUser({
    name: "Rekha Pandey", email: "rekha.p@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "SILVER", memberId: "HV-0042", phone: "9876504042",
    sponsorId: golden1.id, managedBy: tm1.id, joiningDate: new Date("2024-12-01"),
  });

  const bronze1 = await createUser({
    name: "Pooja Mishra", email: "pooja.m@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "BRONZE", memberId: "HV-0050", phone: "9876505050",
    sponsorId: silver1.id, managedBy: tm1.id, joiningDate: new Date("2024-08-20"),
  });

  const bronze2 = await createUser({
    name: "Suresh Tiwari", email: "suresh.t@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "BRONZE", memberId: "HV-0051", phone: "9876505051",
    sponsorId: silver2.id, managedBy: tm2.id, joiningDate: new Date("2024-09-10"),
  });

  const dist1 = await createUser({
    name: "Neha Joshi", email: "neha.j@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: "HV-0060", phone: "9876506060",
    sponsorId: bronze1.id, managedBy: tm1.id, joiningDate: new Date("2024-10-05"),
  });

  await createUser({
    name: "Ankit Singh", email: "ankit.s@hervovibe.in",
    password: await hash("Member@123"),
    role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: "HV-0061", phone: "9876506061",
    sponsorId: bronze2.id, managedBy: tm2.id, joiningDate: new Date("2024-11-15"),
  });

  // Sales data
  const salesData = [
    { memberId: platinum1.id, enteredById: admin.id, amount: 2500000 },
    { memberId: diamond1.id,  enteredById: admin.id, amount: 1100000 },
    { memberId: diamond2.id,  enteredById: admin.id, amount: 1300000 },
    { memberId: golden1.id,   enteredById: admin.id, amount: 225000 },
    { memberId: golden2.id,   enteredById: admin.id, amount: 198000 },
    { memberId: silver1.id,   enteredById: admin.id, amount: 140000 },
    { memberId: silver2.id,   enteredById: admin.id, amount: 95000 },
    { memberId: silver3.id,   enteredById: admin.id, amount: 72000 },
    { memberId: bronze1.id,   enteredById: admin.id, amount: 45000 },
    { memberId: bronze2.id,   enteredById: admin.id, amount: 38000 },
    { memberId: dist1.id,     enteredById: admin.id, amount: 12000 },
  ];

  for (const s of salesData) {
    const exists = await prisma.sale.findFirst({
      where: { memberId: s.memberId, month: 5, year: 2026 },
    });
    if (!exists) {
      await prisma.sale.create({ data: { ...s, month: 5, year: 2026 } });
    }
  }

  console.log("✅ Seed complete: 1 admin + 2 team members + 12 distributors + 11 sales entries");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
