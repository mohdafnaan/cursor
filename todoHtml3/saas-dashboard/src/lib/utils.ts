// Utility helpers shared across the app.
// This file intentionally stays very small and focused so it can be reused everywhere.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// cn = "class names" helper
// WHAT: Merges Tailwind and conditional class names safely.
// WHY: Prevents conflicting Tailwind classes and keeps JSX cleaner.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

