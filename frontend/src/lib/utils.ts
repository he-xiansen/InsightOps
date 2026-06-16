import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 将 UTC ISO 时间戳转为北京时间 (UTC+8) 显示字符串 */
export function toBeijingTime(iso: string | null | undefined): string {
  if (!iso) return "从未登录";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return String(iso);
  const bj = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${bj.getUTCFullYear()}-${pad(bj.getUTCMonth() + 1)}-${pad(bj.getUTCDate())} ${pad(bj.getUTCHours())}:${pad(bj.getUTCMinutes())}:${pad(bj.getUTCSeconds())}`;
}