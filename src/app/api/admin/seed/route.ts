import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export const maxDuration = 60;

const FIRST = [
  "Rajan","Sunita","Priya","Amit","Meena","Kavita","Deepak","Sanjay","Geeta","Neha",
  "Vikram","Ankit","Suresh","Nirmala","Vijay","Seema","Tarun","Asha","Pankaj","Mohan",
  "Kiran","Ravi","Anita","Sunil","Lata","Arun","Shanti","Manoj","Usha","Dinesh",
  "Sarla","Mukesh","Radha","Vinod","Mala","Naresh","Pushpa","Kishore","Savita","Bharat",
  "Laxmi","Hemant","Prakash","Chandra","Uma","Rajesh","Nita","Sushil","Ashok","Sheela",
  "Prem","Vimla","Girish","Nisha","Harish","Madhu","Rakesh","Komal","Yogesh","Sundar",
  "Devika","Ajay","Preeti","Sachin","Babita","Rohit","Aarti","Vishal","Sandeep","Rita",
  "Ritesh","Kamla","Rajni","Lalit","Sonal","Paresh","Hema","Nilesh","Manjula","Satish",
  "Bimla","Navin","Shalini","Ganesh","Sudha","Mahesh","Tara","Hitesh","Sapna","Devendra",
  "Suneel","Archana","Tushar","Neeraj","Vandana","Sanjana","Ashwini","Gaurav","Swati","Umesh",
  "Jaya","Dhruv","Reena","Pramod","Smita","Yash","Kamal","Divya","Alka","Hemraj",
  "Manisha","Vikas","Shefali","Ajit","Nandita","Balram","Rashmi","Naveen","Shruti","Milind",
  "Varsha","Shyam","Renu","Praveen","Dilip","Saroj","Ramesh","Pooja","Dipika","Girija",
];
const LAST = [
  "Kumar","Singh","Sharma","Verma","Gupta","Patel","Yadav","Pandey","Tiwari","Joshi",
  "Mishra","Mehta","Jain","Bose","Rao","Shah","Sinha","Das","Choudhary","Dubey",
  "Tripathi","Saxena","Awasthi","Bajpai","Srivastava","Thakur","Garg","Nair","Iyer","Chauhan",
];

