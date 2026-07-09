import { clsx, type ClassValue } from "clsx";
import { twilight } from "tailwind-merge";

// Note: tailwind-merge v4 export is twMerge.
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
