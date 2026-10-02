import type { CaseOrigin } from "../../../evaluation/spec-review.js";
import projected from "../../../generated/sentence-cases.json";
import remaining from "./source-data.json";

/** One sentence-analysis case: a Segmented Sentence and its offset-keyed gold. */
export type SentenceCase = {
	readonly input: unknown;
	readonly idealOutput: unknown;
	readonly explanation?: string;
};

const fromRecords = projected.cases as Readonly<Record<string, SentenceCase>>;
const fromSourceData = remaining.cases as Readonly<
	Record<string, SentenceCase>
>;

export const sentenceRoute = remaining.route;

/**
 * Every case: the sidecar's in its order, then one per Full Spec Record the
 * sidecar does not list. Until the last review batch lands (ADR 0037), a
 * listed case comes from the Spec Record codegen projected, or from
 * `source-data.json`.
 */
export const sentenceCases: Readonly<Record<string, SentenceCase>> =
	Object.fromEntries(
		projected.caseIds.map((id) => {
			const found = fromRecords[id] ?? fromSourceData[id];
			if (!found)
				throw Error(
					`Sentence case ${id} is in neither a Spec Record nor source-data.json`,
				);
			return [id, found];
		}),
	);

export const { demonstrationIds, evaluationCaseIds } = projected;

/** Named slices of the evaluation, run as their own experiments. */
export const sentenceSlices: Readonly<Record<string, readonly string[]>> =
	projected.slices;

/** The Spec Record of every case projected from one. */
export const origins = projected.origins as Readonly<
	Record<string, CaseOrigin>
>;
