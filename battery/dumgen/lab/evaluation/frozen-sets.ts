/**
 * Frozen evaluation sets tracked in git, kept the way the segment.inUnits
 * lab keeps its own (`lab/segmentation/harness/corpus.ts`): every set ever
 * frozen, gzipped under its hash as `<name>@<hash>.json.gz`, and
 * `current.json`, which names each set's current hash. A refreeze adds its
 * sets beside the ones it replaces, so a run is always scored against the
 * set it ran on. resolve.grammar, resolve.reading and knowledge.produce
 * keep theirs under `evidence/<port>/sets/`.
 */
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { canonicalJson } from "common-utils";
import { z } from "zod";
import { parseStoredJson, readStoredJsonSync } from "../stored-json.js";

/** What every frozen set carries: its name and the hash of its cases. */
export type FrozenSet = { readonly name: string; readonly hash: string };

/** Where the set `name` of `hash` is kept. */
const frozenSetPath = (root: string, name: string, hash: string) =>
	join(root, `${name}@${hash}.json.gz`);

const currentPath = (root: string) => join(root, "current.json");

const readCurrent = (root: string): Record<string, string> =>
	existsSync(currentPath(root))
		? readStoredJsonSync(
				z.record(z.string(), z.string()),
				currentPath(root),
			)
		: {};

/** The hash of the current set `name`; undefined before its first freeze. */
const currentFrozenHash = (root: string, name: string): string | undefined =>
	readCurrent(root)[name];

/** Whether the current set `name` is kept under `root`. */
export function isFrozen(root: string, name: string): boolean {
	const hash = currentFrozenHash(root, name);
	return hash !== undefined && existsSync(frozenSetPath(root, name, hash));
}

const parse = <T>(schema: z.ZodType<T>, gzipped: Uint8Array, path: string) =>
	parseStoredJson(schema, gunzipSync(gzipped).toString("utf8"), path);

const sizedSchema = z.object({ cases: z.array(z.unknown()) });

/** The number of cases in the current set `name`; 0 before its first freeze. */
export function frozenSetSize(root: string, name: string): number {
	const hash = currentFrozenHash(root, name);
	if (hash === undefined) return 0;
	const path = frozenSetPath(root, name, hash);
	return existsSync(path)
		? parse(sizedSchema, readFileSync(path), path).cases.length
		: 0;
}

/**
 * Keeps `set` under its hash and makes it the current set of its name. A
 * set of a hash already kept stays as first frozen.
 */
export async function storeFrozenSet(
	root: string,
	set: FrozenSet,
): Promise<void> {
	await mkdir(root, { recursive: true });
	const path = frozenSetPath(root, set.name, set.hash);
	if (!existsSync(path)) await writeFile(path, gzipSync(canonicalJson(set)));
	await writeFile(
		currentPath(root),
		`${JSON.stringify({ ...readCurrent(root), [set.name]: set.hash }, null, "\t")}\n`,
	);
}

/**
 * The frozen set `name`, checked by `schema`: the current one, or with
 * `hash` the set of that hash, current or replaced. `freeze` names the
 * command that freezes it.
 */
export async function loadFrozenSet<T extends FrozenSet>(
	root: string,
	name: string,
	hash: string | undefined,
	freeze: string,
	schema: z.ZodType<T>,
): Promise<T> {
	const current = currentFrozenHash(root, name);
	const wanted = hash ?? current;
	if (wanted === undefined)
		throw Error(`The ${name} set is not frozen; run \`${freeze}\` first`);
	const path = frozenSetPath(root, name, wanted);
	if (!existsSync(path))
		throw Error(
			`${name}@${wanted} is neither the frozen ${name}@${current} nor kept at ${path}`,
		);
	return parse(schema, await readFile(path), path);
}
