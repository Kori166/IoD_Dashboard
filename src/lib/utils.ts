// Code Sources and Provenance:
// - npm (2024) clsx. [online] Available from: https://www.npmjs.com/package/clsx
// - Tailwind CSS (2025) Documentation. [online] Available from: https://v2.tailwindcss.com/docs

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