export async function POST(_req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now   = new Date();
  const MONTH = now.getMonth() + 1;
  const YEAR  = now.getFullYear();

  function prevMonth(offset: number) {
    let mo = MONTH - offset, yr = YEAR;
    while (mo <= 0) { mo += 12; yr--; }
    return { month: mo, year: yr };
  }
  const pm1 = prevMonth(1);
  const pm2 = prevMonth(2);

  // Hash password only ONCE — reused for all 165 members
  const PASS = await bcrypt.hash("Member@123", 10);

  const admin = await prisma.user.findUnique({ where: { email: "admin@hervovibe.in" } });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 500 });

  let ni = 0;
  function name(i: number) {
    return `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
  }

  // ── 1. Golden root ──────────────────────────────────────────
  const goldenEmail = "ramesh.g@hervovibe.in";
  await prisma.user.upsert({
    where: { email: goldenEmail },
    create: {
      name: "Ramesh Gupta", email: goldenEmail, password: PASS,
      role: "DISTRIBUTOR", rank: "GOLDEN", memberId: "HV-G001",
      phone: "9001000001", joiningDate: new Date("2024-01-10"),
    },
    update: {},
  });
  const golden = await prisma.user.findUniqueOrThrow({ where: { email: goldenEmail }, select: { id: true } });

  // ── 2. Silver (5) ───────────────────────────────────────────
  const silverEmails = Array.from({ length: 5 }, (_, i) => `silver.${i}@hervovibe.in`);
  await prisma.user.createMany({
    skipDuplicates: true,
    data: silverEmails.map((email, i) => ({
      name: name(ni++), email, password: PASS,
      role: "DISTRIBUTOR", rank: "SILVER", memberId: `HV-S${String(i + 1).padStart(3, "0")}`,
      phone: `900100100${i + 1}`, sponsorId: golden.id,
      joiningDate: new Date("2024-03-01"),
    })),
  });
  const silvers = await prisma.user.findMany({
    where: { email: { in: silverEmails } },
    select: { id: true },
  });

  // ── 3. Bronze (25) ─────────────────────────────────────────
  const bronzeEmails = Array.from({ length: 25 }, (_, i) => `bronze.${i}@hervovibe.in`);
  await prisma.user.createMany({
    skipDuplicates: true,
    data: bronzeEmails.map((email, i) => ({
      name: name(ni++), email, password: PASS,
      role: "DISTRIBUTOR", rank: "BRONZE", memberId: `HV-B${String(i + 1).padStart(3, "0")}`,
      phone: `9001002${String(i + 1).padStart(3, "0")}`,
      sponsorId: silvers[Math.floor(i / 5)].id,
      joiningDate: new Date("2024-05-01"),
    })),
  });
  const bronzes = await prisma.user.findMany({
    where: { email: { in: bronzeEmails } },
    select: { id: true },
  });

  // ── 4. Distributors (125) ───────────────────────────────────
  const distEmails = Array.from({ length: 125 }, (_, i) => `dist.${i}@hervovibe.in`);
  await prisma.user.createMany({
    skipDuplicates: true,
    data: distEmails.map((email, i) => ({
      name: name(ni++), email, password: PASS,
      role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: `HV-D${String(i + 1).padStart(3, "0")}`,
      phone: `9001003${String(i + 1).padStart(3, "0")}`,
      sponsorId: bronzes[Math.floor(i / 5)].id,
      joiningDate: new Date("2024-07-01"),
    })),
  });
  const dists = await prisma.user.findMany({
    where: { email: { in: distEmails } },
    select: { id: true },
  });

  // ── 5. Sales for all 125 distributors (3 months × ₹1,800) ─
  await prisma.sale.createMany({
    skipDuplicates: true,
    data: dists.flatMap(d => [
      { memberId: d.id, enteredById: admin.id, amount: 1800, month: MONTH, year: YEAR },
      { memberId: d.id, enteredById: admin.id, amount: 1800, month: pm1.month, year: pm1.year },
      { memberId: d.id, enteredById: admin.id, amount: 1800, month: pm2.month, year: pm2.year },
    ]),
  });

  // ── 6. Rank-mismatch: Sunil Mehta (BRONZE, only 3 downline) ─
  await prisma.user.upsert({
    where: { email: "sunil.m@hervovibe.in" },
    create: {
      name: "Sunil Mehta", email: "sunil.m@hervovibe.in", password: PASS,
      role: "DISTRIBUTOR", rank: "BRONZE", memberId: "HV-M001",
      phone: "9001004001", joiningDate: new Date("2024-09-01"),
    },
    update: {},
  });
  const sunil = await prisma.user.findUniqueOrThrow({ where: { email: "sunil.m@hervovibe.in" }, select: { id: true } });
  await prisma.sale.createMany({
    skipDuplicates: true,
    data: [{ memberId: sunil.id, enteredById: admin.id, amount: 1800, month: MONTH, year: YEAR }],
  });

  const mismatchDownline = [
    { name: "Ritu Kumar",    email: "ritu.m@hervovibe.in",   memberId: "HV-M002", phone: "9001004002" },
    { name: "Arvind Singh",  email: "arvind.m@hervovibe.in", memberId: "HV-M003", phone: "9001004003" },
    { name: "Geeta Sharma",  email: "geeta.m@hervovibe.in",  memberId: "HV-M004", phone: "9001004004" },
  ];
  await prisma.user.createMany({
    skipDuplicates: true,
    data: mismatchDownline.map(u => ({
      ...u, password: PASS, role: "DISTRIBUTOR", rank: "DISTRIBUTOR",
      sponsorId: sunil.id, joiningDate: new Date("2024-10-01"),
    })),
  });
  const mismatchDists = await prisma.user.findMany({
    where: { email: { in: mismatchDownline.map(u => u.email) } },
    select: { id: true },
  });
  await prisma.sale.createMany({
    skipDuplicates: true,
    data: mismatchDists.map(d => ({ memberId: d.id, enteredById: admin.id, amount: 1800, month: MONTH, year: YEAR })),
  });

  // ── 7. 5 standalone distributors ───────────────────────────
  const solos = [
    { name: "Neeraj Yadav",  email: "neeraj.solo@hervovibe.in",  memberId: "HV-X001", phone: "9001005001" },
    { name: "Sanjeev Patel", email: "sanjeev.solo@hervovibe.in", memberId: "HV-X002", phone: "9001005002" },
    { name: "Meena Joshi",   email: "meena.solo@hervovibe.in",   memberId: "HV-X003", phone: "9001005003" },
    { name: "Ajay Pandey",   email: "ajay.solo@hervovibe.in",    memberId: "HV-X004", phone: "9001005004" },
    { name: "Babita Tiwari", email: "babita.solo@hervovibe.in",  memberId: "HV-X005", phone: "9001005005" },
  ];
  await prisma.user.createMany({
    skipDuplicates: true,
    data: solos.map(u => ({
      ...u, password: PASS, role: "DISTRIBUTOR", rank: "DISTRIBUTOR",
      joiningDate: new Date("2025-01-15"),
    })),
  });
  const soloDists = await prisma.user.findMany({
    where: { email: { in: solos.map(u => u.email) } },
    select: { id: true },
  });
  await prisma.sale.createMany({
    skipDuplicates: true,
    data: soloDists.map(d => ({ memberId: d.id, enteredById: admin.id, amount: 1800, month: MONTH, year: YEAR })),
  });

  const totalMembers = await prisma.user.count({ where: { role: "DISTRIBUTOR", deletedAt: null } });
  const totalSales   = await prisma.sale.count();

  return NextResponse.json({
    success: true,
    totals: { members: totalMembers, sales: totalSales },
    groupVolumes: {
      distributor: "₹1,800 personal",
      bronze:      "₹9,000 (5 × ₹1,800)",
      silver:      "₹45,000 (5 Bronze × ₹9,000)",
      golden:      "₹2,25,000 (5 Silver × ₹45,000)",
    },
    logins: {
      golden:      "ramesh.g@hervovibe.in / Member@123",
      rankMismatch: "sunil.m@hervovibe.in / Member@123",
      solo:        "neeraj.solo@hervovibe.in / Member@123",
    },
  });
}
