import { PrismaClient, Role, AssetStatus, DepreciationMethod } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? process.env.DATABASE_PUBLIC_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding...");

  // Locations
  const mumbai = await prisma.location.upsert({
    where: { code: "MUM-HO" },
    update: {},
    create: { code: "MUM-HO", name: "Mumbai HO", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
  });
  const pune = await prisma.location.upsert({
    where: { code: "PUNE-BR" },
    update: {},
    create: { code: "PUNE-BR", name: "Pune Branch", city: "Pune", state: "Maharashtra", pincode: "411001" },
  });
  const delhi = await prisma.location.upsert({
    where: { code: "DEL-BR" },
    update: {},
    create: { code: "DEL-BR", name: "Delhi Branch", city: "Delhi", state: "Delhi", pincode: "110001" },
  });

  // Departments
  const itDept = await prisma.department.upsert({
    where: { code: "IT" },
    update: {},
    create: { code: "IT", name: "Information Technology", locationId: mumbai.id },
  });
  const hrDept = await prisma.department.upsert({
    where: { code: "HR" },
    update: {},
    create: { code: "HR", name: "Human Resources", locationId: mumbai.id },
  });
  const finDept = await prisma.department.upsert({
    where: { code: "FIN" },
    update: {},
    create: { code: "FIN", name: "Finance & Accounts", locationId: mumbai.id },
  });
  const pBranch = await prisma.department.upsert({
    where: { code: "PUNE-OPS" },
    update: {},
    create: { code: "PUNE-OPS", name: "Pune Operations", locationId: pune.id },
  });

  // Asset Categories
  const laptopCat = await prisma.assetCategory.upsert({
    where: { code: "IT" },
    update: {},
    create: {
      code: "IT",
      name: "Laptops & Computers",
      usefulLifeCompaniesAct: 3,
      itActBlockRate: 0.40,
      depreciationMethod: DepreciationMethod.WDV,
      assetClassDescription: "Computers & Peripherals",
    },
  });
  const furnitureCat = await prisma.assetCategory.upsert({
    where: { code: "FURN" },
    update: {},
    create: {
      code: "FURN",
      name: "Furniture & Fixtures",
      usefulLifeCompaniesAct: 10,
      itActBlockRate: 0.10,
      depreciationMethod: DepreciationMethod.SLM,
      assetClassDescription: "Furniture",
    },
  });
  const vehicleCat = await prisma.assetCategory.upsert({
    where: { code: "VEH" },
    update: {},
    create: {
      code: "VEH",
      name: "Vehicles",
      usefulLifeCompaniesAct: 8,
      itActBlockRate: 0.15,
      depreciationMethod: DepreciationMethod.WDV,
      assetClassDescription: "Motor Vehicles",
    },
  });
  const officeCat = await prisma.assetCategory.upsert({
    where: { code: "OFF" },
    update: {},
    create: {
      code: "OFF",
      name: "Office Equipment",
      usefulLifeCompaniesAct: 5,
      itActBlockRate: 0.15,
      depreciationMethod: DepreciationMethod.SLM,
      assetClassDescription: "Office Equipment",
    },
  });

  // Users
  const adminPassword = await bcrypt.hash("Admin@123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fams.com" },
    update: {},
    create: {
      email: "admin@fams.com",
      name: "System Admin",
      password: adminPassword,
      role: Role.SUPER_ADMIN,
    },
  });

  const branchMgr = await prisma.user.upsert({
    where: { email: "manager@fams.com" },
    update: {},
    create: {
      email: "manager@fams.com",
      name: "Rajesh Kumar",
      password: adminPassword,
      role: Role.BRANCH_MANAGER,
      locationId: mumbai.id,
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@fams.com" },
    update: {},
    create: {
      email: "employee@fams.com",
      name: "Priya Sharma",
      password: adminPassword,
      role: Role.EMPLOYEE,
      locationId: mumbai.id,
      departmentId: itDept.id,
    },
  });

  // Supplier
  const supplier = await prisma.supplier.upsert({
    where: { code: "S0001" },
    update: {},
    create: {
      code: "S0001",
      name: "Comtel Infosystems Pvt. Ltd",
      address1: "Office No 201, 2nd Floor, Jet Prime",
      city: "Mumbai",
      state: "Maharashtra",
      contactPerson: "Rahul Mehta",
      email: "sales@comtel.in",
    },
  });

  // Sample Assets
  const assets = [
    {
      assetCode: "FAM-IT-2024-0001",
      assetTagNumber: "FAM-IT-2024-0001",
      name: "Dell Laptop Latitude 5520",
      make: "Dell",
      model: "Latitude 5520",
      serialNumber: "00330-53083-77432-AAOEM",
      categoryId: laptopCat.id,
      purchaseDate: new Date("2024-01-15"),
      purchaseCost: 75000,
      gstPaid: 13500,
      residualValue: 3750,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id,
      currentDepartmentId: itDept.id,
      assignedUserId: employee.id,
      ipConfiguration: "192.168.2.158",
      condition: "NEW",
      invoiceNumber: "INV-2024-001",
      supplierId: supplier.id,
      createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-IT-2024-0002",
      assetTagNumber: "FAM-IT-2024-0002",
      name: "HP Server ProLiant DL380",
      make: "HP",
      model: "ProLiant DL380",
      serialNumber: "00331-10000-00001-AA794",
      categoryId: laptopCat.id,
      purchaseDate: new Date("2020-01-01"),
      purchaseCost: 350000,
      gstPaid: 63000,
      residualValue: 17500,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id,
      currentDepartmentId: itDept.id,
      ipConfiguration: "192.168.2.224",
      serverModel: "CPU",
      condition: "WORKING &NEW",
      createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-FURN-2024-0001",
      assetTagNumber: "FAM-FURN-2024-0001",
      name: "Executive Office Chair",
      make: "Godrej",
      model: "Interio Pro",
      categoryId: furnitureCat.id,
      purchaseDate: new Date("2023-04-01"),
      purchaseCost: 15000,
      gstPaid: 2700,
      residualValue: 750,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id,
      currentDepartmentId: hrDept.id,
      condition: "GOOD",
      createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-VEH-2024-0001",
      assetTagNumber: "FAM-VEH-2024-0001",
      name: "Toyota Innova Crysta",
      make: "Toyota",
      model: "Innova Crysta 2.4G",
      serialNumber: "MH01AB1234",
      categoryId: vehicleCat.id,
      purchaseDate: new Date("2022-06-15"),
      purchaseCost: 2200000,
      gstPaid: 396000,
      residualValue: 110000,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id,
      currentDepartmentId: finDept.id,
      insuranceExpiry: new Date("2025-06-14"),
      pucExpiry: new Date("2025-03-14"),
      condition: "GOOD",
      createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-OFF-2024-0001",
      assetTagNumber: "FAM-OFF-2024-0001",
      name: "Canon Copier IR2625",
      make: "Canon",
      model: "IR2625",
      serialNumber: "CNX12345",
      categoryId: officeCat.id,
      purchaseDate: new Date("2023-09-01"),
      purchaseCost: 85000,
      gstPaid: 15300,
      residualValue: 4250,
      status: AssetStatus.ACTIVE,
      currentLocationId: pune.id,
      currentDepartmentId: pBranch.id,
      warrantyExpiry: new Date("2025-08-31"),
      condition: "NEW",
      createdByUserId: admin.id,
    },
    {
      assetCode: "FAM-IT-2024-0003",
      assetTagNumber: "FAM-IT-2024-0003",
      name: "Dell Monitor 24 Inch",
      make: "Dell",
      model: "P2422H",
      serialNumber: "ET86R028180Q",
      categoryId: laptopCat.id,
      purchaseDate: new Date("2024-12-31"),
      purchaseCost: 18000,
      gstPaid: 3240,
      residualValue: 900,
      status: AssetStatus.ACTIVE,
      currentLocationId: mumbai.id,
      currentDepartmentId: itDept.id,
      condition: "NEW",
      createdByUserId: admin.id,
    },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { assetCode: asset.assetCode },
      update: {},
      create: asset as never,
    });
  }

  // Alert Configs
  const alertTypes = ["AMC_EXPIRY", "INSURANCE_EXPIRY", "PUC_EXPIRY", "WARRANTY_EXPIRY", "SCHEDULED_SERVICE"] as const;
  for (const type of alertTypes) {
    await prisma.alertConfig.upsert({
      where: { type },
      update: {},
      create: { type, daysBeforeAlert: 15, isActive: true, notifyEmails: ["admin@fams.com"] },
    });
  }

  // Company
  await prisma.company.upsert({
    where: { code: "EAPL" },
    update: {},
    create: {
      code: "EAPL",
      name: "Evermore Advisors Pvt. Ltd.",
      address1: "A/104, Krishna Bldg, Vasant Sagar, Thakur Village",
      address2: "Kandivali(E), Mumbai-400101",
      email: "admin@evermore.in",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400101",
      phoneNo: "022-28844545",
    },
  });

  console.log("Seed complete!");
  console.log("Admin: admin@fams.com / Admin@123");
  console.log("Manager: manager@fams.com / Admin@123");
  console.log("Employee: employee@fams.com / Admin@123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
