import { DepreciationMethod } from "@prisma/client";

export interface DepreciationInput {
  purchaseCost: number;
  residualValue: number;
  purchaseDate: Date;
  usefulLifeCompaniesAct: number;
  itActRate: number;
  depreciationMethod: DepreciationMethod;
  financialYear: string; // e.g. "2024-25"
  openingWDV?: number;
}

export interface DepreciationResult {
  financialYear: string;
  openingWDV: number;
  putToUseDays: number;
  halfYearRule: boolean;
  companiesActDepreciation: number;
  companiesActClosingWDV: number;
  itActDepreciation: number;
  itActClosingWDV: number;
}

function getFYDates(fy: string): { start: Date; end: Date } {
  const [startYear] = fy.split("-").map(Number);
  return {
    start: new Date(startYear, 3, 1), // April 1
    end: new Date(startYear + 1, 2, 31), // March 31
  };
}

function getDaysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateDepreciation(input: DepreciationInput): DepreciationResult {
  const { purchaseCost, residualValue, purchaseDate, usefulLifeCompaniesAct, itActRate: itActBlockRate, financialYear } = input;
  const fy = getFYDates(financialYear);
  const openingWDV = input.openingWDV ?? purchaseCost;

  const assetStartInFY = purchaseDate > fy.start ? purchaseDate : fy.start;
  const putToUseDays = Math.max(0, getDaysBetween(assetStartInFY, fy.end) + 1);
  const fyDays = getDaysBetween(fy.start, fy.end) + 1;
  const halfYearRule = putToUseDays < fyDays / 2;

  // Companies Act WDV — rate derived from useful life: r = 1 - (SV/OC)^(1/n)
  // Minimum scrap of 5% of cost prevents rate from approaching 100%
  const safeResidual = Math.max(residualValue, purchaseCost * 0.05);
  const caWDVRate = 1 - Math.pow(safeResidual / purchaseCost, 1 / usefulLifeCompaniesAct);
  const rawCA = openingWDV * caWDVRate * (putToUseDays / fyDays);
  const companiesActDepreciation = Math.max(0, Math.min(rawCA, openingWDV - residualValue));
  const companiesActClosingWDV = openingWDV - companiesActDepreciation;

  // IT Act WDV with 180-day rule
  const effectiveRate = halfYearRule ? itActBlockRate / 2 : itActBlockRate;
  const itActDepreciation = openingWDV * effectiveRate;
  const itActClosingWDV = openingWDV - itActDepreciation;

  return {
    financialYear,
    openingWDV,
    putToUseDays,
    halfYearRule,
    companiesActDepreciation: Math.round(companiesActDepreciation * 100) / 100,
    companiesActClosingWDV: Math.round(companiesActClosingWDV * 100) / 100,
    itActDepreciation: Math.round(itActDepreciation * 100) / 100,
    itActClosingWDV: Math.round(itActClosingWDV * 100) / 100,
  };
}

export function getNextFY(fy: string): string {
  const [startYear] = fy.split("-").map(Number);
  const next = startYear + 1;
  return `${next}-${String(next + 1).slice(2)}`;
}

export function getPreviousFY(fy: string): string {
  const [startYear] = fy.split("-").map(Number);
  const prev = startYear - 1;
  return `${prev}-${String(prev + 1).slice(2)}`;
}

export function getAssetFirstFY(purchaseDate: Date): string {
  const year = purchaseDate.getFullYear();
  const month = purchaseDate.getMonth(); // 0-indexed; April = 3
  if (month >= 3) return `${year}-${String(year + 1).slice(2)}`;
  return `${year - 1}-${String(year).slice(2)}`;
}

export function compareFY(fy1: string, fy2: string): number {
  const [y1] = fy1.split("-").map(Number);
  const [y2] = fy2.split("-").map(Number);
  return y1 - y2;
}

export function getCurrentIndianFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(2)}`;
  }
  return `${year - 1}-${String(year).slice(2)}`;
}

export function getIndianFYList(startYear = 2015): string[] {
  const currentFY = getCurrentIndianFY();
  const [endYear] = currentFY.split("-").map(Number);
  const years: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(`${y}-${String(y + 1).slice(2)}`);
  }
  return years;
}
