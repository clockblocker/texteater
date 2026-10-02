import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stableJson } from "promptsmith";
import { summarizeQuality } from "promptsmith/evaluation";

/**
 * The Spec Record target a case was projected from, and the Review Status
 * (`Reviewed` or `Draft`) it had; `target` is null for a case projected from
 * a whole record, such as a sentence analysis. Codegen writes it beside the
 * case, so the runtime never reads dumspec.
 */
export type CaseOrigin = {
	readonly record: string;
	readonly target: number | null;
	readonly status: string;
};

/** A run's scored cases, as Promptsmith stores them. */
type ReviewedRun = {
	readonly cases: readonly {
		readonly caseId: string;
		readonly status: string;
		readonly idealOutput?: unknown;
		readonly output?: unknown;
		readonly evaluation?: unknown;
	}[];
};

type Scores = ReturnType<typeof summarizeQuality> & { total: number };

/**
 * A Reviewed case the pipeline got wrong: review input, because either the
 * model or the record is wrong (ADR 0037, guard 3). `expected` and `produced`
 * hold only the paths where the answers differ; a path missing on one side is
 * absent there.
 */
export type Disagreement = {
	record: string;
	target: number | null;
	caseId: string;
	expected: Record<string, unknown>;
	produced: Record<string, unknown>;
};

/** Where `evaluate` writes a spec-backed run's disagreements, in its run directory. */
export const disagreementsFileName = "disagreements.jsonl";

/**
 * Splits a spec-backed run's quality by the Review Status of each case's
 * record, with `DumgenOwned` for cases the sidecar owns, and lists the
 * Reviewed cases the evaluator failed.
 */
export function reviewRun(
	run: ReviewedRun,
	origins: Readonly<Record<string, CaseOrigin>>,
) {
	const groups: Record<string, ReviewedRun["cases"][number][]> = {
		Reviewed: [],
		Draft: [],
		DumgenOwned: [],
	};
	const disagreements: Disagreement[] = [];
	for (const record of run.cases) {
		const origin = origins[record.caseId];
		const status = origin?.status ?? "DumgenOwned";
		const group = groups[status] ?? [];
		group.push(record);
		groups[status] = group;
		if (origin?.status === "Reviewed" && summarizeQuality([record]).failed)
			disagreements.push({
				record: origin.record,
				target: origin.target,
				caseId: record.caseId,
				...differences(record.idealOutput, record.output),
			});
	}
	const scores: Record<string, Scores> = Object.fromEntries(
		Object.entries(groups).map(([status, records]) => [
			status,
			{ total: records.length, ...summarizeQuality(records) },
		]),
	);
	return { scores, disagreements };
}

/** One JSON object per line, in run order; empty when nothing disagrees. */
export function formatDisagreements(disagreements: readonly Disagreement[]) {
	return disagreements.map((item) => `${JSON.stringify(item)}\n`).join("");
}

export async function writeDisagreements(
	runDirectory: string,
	disagreements: readonly Disagreement[],
) {
	await writeFile(
		join(runDirectory, disagreementsFileName),
		formatDisagreements(disagreements),
	);
}

/**
 * The paths where two answers differ, `$` for the root and `$.a.b` below it.
 * Objects are compared key by key; any other value, arrays included, is
 * compared whole.
 */
function differences(expected: unknown, produced: unknown) {
	const result = {
		expected: {} as Record<string, unknown>,
		produced: {} as Record<string, unknown>,
	};
	const visit = (path: string, left: unknown, right: unknown) => {
		if (isObject(left) && isObject(right)) {
			for (const key of new Set([
				...Object.keys(left),
				...Object.keys(right),
			]))
				visit(`${path}.${key}`, left[key], right[key]);
			return;
		}
		if (
			left === right ||
			(left !== undefined &&
				right !== undefined &&
				stableJson(left) === stableJson(right))
		)
			return;
		if (left !== undefined) result.expected[path] = left;
		if (right !== undefined) result.produced[path] = right;
	};
	visit("$", expected, produced);
	return result;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
