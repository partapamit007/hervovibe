import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

const MEMBER_PASS = "Member@123";

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
  "Varsha","Shyam","Renu","Praveen","Dilip","Saroj","Ramesh","Pooja","Sanjana","Dipika",
];
const LAST = [
  "Kumar","Singh","Sharma","Verma","Gupta","Patel","Yadav","Pandey","Tiwari","Joshi",
  "Mishra","Mehta","Jain","Bose","Rao","Shah","Sinha","Das","Choudhary","Dubey",
  "Tripathi","Saxena","Awasthi","Bajpai","Srivastava","Thakur","Garg","Nair","Iyer","Chauhan",
];

let nameIdx = 0;
let memberNum = 2000;

function nextName() {
  const f = FIRST[nameIdx % FIRST.length];
  const l = LAST[Math.floor(nameIdx / FIRST.length) % LAST.length];
  nameIdx++;
  return `${f} ${l}`;
}
function nextMemberId() {
  memberNum++;
  return `HV-${String(memberNum).padStart(4, "0")}`;
}
function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
}
function nextPhone() {
  return `98${String(10000000 + nameIdx).slice(1)}`;
}

async function upsertUser(data: any) {
  const ex = await prisma.user.findUnique({ where: { email: data.email } });
  return ex ?? await prisma.user.create({ data });
}

async function addSale(memberId: string, adminId: string, month: number, year: number) {
  const ex = await prisma.sale.findFirst({ where: { memberId, month, year, amount: 1800 } });
  if (!ex) await prisma.sale.create({ data: { memberId, enteredById: adminId, amount: 1800, month, year } });
}

