import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { cauveryWingRanges } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`;
}

export function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function deriveCauveryWing(roomNo: string): string {
  const num = parseInt(roomNo.trim(), 10);
  if (isNaN(num)) return "General";
  for (const [min, max] of cauveryWingRanges) {
    if (num >= min && num <= max) {
      return `${min}-${max}`;
    }
  }
  return "General";
}

export function deriveWingFromRoom(roomNo: string, hostel?: string) {
  if (hostel === "Cauvery") {
    return deriveCauveryWing(roomNo);
  }

  const normalized = roomNo.trim().toUpperCase();

  if (!normalized) {
    return "General";
  }

  const alphaPrefix = normalized.match(/^[A-Z]+/)?.[0];
  if (alphaPrefix) {
    return alphaPrefix;
  }

  const alphaSuffix = normalized.match(/[A-Z]+$/)?.[0];
  if (alphaSuffix) {
    return alphaSuffix;
  }

  const digits = normalized.match(/\d+/)?.[0];
  if (digits) {
    return digits[0];
  }

  return "General";
}

export function formatWingLabel(wing: string) {
  return wing === "General" ? "General" : `Wing ${wing}`;
}

export function normalizeDepartmentCode(value: string) {
  const normalized = value.trim().toUpperCase();
  return normalized || "GENERAL";
}

export function formatDepartmentLabel(department: string) {
  return department === "GENERAL" ? "General" : department;
}

export function deriveYearFromRoll(rollNo: string) {
  const normalized = rollNo.trim().toUpperCase();
  const match = normalized.match(/^[A-Z]+(\d{2})/);

  if (!match) {
    return "Unknown";
  }

  const year = Number(match[1]);
  return String(year >= 90 ? 1900 + year : 2000 + year);
}
