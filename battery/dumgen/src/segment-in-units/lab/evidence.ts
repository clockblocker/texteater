/**
 * The committed evidence of one run, under `<evidence>/runs/<runId>/`:
 * `manifest.json`, `diff.patch` when the tree was dirty, `summary.json`,
 * and for a noise rerun `noise.json`. Its per-unit outcomes are raw
 * output and stay local, at `<lab>/outcomes/<runId>.jsonl.gz`.
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { NoiseFloor } from "./noise.js";
import { decodeOutcomes, encodeOutcomes, type OutcomeRow } from "./outcomes.js";
import type { RunManifest } from "./provenance.js";

export const runDirectory = (evidenceRoot: string, runId: string) =>
	join(evidenceRoot, "runs", runId);

const json = (value: unknown) => `${JSON.stringify(value, null, "\t")}\n`;

export async function writeManifest(
	evidenceRoot: string,
	manifest: RunManifest,
	patch: string,
): Promise<void> {
	const directory = runDirectory(evidenceRoot, manifest.runId);
	await mkdir(directory, { recursive: true });
	await writeFile(join(directory, "manifest.json"), json(manifest));
	if (patch) await writeFile(join(directory, "diff.patch"), patch);
}

export async function readManifest(
	evidenceRoot: string,
	runId: string,
): Promise<RunManifest | undefined> {
	const path = join(runDirectory(evidenceRoot, runId), "manifest.json");
	if (!existsSync(path)) return undefined;
	return JSON.parse(await readFile(path, "utf8")) as RunManifest;
}

/** Every run with a manifest, oldest first. */
export async function readManifests(
	evidenceRoot: string,
): Promise<RunManifest[]> {
	const root = join(evidenceRoot, "runs");
	if (!existsSync(root)) return [];
	const manifests: RunManifest[] = [];
	for (const runId of await readdir(root)) {
		const manifest = await readManifest(evidenceRoot, runId);
		if (manifest) manifests.push(manifest);
	}
	return manifests.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

const outcomesPath = (labRoot: string, runId: string) =>
	join(labRoot, "outcomes", `${runId}.jsonl.gz`);

export async function writeOutcomes(
	labRoot: string,
	runId: string,
	rows: readonly OutcomeRow[],
): Promise<void> {
	await mkdir(join(labRoot, "outcomes"), { recursive: true });
	await writeFile(outcomesPath(labRoot, runId), encodeOutcomes(rows));
}

export async function readOutcomes(
	labRoot: string,
	runId: string,
): Promise<OutcomeRow[] | undefined> {
	const path = outcomesPath(labRoot, runId);
	if (!existsSync(path)) return undefined;
	return decodeOutcomes(await readFile(path));
}

export type NoiseRecord = {
	readonly baseline: string;
	readonly rerun: string;
	/** Whether every stage sent the baseline's prompts; a mismatch means the rerun measured a changed configuration. */
	readonly promptsMatch: boolean;
	readonly floors: Readonly<Record<string, NoiseFloor>>;
};

export async function writeNoise(
	evidenceRoot: string,
	record: NoiseRecord,
): Promise<void> {
	await writeFile(
		join(runDirectory(evidenceRoot, record.rerun), "noise.json"),
		json(record),
	);
}

export async function readNoise(
	evidenceRoot: string,
	runId: string,
): Promise<NoiseRecord | undefined> {
	const path = join(runDirectory(evidenceRoot, runId), "noise.json");
	if (!existsSync(path)) return undefined;
	return JSON.parse(await readFile(path, "utf8")) as NoiseRecord;
}

/** The summary a report writes; `variant` names a `--subset` or `--relabel` reading. */
export const summaryPath = (
	evidenceRoot: string,
	runId: string,
	variant = "",
) =>
	join(
		runDirectory(evidenceRoot, runId),
		`summary${variant ? `--${variant}` : ""}.json`,
	);

export async function writeSummary(
	path: string,
	summary: unknown,
): Promise<void> {
	await writeFile(path, json(summary));
}

export async function readSummary<T>(path: string): Promise<T | undefined> {
	if (!existsSync(path)) return undefined;
	return JSON.parse(await readFile(path, "utf8")) as T;
}
