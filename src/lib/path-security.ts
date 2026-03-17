/**
 * Shared path security utilities for API routes.
 * Centralizes allowed root paths and path validation.
 */

import { resolve } from "path";
import { homedir } from "os";
import { realpathSync } from "fs";

/** Allowed root paths for filesystem access */
export const ALLOWED_ROOTS = [
  homedir(),
  "C:\\",
  "D:\\",
  "E:\\",
  "F:\\",
  "/home",
  "/Users",
  "/mnt",
  "/opt",
];

/** Check if a path is within allowed roots (follows symlinks) */
export function isPathAllowed(targetPath: string): boolean {
  try {
    const real = realpathSync(targetPath);
    return ALLOWED_ROOTS.some((root) => real.startsWith(resolve(root)));
  } catch {
    // If realpathSync fails (path doesn't exist), try resolve
    const normalized = resolve(targetPath);
    return ALLOWED_ROOTS.some((root) => normalized.startsWith(resolve(root)));
  }
}
