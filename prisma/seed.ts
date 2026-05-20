import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

const MEMBER_PASS = "Member@123";
const NOW   = new Date();
const MONTH = NOW.getMonth() + 1;
const YEAR  = NOW.getFullYear();

// ── Name pool (170+ unique members) ──────────────────────────────
const FIRST = [
  "Rajan","Sunita","Priya","Amit","Meena","Kavita","Deepak","Sanjay","Geeta","Neha",
  "Vikram","Ankit","Suresh","Nirmala","Vijay","Ramesh","Seema","Tarun","Asha","Pankaj",
  "Mohan","Kiran","Ravi","Anita","Sunil","Lata","Arun","Shanti","Manoj","Usha",
  "Dinesh","Sarla","Mukesh","Radha","Vinod","Mala","Naresh","Pushpa","Kishore","Savita",
  "Bharat","Laxmi","Hemant","Prakash","Chandra","Uma","Rajesh","Nita","Sushil","Rekha",
  "Ashok","Sheela","Prem","Vimla","Girish","Nisha","Harish","Madhu","Rakesh","Komal",
  "Yogesh","Sundar","Devika","Ajay","Preeti","Sachin","Babita","Rohit","Aarti","Vishal",
  "Pooja","Sandeep","Rita","Ritesh","Kamla","Rajni","Lalit","Sonal","Paresh","Hema",
  "Nilesh","Manjula","Satish","Bimla","Navin","Shalini","Ganesh","Sudha","Mahesh","Tara",
  "Hitesh","Sapna","Raksha","Devendra","Suneel","Archana","Tushar","Neeraj","Vandana","Sanjana",
  "Ashwini","Gaurav","Swati","Umesh","Jaya","Dhruv","Reena","Pramod","Smita","Yash",
  "Kamal","Divya","Alka","Hemraj","Manisha","Vikas","Shefali","Ajit","Nandita","Balram",
  "Rashmi","Naveen","Shruti","Milind","Varsha","Shyam","Renu","Praveen","Dilip","Saroj",
];
const LAST = [
  "Kumar","Singh","Sharma","Verma","Gupta","Patel","Yadav","Pandey","Tiwari","Joshi",
  "Mishra","Mehta","Jain","Bose","Rao","Shah","Sinha","Das","Choudhary","Dubey",
  "Tripathi","Saxena","Awasthi","Bajpai","Srivastava","Thakur","Garg","Nair","Iyer","Chauhan",
];

let _nameIdx = 0;
let _memberNum = 2000;

function nextName(): string {
  const first = FIRST[_nameIdx % FIRST.length];
  const last  = LAST[Math.floor(_nameIdx / FIRST.length) % LAST.length];
  _nameIdx++;
  return `${first} ${last}`;
}
function nextId(): string {
  _memberNum++;
  return `HV-${String(_memberNum).padStart(4, "0")}`;
}
function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z.]/g, "");
}
function nextPhone(): string {
  return `98${String(10000000 + _nameIdx).slice(1)}`;
}

async function upsert(data: any) {
  const ex = await prisma.user.findUnique({ where: { email: data.email } });
  return ex ?? await prisma.user.create({ data });
}

async function sale(memberId: string, adminId: string, month: number, year: number) {
  const ex = await prisma.sale.findFirst({ where: { memberId, month, year, amount: 1800 } });
  if (!ex) await prisma.sale.create({ data: { memberId, enteredById: adminId, amount: 1800, month, year } });
}

// Previous month helper
function prevMonth(m: number, y: number, offset: number): { month: number; year: number } {
  let mo = m - offset;
  let yr = y;
  while (mo <= 0) { mo += 12; yr--; }
  return { month: mo, year: yr };
}

