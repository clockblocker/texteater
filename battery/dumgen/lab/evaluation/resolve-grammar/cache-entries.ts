/**
 * One entry of an evaluation's disk cache (`models.ts`): a cached answer
 * or a batch's journal, read back checked and written whole.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { z } from "zod";
import { storedAs } from "../../stored-json.js";

/**
 * The cache entry at `path`, checked by `schema`; undefined when it is
 * missing or not JSON, a write cut short. An entry of another shape throws.
 */
export async function readEntry<T>(
	schema: z.ZodType<T>,
	path: string,
): Promise<T | undefined> {
	let value: unknown;
	try {
		value = JSON.parse(await readFile(path, "utf8"));
	} catch {
		return undefined;
	}
	return storedAs(schema, value, path);
}

export async function writeEntry(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(value));
}
