import 'server-only';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { SEED_PRODUCTS, SEED_INVENTORY, SEED_SETTINGS } from '@/lib/catalog';
import type { AdminData } from '@/lib/types';
const dir = path.join(process.cwd(), '.data');
const file = path.join(dir, 'demo-store.json');
const globalState = globalThis as typeof globalThis & { moodlyDemoQueue?: Promise<unknown> };
const initial = (): AdminData => structuredClone({ products: SEED_PRODUCTS, inventory: SEED_INVENTORY, settings: SEED_SETTINGS, orders: [], demo: true });
async function read(): Promise<AdminData> {
  try { return JSON.parse(await readFile(file, 'utf8')) as AdminData; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return initial();
  }
}
export async function readDemo(): Promise<AdminData> { await globalState.moodlyDemoQueue; return read(); }
export function demoTransaction<T>(work: (data: AdminData) => T | Promise<T>): Promise<T> {
  const operation = (globalState.moodlyDemoQueue ?? Promise.resolve()).then(async () => {
    const data = await read();
    const result = await work(data);
    await mkdir(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2));
    await rename(tmp, file);
    return result;
  });
  globalState.moodlyDemoQueue = operation.catch(() => undefined);
  return operation;
}
