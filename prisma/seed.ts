import { PrismaClient, Role, AssetStatus, DepreciationMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// IT ACT BLOCKS — Appendix I, Income Tax Rules 1962 (WDV method)
// Each "block" pools all assets with the same rate. Dep = block WDV × rate.
// ─────────────────────────────────────────────────────────────────────────────
const IT_BLOCKS = [
  { code: "BLOCK-5",    name: "5% — Residential Buildings",                rate: 0.05,  desc: "Residential buildings other than hotels & boarding houses" },
  { code: "BLOCK-10A",  name: "10% — Commercial & Factory Buildings",       rate: 0.10,  desc: "Buildings other than residential (offices, factories, warehouses)" },
  { code: "BLOCK-10B",  name: "10% — Furniture & Fittings",                 rate: 0.10,  desc: "Furniture & fittings including electrical fittings" },
  { code: "BLOCK-15A",  name: "15% — Plant & Machinery (General)",          rate: 0.15,  desc: "P&M not covered under any other block — air conditioners, generators, general equipment" },
  { code: "BLOCK-15B",  name: "15% — Motor Vehicles (Not on Hire)",         rate: 0.15,  desc: "Motor cars, motorcycles, scooters not used in hiring business" },
  { code: "BLOCK-20",   name: "20% — Ships & Vessels",                      rate: 0.20,  desc: "Ocean-going ships and vessels" },
  { code: "BLOCK-25",   name: "25% — Intangible Assets",                    rate: 0.25,  desc: "Know-how, patents, copyrights, trademarks, licences, franchises" },
  { code: "BLOCK-30",   name: "30% — Motor Vehicles on Hire",               rate: 0.30,  desc: "Motor taxis, lorries, motor buses used in business of running on hire" },
  { code: "BLOCK-40A",  name: "40% — Computers & Software",                 rate: 0.40,  desc: "Computers including computer software (as per Finance Act 2016)" },
  { code: "BLOCK-40B",  name: "40% — Aircraft",                             rate: 0.40,  desc: "Aeroplanes, helicopters" },
  { code: "BLOCK-100",  name: "100% — Temporary Structures",                rate: 1.00,  desc: "Purely temporary erections such as wooden structures" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CA CATEGORIES — Schedule II, Companies Act 2013 (SLM method)
// Useful life and method per Schedule II. No IT Act rate stored here.
// ─────────────────────────────────────────────────────────────────────────────
const CA_CATEGORIES = [
  // Buildings
  {
    code: "BLDG-RES",  name: "Buildings – Residential",              group: "Buildings",
    life: 60, method: DepreciationMethod.SLM, intangible: false,
    desc: "Houses, flats, staff quarters — RCC frame structure",
    fields: [
      { key: "areaSqft", label: "Area (sq ft)", type: "number" },
      { key: "floorNo",  label: "Floor Number" },
      { key: "wing",     label: "Wing / Block" },
    ],
  },
  {
    code: "BLDG-COM",  name: "Buildings – Commercial & Factory",      group: "Buildings",
    life: 30, method: DepreciationMethod.SLM, intangible: false,
    desc: "Office buildings, factories, warehouses, shops",
    fields: [
      { key: "areaSqft",   label: "Area (sq ft)", type: "number" },
      { key: "floorNo",    label: "Floor Number" },
      { key: "wing",       label: "Wing / Block" },
      { key: "propTaxNo",  label: "Property Tax Account No" },
    ],
  },
  {
    code: "BLDG-TMP",  name: "Buildings – Temporary Structures",      group: "Buildings",
    life: 3, method: DepreciationMethod.SLM, intangible: false,
    desc: "Temporary erections, wooden structures, prefabricated cabins",
    fields: null,
  },
  // Furniture & Fittings
  {
    code: "FURN",      name: "Furniture & Fittings",                  group: "Furniture & Fittings",
    life: 10, method: DepreciationMethod.SLM, intangible: false,
    desc: "Desks, chairs, cabinets, electrical fittings, partitions",
    fields: null,
  },
  // Plant & Machinery
  {
    code: "PM-GEN",    name: "Plant & Machinery – General",           group: "Plant & Machinery",
    life: 15, method: DepreciationMethod.SLM, intangible: false,
    desc: "Generators, UPS, general machinery, HVAC equipment",
    fields: [
      { key: "capacityKva", label: "Capacity (KVA/Ton)", type: "number" },
    ],
  },
  {
    code: "PM-OFFICE", name: "Office Equipment",                       group: "Plant & Machinery",
    life: 5, method: DepreciationMethod.SLM, intangible: false,
    desc: "Projectors, printers, photocopiers, EPABX, telephone systems",
    fields: null,
  },
  // Computers
  {
    code: "COMP-LAPT", name: "Laptops & Notebooks",                   group: "Computers & Data Processing",
    life: 3, method: DepreciationMethod.SLM, intangible: false,
    desc: "Portable computers, notebooks, ultra-books",
    fields: [
      { key: "macAddress", label: "MAC Address" },
      { key: "osVersion",  label: "OS Version" },
      { key: "processor",  label: "Processor" },
      { key: "ramGb",      label: "RAM (GB)", type: "number" },
      { key: "storageGb",  label: "Storage (GB)", type: "number" },
    ],
  },
  {
    code: "COMP-DESK", name: "Desktop Computers",                      group: "Computers & Data Processing",
    life: 3, method: DepreciationMethod.SLM, intangible: false,
    desc: "Desktop PCs, workstations, all-in-ones",
    fields: [
      { key: "macAddress", label: "MAC Address" },
      { key: "osVersion",  label: "OS Version" },
      { key: "processor",  label: "Processor" },
      { key: "ramGb",      label: "RAM (GB)", type: "number" },
      { key: "storageGb",  label: "Storage (GB)", type: "number" },
    ],
  },
  {
    code: "COMP-SERV", name: "Servers & Storage Systems",              group: "Computers & Data Processing",
    life: 3, method: DepreciationMethod.SLM, intangible: false,
    desc: "Physical & virtual servers, NAS/SAN, storage arrays",
    fields: [
      { key: "ipAddress",  label: "IP Address" },
      { key: "osVersion",  label: "OS Version" },
      { key: "processor",  label: "CPU Model" },
      { key: "ramGb",      label: "RAM (GB)", type: "number" },
      { key: "storageTb",  label: "Storage (TB)", type: "number" },
      { key: "rackUnit",   label: "Rack / Unit Location" },
    ],
  },
  {
    code: "COMP-NETW", name: "Networking & Communication Equipment",   group: "Computers & Data Processing",
    life: 3, method: DepreciationMethod.SLM, intangible: false,
    desc: "Routers, switches, firewalls, access points",
    fields: null,
  },
  // Vehicles
  {
    code: "VEH-MOTOR", name: "Motor Vehicles",                         group: "Vehicles",
    life: 8, method: DepreciationMethod.WDV, intangible: false,
    desc: "Cars, SUVs, two-wheelers, vans — all motor vehicles",
    fields: [
      { key: "chassisNo",      label: "Chassis Number" },
      { key: "engineNo",       label: "Engine Number" },
      { key: "registrationNo", label: "Registration Number" },
      { key: "fuelType",       label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"] },
    ],
  },
  {
    code: "VEH-HIRE",  name: "Commercial Vehicles (For Hire)",          group: "Vehicles",
    life: 8, method: DepreciationMethod.WDV, intangible: false,
    desc: "Taxis, trucks, buses, lorries used in hiring business",
    fields: [
      { key: "chassisNo",      label: "Chassis Number" },
      { key: "engineNo",       label: "Engine Number" },
      { key: "registrationNo", label: "Registration Number" },
      { key: "permitNo",       label: "Permit / Route Number" },
    ],
  },
  {
    code: "SHIP",      name: "Ships & Vessels",                         group: "Vehicles",
    life: 20, method: DepreciationMethod.SLM, intangible: false,
    desc: "Ocean-going ships, vessels",
    fields: null,
  },
  {
    code: "AIRCRAFT",  name: "Aircraft",                                group: "Vehicles",
    life: 20, method: DepreciationMethod.SLM, intangible: false,
    desc: "Aeroplanes, helicopters",
    fields: null,
  },
  // Intangibles
  {
    code: "INTG-SOFT", name: "Computer Software",                       group: "Intangible Assets",
    life: 3, method: DepreciationMethod.SLM, intangible: true,
    desc: "ERP, licensed application software, operating systems",
    fields: null,
  },
  {
    code: "INTG-IPR",  name: "Intellectual Property Rights",            group: "Intangible Assets",
    life: 10, method: DepreciationMethod.SLM, intangible: true,
    desc: "Patents, trademarks, copyrights, licences, franchises, know-how",
    fields: null,
  },
];

async function main() {
  console.log("Seeding…");

  // ── Locations ────────────────────────────────────────────────────────────
  const mumbai = await prisma.location.upsert({
    where: { code: "MUM-HO" }, update: {},
    create: { code: "MUM-HO", name: "Mumbai Head Office", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  });
  const pune = await prisma.location.upsert({
    where: { code: "PUNE-BR" }, update: {},
    create: { code: "PUNE-BR", name: "Pune Branch", city: "Pune", state: "Maharashtra", pincode: "411001" },
  });

  // ── Departments ──────────────────────────────────────────────────────────
  const itDept = await prisma.department.upsert({
    where: { code: "IT" }, update: {},
    create: { code: "IT", name: "Information Technology", locationId: mumbai.id },
  });
  const hrDept = await prisma.department.upsert({
    where: { code: "HR" }, update: {},
    create: { code: "HR", name: "Human Resources", locationId: mumbai.id },
  });
  const finDept = await prisma.department.upsert({
    where: { code: "FIN" }, update: {},
    create: { code: "FIN", name: "Finance & Accounts", locationId: mumbai.id },
  });
  const pBranch = await prisma.department.upsert({
    where: { code: "PUNE-OPS" }, update: {},
    create: { code: "PUNE-OPS", name: "Pune Operations", locationId: pune.id },
  });

  // ── IT Act Blocks ─────────────────────────────────────────────────────────
  console.log("  Creating IT Act blocks…");
  const blockMap: Record<string, string> = {};
  for (const b of IT_BLOCKS) {
    const block = await prisma.itActBlock.upsert({
      where: { code: b.code }, update: { name: b.name, rate: b.rate, description: b.desc },
      create: { code: b.code, name: b.name, rate: b.rate, description: b.desc },
    });
    blockMap[b.code] = block.id;
  }
  console.log(`  ${IT_BLOCKS.length} IT Act blocks ready.`);

  // ── CA Categories ─────────────────────────────────────────────────────────
  console.log("  Creating Companies Act categories…");
  // Clear assets first to allow category deletion
  await prisma.auditEntry.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.depreciationRecord.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.assetAllocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();

  const catMap: Record<string, string> = {};
  for (const c of CA_CATEGORIES) {
    const cat = await prisma.assetCategory.create({
      data: {
        code: c.code, name: c.name, group: c.group,
        usefulLifeCompaniesAct: c.life,
        depreciationMethod: c.method,
        isIntangible: c.intangible,
        assetClassDescription: c.desc,
        customFields: c.fields as never ?? null,
      },
    });
    catMap[c.code] = cat.id;
  }
  console.log(`  ${CA_CATEGORIES.length} CA categories ready.`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fams.com" }, update: {},
    create: { email: "admin@fams.com", name: "System Admin", password: hash, role: Role.SUPER_ADMIN },
  });
  await prisma.user.upsert({
    where: { email: "manager@fams.com" }, update: {},
    create: { email: "manager@fams.com", name: "Rajesh Kumar", password: hash, role: Role.BRANCH_MANAGER, locationId: mumbai.id },
  });
  const employee = await prisma.user.upsert({
    where: { email: "employee@fams.com" }, update: {},
    create: { email: "employee@fams.com", name: "Priya Sharma", password: hash, role: Role.EMPLOYEE, locationId: mumbai.id, departmentId: itDept.id },
  });

  // ── Supplier ──────────────────────────────────────────────────────────────
  const supplier = await prisma.supplier.upsert({
    where: { code: "S0001" }, update: {},
    create: { code: "S0001", name: "Comtel Infosystems Pvt. Ltd", city: "Mumbai", state: "Maharashtra", contactPerson: "Rahul Mehta", email: "sales@comtel.in" },
  });

  // ── Sample Assets (categoryId + itActBlockId both set) ────────────────────
  const assets = [
    {
      assetCode: "FAM-COMP-2024-0001", assetTagNumber: "FAM-COMP-2024-0001",
      name: "Dell Laptop Latitude 5520", make: "Dell", model: "Latitude 5520", serialNumber: "SN-DL-00330",
      categoryId: catMap["COMP-LAPT"], itActBlockId: blockMap["BLOCK-40A"],
      purchaseDate: new Date("2024-01-15"), purchaseCost: 75000, gstPaid: 13500, residualValue: 3750,
      status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: itDept.id,
      assignedUserId: employee.id, assignedToType: "USER" as never,
      condition: "NEW", invoiceNumber: "INV-2024-001", supplierId: supplier.id, createdByUserId: admin.id,
      customValues: { macAddress: "A4:C3:F0:12:34:56", osVersion: "Windows 11 Pro", processor: "Intel Core i5-11th Gen", ramGb: "16", storageGb: "512" },
    },
    {
      assetCode: "FAM-COMP-2024-0002", assetTagNumber: "FAM-COMP-2024-0002",
      name: "HP Server ProLiant DL380", make: "HP", model: "ProLiant DL380", serialNumber: "SN-HP-00331",
      categoryId: catMap["COMP-SERV"], itActBlockId: blockMap["BLOCK-40A"],
      purchaseDate: new Date("2020-06-01"), purchaseCost: 350000, gstPaid: 63000, residualValue: 17500,
      status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: itDept.id,
      assignedToType: "OFFICE" as never, condition: "GOOD", createdByUserId: admin.id,
      customValues: { macAddress: "B4:D3:E0:22:45:67", osVersion: "Windows Server 2022", processor: "Intel Xeon Silver 4210", ramGb: "128", storageGb: "4096" },
    },
    {
      assetCode: "FAM-FURN-2024-0001", assetTagNumber: "FAM-FURN-2024-0001",
      name: "Executive Office Chair", make: "Godrej", model: "Interio Pro",
      categoryId: catMap["FURN"], itActBlockId: blockMap["BLOCK-10B"],
      purchaseDate: new Date("2023-04-01"), purchaseCost: 15000, gstPaid: 2700, residualValue: 750,
      status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: hrDept.id,
      assignedToType: "OFFICE" as never, condition: "GOOD", createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-MCAR-2024-0001", assetTagNumber: "FAM-MCAR-2024-0001",
      name: "Toyota Innova Crysta", make: "Toyota", model: "Innova Crysta 2.4G", serialNumber: "MH01AB1234",
      categoryId: catMap["VEH-MOTOR"], itActBlockId: blockMap["BLOCK-15B"],
      purchaseDate: new Date("2022-06-15"), purchaseCost: 2200000, gstPaid: 396000, residualValue: 110000,
      status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: finDept.id,
      assignedToType: "OFFICE" as never, insuranceExpiry: new Date("2025-06-14"), pucExpiry: new Date("2025-03-14"),
      condition: "GOOD", createdByUserId: admin.id,
      customValues: { chassisNo: "MA1AB23456789", engineNo: "2GD78901", registrationNo: "MH01AB1234", fuelType: "Diesel" },
    },
    {
      assetCode: "FAM-PM-2024-0001", assetTagNumber: "FAM-PM-2024-0001",
      name: "Canon Photocopier IR2625", make: "Canon", model: "IR2625", serialNumber: "CNX12345",
      categoryId: catMap["PM-OFFICE"], itActBlockId: blockMap["BLOCK-15A"],
      purchaseDate: new Date("2023-09-01"), purchaseCost: 85000, gstPaid: 15300, residualValue: 4250,
      status: AssetStatus.ACTIVE, currentLocationId: pune.id, currentDepartmentId: pBranch.id,
      assignedToType: "OFFICE" as never, warrantyExpiry: new Date("2025-08-31"),
      condition: "NEW", createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-BLDG-COM-2024-0001", assetTagNumber: "FAM-BLDG-COM-2024-0001",
      name: "Mumbai Office – Floor 5", make: "—",
      categoryId: catMap["BLDG-COM"], itActBlockId: blockMap["BLOCK-10A"],
      purchaseDate: new Date("2015-01-01"), purchaseCost: 12000000, gstPaid: 0, residualValue: 600000,
      status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: finDept.id,
      assignedToType: "OFFICE" as never, condition: "GOOD", createdByUserId: admin.id,
      customValues: { areaSqft: "4500", floorNo: "5", wing: "West Wing" },
    },
  ];

  for (const asset of assets) {
    await prisma.asset.create({ data: asset as never });
  }
  console.log(`  ${assets.length} sample assets created.`);

  // ── Alert Configs ──────────────────────────────────────────────────────────
  for (const type of ["AMC_EXPIRY", "INSURANCE_EXPIRY", "PUC_EXPIRY", "WARRANTY_EXPIRY", "SCHEDULED_SERVICE"] as const) {
    await prisma.alertConfig.upsert({
      where: { type }, update: {},
      create: { type, daysBeforeAlert: 15, isActive: true, notifyEmails: ["admin@fams.com"] },
    });
  }

  console.log("\nSeed complete!");
  console.log(`IT Act blocks: ${IT_BLOCKS.length} | CA categories: ${CA_CATEGORIES.length} | Assets: ${assets.length}`);
  console.log("Admin:    admin@fams.com / Admin@123");
  console.log("Manager:  manager@fams.com / Admin@123");
  console.log("Employee: employee@fams.com / Admin@123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
