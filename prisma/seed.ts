import { PrismaClient, Role, AssetStatus, DepreciationMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ──────────────────────────────────────────────────────────────────────────────
// OFFICIAL Income Tax Act (India) – Appendix I to IT Rules 1962
// Depreciation rates as per the block-of-assets method (WDV)
// Source: https://www.incometaxindia.gov.in/w/depreciation-rates
// ──────────────────────────────────────────────────────────────────────────────
const IT_ACT_CATEGORIES = [
  // ── 5 % ──────────────────────────────────────────────────────────────────
  {
    code: "BLDG-RES",
    name: "Buildings – Residential",
    group: "Buildings",
    itActBlock: "5% – Residential Buildings (other than hotels & boarding houses)",
    life: 60, rate: 0.05, method: DepreciationMethod.SLM, intangible: false,
    desc: "Houses, flats, staff quarters used for residential purposes",
    fields: [
      { key: "areaSqft", label: "Area (sq ft)", type: "number" },
      { key: "floorNo",  label: "Floor Number" },
      { key: "wing",     label: "Wing / Block"  },
    ],
  },
  // ── 10 % ─────────────────────────────────────────────────────────────────
  {
    code: "BLDG-COM",
    name: "Buildings – Commercial & Factory",
    group: "Buildings",
    itActBlock: "10% – Buildings (other than residential buildings)",
    life: 30, rate: 0.10, method: DepreciationMethod.SLM, intangible: false,
    desc: "Office buildings, factories, warehouses, shops",
    fields: [
      { key: "areaSqft", label: "Area (sq ft)", type: "number" },
      { key: "floorNo",  label: "Floor Number" },
      { key: "wing",     label: "Wing / Block"  },
      { key: "propTaxNo",label: "Property Tax Account No" },
    ],
  },
  {
    code: "FURN",
    name: "Furniture & Fittings",
    group: "Furniture & Fittings",
    itActBlock: "10% – Furniture & Fittings (including electrical fittings)",
    life: 10, rate: 0.10, method: DepreciationMethod.SLM, intangible: false,
    desc: "Desks, chairs, cabinets, electrical fittings, partitions",
    fields: null,
  },
  // ── 15 % ─────────────────────────────────────────────────────────────────
  {
    code: "PM",
    name: "Plant & Machinery – General",
    group: "Plant & Machinery",
    itActBlock: "15% – Plant & Machinery (General)",
    life: 15, rate: 0.15, method: DepreciationMethod.SLM, intangible: false,
    desc: "Air conditioners, HVAC, generators, UPS, general machinery",
    fields: null,
  },
  // P&M sub-categories (all 15%) — different custom fields / tracking needs
  {
    code: "PM-OFFICE",
    name: "Office Equipment",
    group: "Plant & Machinery",
    itActBlock: "15% – Plant & Machinery (General)",
    life: 5, rate: 0.15, method: DepreciationMethod.SLM, intangible: false,
    desc: "Projectors, display systems, telephone instruments, EPABX sets",
    fields: null,
  },
  {
    code: "PM-HVAC",
    name: "Air Conditioning & HVAC",
    group: "Plant & Machinery",
    itActBlock: "15% – Plant & Machinery (General)",
    life: 10, rate: 0.15, method: DepreciationMethod.SLM, intangible: false,
    desc: "Air conditioners (split/window), chillers, AHUs, cooling towers",
    fields: [
      { key: "capacityTon", label: "Capacity (Ton)", type: "number" },
      { key: "starRating",  label: "Star Rating", type: "select", options: ["1★", "2★", "3★", "4★", "5★"] },
      { key: "gasType",     label: "Refrigerant", type: "select", options: ["R22", "R32", "R410A", "R134a"] },
    ],
  },
  {
    code: "MCAR",
    name: "Motor Cars (Not for Hire)",
    group: "Vehicles",
    itActBlock: "15% – Motor Cars (not used in business of running on hire)",
    life: 8, rate: 0.15, method: DepreciationMethod.WDV, intangible: false,
    desc: "Company cars, two-wheelers used for business (not hire)",
    fields: [
      { key: "chassisNo",      label: "Chassis Number" },
      { key: "engineNo",       label: "Engine Number" },
      { key: "registrationNo", label: "Registration Number" },
      { key: "fuelType",       label: "Fuel Type", type: "select", options: ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"] },
    ],
  },
  {
    code: "VEH-2W",
    name: "Two-Wheelers (Not for Hire)",
    group: "Vehicles",
    itActBlock: "15% – Motor Cars (not used in business of running on hire)",
    life: 8, rate: 0.15, method: DepreciationMethod.WDV, intangible: false,
    desc: "Motorcycles, scooters used for business (not hire)",
    fields: [
      { key: "chassisNo",      label: "Chassis Number" },
      { key: "engineNo",       label: "Engine Number" },
      { key: "registrationNo", label: "Registration Number" },
      { key: "fuelType",       label: "Fuel Type", type: "select", options: ["Petrol", "Electric"] },
    ],
  },
  // ── 20 % ─────────────────────────────────────────────────────────────────
  {
    code: "SHIP",
    name: "Ships & Vessels",
    group: "Vehicles",
    itActBlock: "20% – Ocean-going ships & vessels",
    life: 20, rate: 0.20, method: DepreciationMethod.SLM, intangible: false,
    desc: "Ocean-going ships, vessels used for business",
    fields: null,
  },
  // ── 25 % ─────────────────────────────────────────────────────────────────
  {
    code: "INTG",
    name: "Intangible Assets",
    group: "Intangible Assets",
    itActBlock: "25% – Know-how, Patents, Copyrights, Trademarks, Licences, Franchises or any other commercial rights of similar nature",
    life: 10, rate: 0.25, method: DepreciationMethod.SLM, intangible: true,
    desc: "Patents, trademarks, copyrights, licences, goodwill, technical know-how, software licences",
    fields: null,
  },
  // ── 30 % ─────────────────────────────────────────────────────────────────
  {
    code: "HIREVEH",
    name: "Motor Vehicles for Hire",
    group: "Vehicles",
    itActBlock: "30% – Motor taxis, lorries, motor buses used in business of running on hire",
    life: 8, rate: 0.30, method: DepreciationMethod.WDV, intangible: false,
    desc: "Taxis, trucks, buses, auto-rickshaws used in hire/transport business",
    fields: [
      { key: "chassisNo",      label: "Chassis Number" },
      { key: "engineNo",       label: "Engine Number" },
      { key: "registrationNo", label: "Registration Number" },
      { key: "permitNo",       label: "Permit / Route Number" },
    ],
  },
  // ── 40 % ─────────────────────────────────────────────────────────────────
  // Sub-categories under "Computers including computer software" (40%)
  // All share the same IT Act block; split for physical tracking purposes only.
  {
    code: "COMP-LAPT",
    name: "Laptops & Notebooks",
    group: "Computers & IT Equipment",
    itActBlock: "40% – Computers including computer software",
    life: 3, rate: 0.40, method: DepreciationMethod.WDV, intangible: false,
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
    code: "COMP-DESK",
    name: "Desktop Computers",
    group: "Computers & IT Equipment",
    itActBlock: "40% – Computers including computer software",
    life: 3, rate: 0.40, method: DepreciationMethod.WDV, intangible: false,
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
    code: "COMP-SERV",
    name: "Servers & Storage Systems",
    group: "Computers & IT Equipment",
    itActBlock: "40% – Computers including computer software",
    life: 3, rate: 0.40, method: DepreciationMethod.WDV, intangible: false,
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
    code: "COMP-PRNT",
    name: "Printers, Scanners & Copiers",
    group: "Computers & IT Equipment",
    itActBlock: "40% – Computers including computer software",
    life: 3, rate: 0.40, method: DepreciationMethod.WDV, intangible: false,
    desc: "Printers, scanners, photocopiers, fax machines, multifunction devices",
    fields: null,
  },
  {
    code: "COMP-NETW",
    name: "Networking & Communication Equipment",
    group: "Computers & IT Equipment",
    itActBlock: "40% – Computers including computer software",
    life: 3, rate: 0.40, method: DepreciationMethod.WDV, intangible: false,
    desc: "Routers, switches, firewalls, access points, EPABX, UPS",
    fields: null,
  },
  {
    code: "AIRCRAFT",
    name: "Aircraft",
    group: "Vehicles",
    itActBlock: "40% – Aircraft",
    life: 20, rate: 0.40, method: DepreciationMethod.SLM, intangible: false,
    desc: "Aeroplanes, helicopters",
    fields: null,
  },
  // ── 60 % ─────────────────────────────────────────────────────────────────
  {
    code: "BOOKS-PRO",
    name: "Books – Professional",
    group: "Books",
    itActBlock: "60% – Books owned by a professional",
    life: 3, rate: 0.60, method: DepreciationMethod.WDV, intangible: false,
    desc: "Books acquired by a professional for the purpose of their profession",
    fields: null,
  },
  // ── 100 % ────────────────────────────────────────────────────────────────
  {
    code: "TMPSTR",
    name: "Temporary Erections",
    group: "Buildings",
    itActBlock: "100% – Purely temporary erections such as wooden structures",
    life: 1, rate: 1.00, method: DepreciationMethod.SLM, intangible: false,
    desc: "Wooden/temporary structures, site offices, prefabricated cabins",
    fields: null,
  },
];

async function clearData() {
  console.log("  Clearing existing asset data…");
  await prisma.auditEntry.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.depreciationRecord.deleteMany();
  await prisma.maintenanceLog.deleteMany();
  await prisma.assetAllocation.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.assetCategory.deleteMany();
  console.log("  Cleared.");
}

async function main() {
  console.log("Seeding…");

  // ── Locations ────────────────────────────────────────────────────────────
  const mumbai = await prisma.location.upsert({
    where: { code: "MUM-HO" },
    update: {},
    create: { code: "MUM-HO", name: "Mumbai Head Office", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  });
  const pune = await prisma.location.upsert({
    where: { code: "PUNE-BR" },
    update: {},
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

  // ── Clear old categories + assets, then seed IT Act categories ───────────
  await clearData();

  const catMap: Record<string, { id: string }> = {};
  for (const c of IT_ACT_CATEGORIES) {
    const cat = await prisma.assetCategory.create({
      data: {
        code: c.code,
        name: c.name,
        group: c.group,
        itActBlock: c.itActBlock,
        usefulLifeCompaniesAct: c.life,
        itActBlockRate: c.rate,
        depreciationMethod: c.method,
        isIntangible: c.intangible,
        assetClassDescription: c.desc,
        customFields: c.fields as never ?? null,
      },
    });
    catMap[c.code] = cat;
  }
  console.log(`  Created ${IT_ACT_CATEGORIES.length} IT Act categories.`);

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

  // ── Sample Assets ─────────────────────────────────────────────────────────
  const assets = [
    {
      assetCode: "FAM-COMP-2024-0001",
      assetTagNumber: "FAM-COMP-2024-0001",
      name: "Dell Laptop Latitude 5520",
      make: "Dell", model: "Latitude 5520", serialNumber: "SN-DL-00330",
      categoryId: catMap["COMP-LAPT"].id,
      purchaseDate: new Date("2024-01-15"),
      purchaseCost: 75000, gstPaid: 13500, residualValue: 3750,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id, currentDepartmentId: itDept.id,
      assignedUserId: employee.id, assignedToType: "USER" as never,
      condition: "NEW", invoiceNumber: "INV-2024-001", supplierId: supplier.id,
      createdByUserId: admin.id,
      customValues: { macAddress: "A4:C3:F0:12:34:56", osVersion: "Windows 11 Pro", processor: "Intel Core i5-11th Gen", ramGb: "16", storageGb: "512" },
    },
    {
      assetCode: "FAM-COMP-2024-0002",
      assetTagNumber: "FAM-COMP-2024-0002",
      name: "HP Server ProLiant DL380",
      make: "HP", model: "ProLiant DL380", serialNumber: "SN-HP-00331",
      categoryId: catMap["COMP-SERV"].id,
      purchaseDate: new Date("2020-06-01"),
      purchaseCost: 350000, gstPaid: 63000, residualValue: 17500,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id, currentDepartmentId: itDept.id,
      assignedToType: "OFFICE" as never,
      condition: "GOOD", createdByUserId: admin.id,
      customValues: { macAddress: "B4:D3:E0:22:45:67", osVersion: "Windows Server 2022", processor: "Intel Xeon Silver 4210", ramGb: "128", storageGb: "4096" },
    },
    {
      assetCode: "FAM-FURN-2024-0001",
      assetTagNumber: "FAM-FURN-2024-0001",
      name: "Executive Office Chair",
      make: "Godrej", model: "Interio Pro",
      categoryId: catMap["FURN"].id,
      purchaseDate: new Date("2023-04-01"),
      purchaseCost: 15000, gstPaid: 2700, residualValue: 750,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id, currentDepartmentId: hrDept.id,
      assignedToType: "OFFICE" as never,
      condition: "GOOD", createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-MCAR-2024-0001",
      assetTagNumber: "FAM-MCAR-2024-0001",
      name: "Toyota Innova Crysta",
      make: "Toyota", model: "Innova Crysta 2.4G", serialNumber: "MH01AB1234",
      categoryId: catMap["MCAR"].id,
      purchaseDate: new Date("2022-06-15"),
      purchaseCost: 2200000, gstPaid: 396000, residualValue: 110000,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id, currentDepartmentId: finDept.id,
      assignedToType: "OFFICE" as never,
      insuranceExpiry: new Date("2025-06-14"), pucExpiry: new Date("2025-03-14"),
      condition: "GOOD", createdByUserId: admin.id,
      customValues: { chassisNo: "MA1AB23456789", engineNo: "2GD78901", registrationNo: "MH01AB1234", fuelType: "Diesel" },
    },
    {
      assetCode: "FAM-PM-2024-0001",
      assetTagNumber: "FAM-PM-2024-0001",
      name: "Canon Photocopier IR2625",
      make: "Canon", model: "IR2625", serialNumber: "CNX12345",
      categoryId: catMap["PM"].id,
      purchaseDate: new Date("2023-09-01"),
      purchaseCost: 85000, gstPaid: 15300, residualValue: 4250,
      status: AssetStatus.ACTIVE,
      currentLocationId: pune.id, currentDepartmentId: pBranch.id,
      assignedToType: "OFFICE" as never,
      warrantyExpiry: new Date("2025-08-31"),
      condition: "NEW", createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-BLDG-COM-2024-0001",
      assetTagNumber: "FAM-BLDG-COM-2024-0001",
      name: "Mumbai Office – Floor 5",
      make: "—",
      categoryId: catMap["BLDG-COM"].id,
      purchaseDate: new Date("2015-01-01"),
      purchaseCost: 12000000, gstPaid: 0, residualValue: 600000,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id, currentDepartmentId: finDept.id,
      assignedToType: "OFFICE" as never,
      condition: "GOOD", createdByUserId: admin.id,
      customValues: { areaSqft: "4500", floorNo: "5", wing: "West Wing" },
    },
  ];

  for (const asset of assets) {
    await prisma.asset.create({ data: asset as never });
  }
  console.log(`  Created ${assets.length} sample assets.`);

  // ── Alert Configs ─────────────────────────────────────────────────────────
  for (const type of ["AMC_EXPIRY", "INSURANCE_EXPIRY", "PUC_EXPIRY", "WARRANTY_EXPIRY", "SCHEDULED_SERVICE"] as const) {
    await prisma.alertConfig.upsert({
      where: { type }, update: {},
      create: { type, daysBeforeAlert: 15, isActive: true, notifyEmails: ["admin@fams.com"] },
    });
  }

  // Company data is added by the user via Settings → Companies & Branches

  console.log("\nSeed complete!");
  console.log(`IT Act categories: ${IT_ACT_CATEGORIES.length}`);
  console.log("Admin:    admin@fams.com / Admin@123");
  console.log("Manager:  manager@fams.com / Admin@123");
  console.log("Employee: employee@fams.com / Admin@123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
