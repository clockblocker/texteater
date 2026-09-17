import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredRun } from "./evaluation.js";
import { runManifestSchema, storedRunSchema } from "./schemas.js";

/** Creates a new run directory; existing evidence is never overwritten. */
export async function saveRun(
	outputDirectory: string,
	run: StoredRun,
): Promise<string> {
	const parsed = storedRunSchema.parse(run);
	await mkdir(outputDirectory, { recursive: true });
	const directory = join(outputDirectory, parsed.manifest.runId);
	await mkdir(directory);
	await writeFile(
		join(directory, "manifest.json"),
		`${JSON.stringify(parsed.manifest, null, 2)}\n`,
	);
	await writeFile(
		join(directory, "cases.jsonl"),
		`${parsed.cases.map((value) => JSON.stringify(value)).join("\n")}\n`,
	);
	await writeFile(
		join(directory, "summary.json"),
		`${JSON.stringify(parsed.summary, null, 2)}\n`,
	);
	return directory;
}
export async function loadRun(
	outputDirectory: string,
	runId: string,
): Promise<StoredRun> {
	runManifestSchema.shape.runId.parse(runId);
	const directory = join(outputDirectory, runId);
	const [manifest, cases, summary] = await Promise.all([
		readFile(join(directory, "manifest.json"), "utf8"),
		readFile(join(directory, "cases.jsonl"), "utf8"),
		readFile(join(directory, "summary.json"), "utf8"),
	]);
	const parsed = storedRunSchema.parse({
		manifest: JSON.parse(manifest),
		cases: cases
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => JSON.parse(line)),
		summary: JSON.parse(summary),
	});
	if (
		parsed.manifest.runId !== runId ||
		parsed.manifest.corpus.caseIds.length !== parsed.cases.length ||
		parsed.cases.some(
			(record, index) =>
				record.caseId !== parsed.manifest.corpus.caseIds[index],
		)
	)
		throw Error("Run records do not match their manifest");
	const succeeded = parsed.cases.filter(
		(record) => record.status === "Success",
	).length;
	const interrupted = parsed.cases.filter(
		(record) => record.status === "Interrupted",
	).length;
	const failed = parsed.cases.length - succeeded - interrupted;
	if (
		parsed.summary.total !== parsed.cases.length ||
		parsed.summary.succeeded !== succeeded ||
		parsed.summary.interrupted !== interrupted ||
		parsed.summary.failed !== failed ||
		parsed.summary.status !==
			(interrupted ? "Interrupted" : failed ? "Failed" : "Completed")
	)
		throw Error("Run summary does not match its cases");
	return parsed;
}

/** Lists only complete, validated runs; malformed records remain visible as errors. */
export async function listRuns(outputDirectory: string) {
	const { readdir } = await import("node:fs/promises");
	let entries: import("node:fs").Dirent[];
	try {
		entries = await readdir(outputDirectory, { withFileTypes: true });
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
	return Promise.all(
		entries
			.filter((entry) => entry.isDirectory())
			.map(async (entry) => {
				try {
					const run = await loadRun(outputDirectory, entry.name);
					return {
						runId: entry.name,
						manifest: run.manifest,
						summary: run.summary,
					};
				} catch (error) {
					return {
						runId: entry.name,
						error:
							error instanceof Error
								? error.message
								: String(error),
					};
				}
			}),
	);
}
export function compareRuns(left: StoredRun, right: StoredRun) {
	const a = storedRunSchema.parse(left),
		b = storedRunSchema.parse(right);
	const bCases = new Map(b.cases.map((record) => [record.caseId, record]));
	const ids = [
		...a.cases.map((record) => record.caseId),
		...b.cases
			.filter(
				(record) => !a.manifest.corpus.caseIds.includes(record.caseId),
			)
			.map((record) => record.caseId),
	];
	const aCases = new Map(a.cases.map((record) => [record.caseId, record]));
	return {
		left: a.manifest,
		right: b.manifest,
		sameExperiment: a.manifest.experimentId === b.manifest.experimentId,
		sameCorpus:
			a.manifest.corpus.fingerprint === b.manifest.corpus.fingerprint,
		cases: ids.map((caseId) => ({
			caseId,
			left: aCases.get(caseId) ?? null,
			right: bCases.get(caseId) ?? null,
		})),
	};
}