async function main() {
  console.log("🌱 Seeding Hervovibe with realistic ₹1,800-per-member data...\n");

  // ── SYSTEM USERS ───────────────────────────────────────────────
  const admin = await upsert({
    name: "Master Admin", email: "admin@hervovibe.in",
    password: await bcrypt.hash("Admin@123", 10),
    role: "MASTER_ADMIN", rank: "CENTENNIAL", memberId: "HV-0001",
  });

  const tm1 = await upsert({
    name: "Rahul Sharma", email: "rahul.team@hervovibe.in",
    password: await bcrypt.hash("Team@123", 10),
    role: "TEAM_MEMBER", rank: "GOLDEN", memberId: "HV-TM01", phone: "9876500001",
  });

  const tm2 = await upsert({
    name: "Priya Singh", email: "priya.team@hervovibe.in",
    password: await bcrypt.hash("Team@123", 10),
    role: "TEAM_MEMBER", rank: "SILVER", memberId: "HV-TM02", phone: "9876500002",
  });

  // ── GOLDEN TREE ────────────────────────────────────────────────
  //
  //  MLM Math (every member buys ₹1,800/month personally):
  //
  //  Distributor (leaf)  →  ₹1,800 personal
  //  Bronze  (5 dist)    →  5 × ₹1,800  =    ₹9,000  group  ✓ Bronze target
  //  Silver  (5 bronze)  →  5 × ₹9,000  =   ₹45,000  group  ✓ Silver target
  //  Golden  (5 silver)  →  5 × ₹45,000 = ₹2,25,000  group  ✓ Golden target
  //
  //  Total tree: 1 Golden + 5 Silver + 25 Bronze + 125 Distributors = 156 members
  //  Every single rank is correctly qualified.

  const golden = await upsert({
    name: "Ramesh Gupta", email: "ramesh.g@hervovibe.in",
    password: await bcrypt.hash(MEMBER_PASS, 10),
    role: "DISTRIBUTOR", rank: "GOLDEN", memberId: "HV-2001",
    phone: "9876520001", managedBy: tm1.id,
    joiningDate: new Date("2024-01-10"),
  });

  const leafIds: string[] = [];

  for (let si = 0; si < 5; si++) {
    const sName = nextName();
    const silver = await upsert({
      name: sName, email: `${toSlug(sName)}.sv${si}@hervovibe.in`,
      password: await bcrypt.hash(MEMBER_PASS, 10),
      role: "DISTRIBUTOR", rank: "SILVER", memberId: nextId(),
      phone: nextPhone(), managedBy: tm1.id, sponsorId: golden.id,
      joiningDate: new Date("2024-03-01"),
    });

    for (let bi = 0; bi < 5; bi++) {
      const bName = nextName();
      const bronze = await upsert({
        name: bName, email: `${toSlug(bName)}.br${si}${bi}@hervovibe.in`,
        password: await bcrypt.hash(MEMBER_PASS, 10),
        role: "DISTRIBUTOR", rank: "BRONZE", memberId: nextId(),
        phone: nextPhone(), managedBy: tm1.id, sponsorId: silver.id,
        joiningDate: new Date("2024-05-01"),
      });

      for (let di = 0; di < 5; di++) {
        const dName = nextName();
        const dist = await upsert({
          name: dName, email: `${toSlug(dName)}.d${si}${bi}${di}@hervovibe.in`,
          password: await bcrypt.hash(MEMBER_PASS, 10),
          role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: nextId(),
          phone: nextPhone(), managedBy: tm2.id, sponsorId: bronze.id,
          joiningDate: new Date("2024-07-01"),
        });
        leafIds.push(dist.id);
        // Current month ₹1,800 sale for each leaf distributor
        await sale(dist.id, admin.id, MONTH, YEAR);
        // Last 2 months too (for chart data)
        const pm1 = prevMonth(MONTH, YEAR, 1);
        const pm2 = prevMonth(MONTH, YEAR, 2);
        await sale(dist.id, admin.id, pm1.month, pm1.year);
        await sale(dist.id, admin.id, pm2.month, pm2.year);
      }
    }
  }

  console.log(`✅ Golden tree: 1 + 5 + 25 + 125 = 156 members`);
  console.log(`   Group volumes: Bronze ₹9,000 | Silver ₹45,000 | Golden ₹2,25,000`);

  // ── BRONZE WITH ONLY 3 MEMBERS (rank mismatch demo) ───────────
  //  Rank set to BRONZE but only 3 downline — warning should appear on profile.
  //  Group volume = 3 × ₹1,800 = ₹5,400 (below Bronze ₹9,000 target too)

  const bronzeUnder5 = await upsert({
    name: "Sunil Mehta", email: "sunil.m@hervovibe.in",
    password: await bcrypt.hash(MEMBER_PASS, 10),
    role: "DISTRIBUTOR", rank: "BRONZE", memberId: "HV-3001",
    phone: "9876530001", managedBy: tm2.id,
    joiningDate: new Date("2024-09-01"),
  });
  await sale(bronzeUnder5.id, admin.id, MONTH, YEAR);

  const under5Names = ["Ritu Kumar","Arvind Singh","Geeta Sharma"];
  const under5Phones = ["9876531001","9876531002","9876531003"];
  for (let i = 0; i < 3; i++) {
    const d = await upsert({
      name: under5Names[i], email: `${toSlug(under5Names[i])}.u${i}@hervovibe.in`,
      password: await bcrypt.hash(MEMBER_PASS, 10),
      role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: `HV-300${i + 2}`,
      phone: under5Phones[i], managedBy: tm2.id, sponsorId: bronzeUnder5.id,
      joiningDate: new Date("2024-10-01"),
    });
    await sale(d.id, admin.id, MONTH, YEAR);
  }

  console.log(`✅ Rank-mismatch demo: Sunil Mehta (BRONZE, 3/5 downline) — sunil.m@hervovibe.in`);

  // ── 5 STANDALONE DISTRIBUTORS (no downline) ───────────────────
  //  Each buys ₹1,800 personally. No team. Rank = DISTRIBUTOR.

  const soloData = [
    { name: "Neeraj Yadav",   phone: "9876540001", id: "HV-4001" },
    { name: "Sanjeev Patel",  phone: "9876540002", id: "HV-4002" },
    { name: "Meena Joshi",    phone: "9876540003", id: "HV-4003" },
    { name: "Ajay Pandey",    phone: "9876540004", id: "HV-4004" },
    { name: "Babita Tiwari",  phone: "9876540005", id: "HV-4005" },
  ];

  for (const s of soloData) {
    const d = await upsert({
      name: s.name, email: `${toSlug(s.name)}.solo@hervovibe.in`,
      password: await bcrypt.hash(MEMBER_PASS, 10),
      role: "DISTRIBUTOR", rank: "DISTRIBUTOR", memberId: s.id,
      phone: s.phone, managedBy: tm2.id,
      joiningDate: new Date("2025-01-15"),
    });
    await sale(d.id, admin.id, MONTH, YEAR);
  }

  console.log(`✅ 5 standalone distributors (no downline) — HV-4001 to HV-4005`);

  // ── FINAL SUMMARY ──────────────────────────────────────────────
  const memberCount = await prisma.user.count({ where: { role: "DISTRIBUTOR", deletedAt: null } });
  const saleCount   = await prisma.sale.count();

  console.log(`\n📊 Database totals: ${memberCount} distributors, ${saleCount} sales`);
  console.log(`\n🔑 Test logins (password: Member@123 for all members):`);
  console.log(`   Master Admin:      admin@hervovibe.in / Admin@123`);
  console.log(`   Team Member 1:     rahul.team@hervovibe.in / Team@123`);
  console.log(`   Golden member:     ramesh.g@hervovibe.in`);
  console.log(`   Rank mismatch:     sunil.m@hervovibe.in  ← warning should show`);
  console.log(`   Solo distributor:  neeraj.yadav.solo@hervovibe.in`);
  console.log(`\n✅ Seed done!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
