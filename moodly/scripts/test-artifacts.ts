import { rm } from 'node:fs/promises';
import path from 'node:path';

/** Delete only local URLs returned by uploads created by the current test run. */
export async function cleanupTestUploads(urls: string[]) {
  for (const url of urls) {
    if (!/^\/images\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(url)) continue;
    await rm(path.join(process.cwd(), '.data', 'uploads', path.basename(url)), { force: true });
  }
}
