import projected from "../../../generated/target-cases.json";
import type { Segment } from "../../../types.js";
import type { GermanHighLevelTargetClassificationTarget } from "./projection.js";
import remaining from "./source-data.json";

/** One target-classification case in its canonical, clicked-Segment form. */
export type TargetCase = {
	readonly input: {
		readonly clickedSegmentIndex: number;
		readonly segments: readonly Segment[];
	};
	readonly idealOutput:
		| GermanHighLevelTargetClassificationTarget
		| { readonly decision: "Unresolved" };
	readonly explanation?: string;
	readonly contaminationKeys?: readonly string[];
	readonly sources?: readonly {
		readonly title: string;
		readonly url: string;
		readonly supports: string;
	}[];
};

const fromRecords = projected.cases as Readonly<Record<string, TargetCase>>;
const fromSourceData = remaining.cases as Readonly<Record<string, TargetCase>>;

export const targetRoute = remaining.route;

/**
 * Every case, in sidecar order. Until the last review batch lands (ADR 0037),
 * a case comes from the Spec Records codegen projected, or from
 * `source-data.json`.
 */
export const targetCases: Readonly<Record<string, TargetCase>> =
	Object.fromEntries(
		projected.caseIds.map((id) => {
			const found = fromRecords[id] ?? fromSourceData[id];
			if (!found)
				throw Error(
					`Target case ${id} is in neither a Spec Record nor source-data.json`,
				);
			return [id, found];
		}),
	);

export const { demonstrationIds, evaluationCaseIds } = projected;

/** Named slices of the evaluation, run as their own experiments. */
export const targetSlices: Readonly<Record<string, readonly string[]>> =
	projected.slices;
