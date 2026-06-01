import { DepreciationMethod } from "@prisma/client";

export interface DepreciationInput {
  purchaseCost: number;
  residualValue: number;
  purchaseDate: Date;
  usefulLifeCompaniesAct: number;
  itActBlockRate: number;
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
  const { purchaseCost, residualValue, purchaseDate, usefulLifeCompaniesAct, itActBlockRate, financialYear } = input;
  const fy = getFYDates(financialYear);
  const openingWDV = input.openingWDV ?? purchaseCost;

  const assetStartInFY = purchaseDate > fy.start ? purchaseDate : fy.start;
  const putToUseDays = Math.max(0, getDaysBetween(assetStartInFY, fy.end) + 1);
  const fyDays = getDaysBetween(fy.start, fy.end) + 1;
  const halfYearRule = putToUseDays < fyDays / 2;

  // Companies Act SLM
  const annualSLM = (purchaseCost - residualValue) / usefulLifeCompaniesAct;
  const proRataSLM = (annualSLM * putToUseDays) / fyDays;
  const companiesActDepreciation = Math.min(proRataSLM, openingWDV - residualValue);
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
