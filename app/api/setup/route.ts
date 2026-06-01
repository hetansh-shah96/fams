import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { Role, AssetStatus, DepreciationMethod } from "@prisma/client";

const SETUP_SECRET = process.env.SETUP_SECRET ?? "fams-setup-2024";

export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminExists = await prisma.user.findUnique({ where: { email: "admin@fams.com" } });
  if (adminExists) {
    return NextResponse.json({ message: "Already seeded", users: ["admin@fams.com", "manager@fams.com", "employee@fams.com"] });
  }

  const password = await bcrypt.hash("Admin@123", 12);

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

  const laptopCat = await prisma.assetCategory.upsert({
    where: { code: "IT" },
    update: {},
    create: { code: "IT", name: "Laptops & Computers", usefulLifeCompaniesAct: 3, itActBlockRate: 0.40, depreciationMethod: DepreciationMethod.WDV, assetClassDescription: "Computers & Peripherals" },
  });
  const furnitureCat = await prisma.assetCategory.upsert({
    where: { code: "FURN" },
    update: {},
    create: { code: "FURN", name: "Furniture & Fixtures", usefulLifeCompaniesAct: 10, itActBlockRate: 0.10, depreciationMethod: DepreciationMethod.SLM },
  });
  const vehicleCat = await prisma.assetCategory.upsert({
    where: { code: "VEH" },
    update: {},
    create: { code: "VEH", name: "Vehicles", usefulLifeCompaniesAct: 8, itActBlockRate: 0.15, depreciationMethod: DepreciationMethod.WDV },
  });
  const officeCat = await prisma.assetCategory.upsert({
    where: { code: "OFF" },
    update: {},
    create: { code: "OFF", name: "Office Equipment", usefulLifeCompaniesAct: 5, itActBlockRate: 0.15, depreciationMethod: DepreciationMethod.SLM },
  });

  const admin = await prisma.user.create({
    data: { email: "admin@fams.com", name: "System Admin", password, role: Role.SUPER_ADMIN },
  });
  await prisma.user.create({
    data: { email: "manager@fams.com", name: "Rajesh Kumar", password, role: Role.BRANCH_MANAGER, locationId: mumbai.id },
  });
  const employee = await prisma.user.create({
    data: { email: "employee@fams.com", name: "Priya Sharma", password, role: Role.EMPLOYEE, locationId: mumbai.id, departmentId: itDept.id },
  });

  const assets = [
    { assetCode: "FAM-IT-2024-0001", assetTagNumber: "FAM-IT-2024-0001", name: "Dell Laptop Latitude 5520", make: "Dell", model: "Latitude 5520", serialNumber: "SN-DELL-001", categoryId: laptopCat.id, purchaseDate: new Date("2024-01-15"), purchaseCost: 75000, gstPaid: 13500, residualValue: 3750, status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: itDept.id, assignedUserId: employee.id, condition: "NEW", createdByUserId: admin.id },
    { assetCode: "FAM-IT-2024-0002", assetTagNumber: "FAM-IT-2024-0002", name: "HP Server ProLiant", make: "HP", model: "ProLiant DL380", serialNumber: "SN-HP-001", categoryId: laptopCat.id, purchaseDate: new Date("2020-01-01"), purchaseCost: 350000, gstPaid: 63000, residualValue: 17500, status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: itDept.id, condition: "WORKING &NEW", createdByUserId: admin.id },
    { assetCode: "FAM-FURN-2024-0001", assetTagNumber: "FAM-FURN-2024-0001", name: "Executive Office Chair", make: "Godrej", model: "Interio Pro", categoryId: furnitureCat.id, purchaseDate: new Date("2023-04-01"), purchaseCost: 15000, gstPaid: 2700, residualValue: 750, status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: hrDept.id, condition: "GOOD", createdByUserId: admin.id },
    { assetCode: "FAM-VEH-2024-0001", assetTagNumber: "FAM-VEH-2024-0001", name: "Toyota Innova Crysta", make: "Toyota", model: "Innova Crysta 2.4G", serialNumber: "MH01AB1234", categoryId: vehicleCat.id, purchaseDate: new Date("2022-06-15"), purchaseCost: 2200000, gstPaid: 396000, residualValue: 110000, status: AssetStatus.ACTIVE, currentLocationId: mumbai.id, currentDepartmentId: finDept.id, insuranceExpiry: new Date("2025-06-14"), condition: "GOOD", createdByUserId: admin.id },
    { assetCode: "FAM-OFF-2024-0001", assetTagNumber: "FAM-OFF-2024-0001", name: "Canon Copier IR2625", make: "Canon", model: "IR2625", categoryId: officeCat.id, purchaseDate: new Date("2023-09-01"), purchaseCost: 85000, gstPaid: 15300, residualValue: 4250, status: AssetStatus.ACTIVE, currentLocationId: pune.id, currentDepartmentId: pBranch.id, warrantyExpiry: new Date("2025-08-31"), condition: "NEW", createdByUserId: admin.id },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { assetCode: asset.assetCode },
      update: {},
      create: asset as never,
    });
  }

  const alertTypes = ["AMC_EXPIRY", "INSURANCE_EXPIRY", "PUC_EXPIRY", "WARRANTY_EXPIRY", "SCHEDULED_SERVICE"] as const;
  for (const type of alertTypes) {
    await prisma.alertConfig.upsert({
      where: { type },
      update: {},
      create: { type, daysBeforeAlert: 15, isActive: true, notifyEmails: ["admin@fams.com"] },
    });
  }

  return NextResponse.json({
    message: "Seed complete",
    users: ["admin@fams.com / Admin@123", "manager@fams.com / Admin@123", "employee@fams.com / Admin@123"],
  });
}

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const assetCount = await prisma.asset.count();
    return NextResponse.json({ db: "connected", users: userCount, assets: assetCount });
  } catch (err) {
    return NextResponse.json({ db: "error", error: String(err) }, { status: 500 });
  }
}
