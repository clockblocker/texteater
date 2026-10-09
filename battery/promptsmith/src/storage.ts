import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { diffJson, type JsonChange } from "./json-diff.js";
import type { OperationEvaluationRun } from "./operation-evaluation.js";
import { summarizeQuality } from "./quality.js";
import {
	operationEvaluationRunSchema,
	operationManifestSchema,
} from "./schemas.js";
import {
	type ComparedVerdict,
	comparedVerdict,
	modalOutput,
	repetitionsMismatch,
} from "./stability.js";

/** Creates a new run directory; existing evidence is never overwritten. */
export async function saveRun(
	outputDirectory: string,
	run: OperationEvaluationRun,
): Promise<string> {
	const parsed = operationEvaluationRunSchema.parse(run);
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
): Promise<OperationEvaluationRun> {
	operationManifestSchema.shape.runId.parse(runId);
	const directory = join(outputDirectory, runId);
	const [manifest, cases, summary] = await Promise.all([
		readFile(join(directory, "manifest.json"), "utf8"),
		readFile(join(directory, "cases.jsonl"), "utf8"),
		readFile(join(directory, "summary.json"), "utf8"),
	]);
	const parsed = operationEvaluationRunSchema.parse({
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
		(parsed.summary.quality !== undefined &&
			JSON.stringify(parsed.summary.quality) !==
				JSON.stringify(summarizeQuality(parsed.cases))) ||
		parsed.summary.status !==
			(interrupted ? "Interrupted" : failed ? "Failed" : "Completed")
	)
		throw Error("Run summary does not match its cases");
	if (repetitionsMismatch(parsed))
		throw Error("Run repetitions do not match their summaries");
	return parsed;
}

type StoredCaseRecord = OperationEvaluationRun["cases"][number];
type CaseComparison = {
	readonly caseId: string;
	readonly left: StoredCaseRecord | null;
	readonly right: StoredCaseRecord | null;
	/** Null on the side where the case is absent. */
	readonly verdict: {
		readonly left: ComparedVerdict | null;
		readonly right: ComparedVerdict | null;
	};
	readonly verdictChanged: boolean;
	/** Field-level differences between the compared outputs; empty unless both runs have the case. */
	readonly outputChanges: readonly JsonChange[];
};

/**
 * Pairs cases by caseId. Outputs compare as JSON; a repeated case contributes
 * its most frequent output, and its verdict is Mixed when repetitions disagree.
 */
export function compareRuns(
	left: OperationEvaluationRun,
	right: OperationEvaluationRun,
) {
	const a = operationEvaluationRunSchema.parse(left),
		b = operationEvaluationRunSchema.parse(right);
	const aCases = new Map<string, StoredCaseRecord>(
		a.cases.map((record) => [record.caseId, record]),
	);
	const bCases = new Map<string, StoredCaseRecord>(
		b.cases.map((record) => [record.caseId, record]),
	);
	const ids = [
		...a.cases.map((record) => record.caseId),
		...b.cases
			.filter((record) => !aCases.has(record.caseId))
			.map((record) => record.caseId),
	];
	const cases = ids.map((caseId): CaseComparison => {
		const leftRecord = aCases.get(caseId) ?? null;
		const rightRecord = bCases.get(caseId) ?? null;
		const verdict = {
			left: leftRecord && comparedVerdict(leftRecord),
			right: rightRecord && comparedVerdict(rightRecord),
		};
		const both = leftRecord !== null && rightRecord !== null;
		return {
			caseId,
			left: leftRecord,
			right: rightRecord,
			verdict,
			verdictChanged: both && verdict.left !== verdict.right,
			outputChanges: both
				? diffJson(modalOutput(leftRecord), modalOutput(rightRecord))
				: [],
		};
	});
	return {
		left: a.manifest,
		right: b.manifest,
		sameExperiment: a.manifest.experimentId === b.manifest.experimentId,
		sameCorpus:
			a.manifest.corpus.fingerprint === b.manifest.corpus.fingerprint,
		cases,
		onlyLeft: cases
			.filter((pair) => pair.right === null)
			.map((pair) => pair.caseId),
		onlyRight: cases
			.filter((pair) => pair.left === null)
			.map((pair) => pair.caseId),
		changedVerdicts: cases
			.filter((pair) => pair.verdictChanged)
			.map((pair) => pair.caseId),
		changedOutputs: cases
			.filter((pair) => pair.outputChanges.length > 0)
			.map((pair) => pair.caseId),
	};
}
