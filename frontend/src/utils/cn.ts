/**
 * src/utils/cn.ts  — className merger utility.
 * Combines clsx + tailwind-merge to avoid class conflicts.
 */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