function prevMonth(m: number, y: number, offset: number) {
  let mo = m - offset;
  let yr = y;
  while (mo <= 0) { mo += 12; yr--; }
  return { month: mo, year: yr };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "MASTER_ADMIN")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now   = new Date();
  const MONTH = now.getMonth() + 1;
  const YEAR  = now.getFullYear();
  const log: string[] = [];

  const admin = await prisma.user.findUnique({ where: { email: "admin@hervovibe.in" } });
  if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 500 });

  const tm1 = await upsertUser({
    name: "Rahul Sharma", email: "rahul.team@hervovibe.in",
    password: await bcrypt.hash("Team@123", 10),
    role: "TEAM_MEMBER", rank: "GOLDEN", memberId: "HV-TM01", phone: "9876500001",
  });
  const tm2 = await upsertUser({
    name: "Priya Singh", email: "priya.team@hervovibe.in",
    password: await bcrypt.hash("Team@123", 10),
    role: "TEAM_MEMBER", rank: "SILVER", memberId: "HV-TM02", phone: "9876500002",
  });

  // ── GOLDEN TREE ────────────────────────────────────────────────
  // 1 Golden → 5 Silver → 25 Bronze → 125 Distributors (all buying ₹1800)
  // Group volumes: Bronze ₹9,000 | Silver ₹45,000 | Golden ₹2,25,000

  const golden = await upsertUser({
    name: "Ramesh Gupta", email: "ramesh.g@hervovibe.in",
    password: await bcrypt.hash(MEMBER_PASS, 10),
    role: "DISTRIBUTOR", rank: "GOLDEN", memberId: "HV-2001",
    phone: "9876520001", managedBy: tm1.id,
    joiningDate: new Date("2024-01-10"),
  });

  let created = 0;
  const pm1 = prevMonth(MONTH, YEAR, 1);
  const pm2 = prevMonth(MONTH, YEAR, 2);

  for (let si = 0; si < 5; si++) {
    const sName = nextName();
    const silver = await upsertUser({
      name: sName, email: `${toSlug(sName)}.sv${si}@hervovibe.in`,
      password: await bcrypt.hash(MEMBER_PASS, 10),
      role: "DISTRIBUTOR", rank: "SILVER", memberId: nextMemberId(),
      phone: nextPhone(), managedBy: tm1.id, sponsorId: golden.id,
      joiningDate: new Date("2024-03-01"),
    });
    for (let bi = 0; bi < 5; bi++) {
      const bName = nextName();
      const bronze = await upsertUser({
        name: bName, email: `${toSlug(bName)}.br${si}${bi}@hervovibe.in`,
        password: await bcrypt.hash(MEMBER_PASS, 10),
        role: "DISTRIBUTOR", rank: "BRONZE", memberId: nextMemberId(),
        phone: nextPhone(), managedBy: tm1.id, sponsorId: silver.id,
        joiningDate: new Date("2024-05-01"),
      });
      for (let di = 0; di < 5; di++) {
        const dName = nextName();
        const dist = await upsertUser({
          name: dName, email: `${toSlug(dName)}.d${si}${bi}${di}@hervovibe.in`,
          password: await bcrypt.hash(MEMBER_PASS, 10),
          role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: nextMemberId(),
          phone: nextPhone(), managedBy: tm2.id, sponsorId: bronze.id,
          joiningDate: new Date("2024-07-01"),
        });
        // 3 months of ₹1,800 sales
        await addSale(dist.id, admin.id, MONTH, YEAR);
        await addSale(dist.id, admin.id, pm1.month, pm1.year);
        await addSale(dist.id, admin.id, pm2.month, pm2.year);
        created++;
      }
    }
  }
  log.push(`Golden tree: 1 Golden + 5 Silver + 25 Bronze + ${created} Distributors`);

  // ── BRONZE WITH 3 DOWNLINE (rank mismatch demo) ─────────────
  const bronzeUnder5 = await upsertUser({
    name: "Sunil Mehta", email: "sunil.m@hervovibe.in",
    password: await bcrypt.hash(MEMBER_PASS, 10),
    role: "DISTRIBUTOR", rank: "BRONZE", memberId: "HV-3001",
    phone: "9876530001", managedBy: tm2.id,
    joiningDate: new Date("2024-09-01"),
  });
  await addSale(bronzeUnder5.id, admin.id, MONTH, YEAR);

  for (const [i, n] of (["Ritu Kumar","Arvind Singh","Geeta Sharma"] as string[]).entries()) {
    const d = await upsertUser({
      name: n, email: `${toSlug(n)}.u${i}@hervovibe.in`,
      password: await bcrypt.hash(MEMBER_PASS, 10),
      role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: `HV-300${i + 2}`,
      phone: `987653100${i + 1}`, managedBy: tm2.id, sponsorId: bronzeUnder5.id,
      joiningDate: new Date("2024-10-01"),
    });
    await addSale(d.id, admin.id, MONTH, YEAR);
  }
  log.push("Rank-mismatch demo: Sunil Mehta (BRONZE, 3/5 downline)");

  // ── 5 STANDALONE DISTRIBUTORS ─────────────────────────────
  const solos = [
    { name: "Neeraj Yadav",  phone: "9876540001", id: "HV-4001" },
    { name: "Sanjeev Patel", phone: "9876540002", id: "HV-4002" },
    { name: "Meena Joshi",   phone: "9876540003", id: "HV-4003" },
    { name: "Ajay Pandey",   phone: "9876540004", id: "HV-4004" },
    { name: "Babita Tiwari", phone: "9876540005", id: "HV-4005" },
  ];
  for (const s of solos) {
    const d = await upsertUser({
      name: s.name, email: `${toSlug(s.name)}.solo@hervovibe.in`,
      password: await bcrypt.hash(MEMBER_PASS, 10),
      role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: s.id,
      phone: s.phone, managedBy: tm2.id,
      joiningDate: new Date("2025-01-15"),
    });
    await addSale(d.id, admin.id, MONTH, YEAR);
  }
  log.push("5 standalone distributors (no downline)");

  const totalMembers = await prisma.user.count({ where: { role: "DISTRIBUTOR", deletedAt: null } });
  const totalSales   = await prisma.sale.count();

  return NextResponse.json({
    success: true,
    log,
    totals: { members: totalMembers, sales: totalSales },
    groupVolumes: {
      distributor: "₹1,800 personal",
      bronze: "₹9,000 (5 × ₹1,800)",
      silver: "₹45,000 (5 Bronze × ₹9,000)",
      golden: "₹2,25,000 (5 Silver × ₹45,000)",
    },
    logins: {
      golden: "ramesh.g@hervovibe.in / Member@123",
      rankMismatch: "sunil.m@hervovibe.in / Member@123",
      solo: "neeraj.yadav.solo@hervovibe.in / Member@123",
    },
  });
}
