/**
 * What every lab arm shares: its contract and the context the lab runs it
 * in. The arms are thin configurations of the production unit stage
 * (`src/segment/de/`); they reach jev through its `ask` port, which the lab
 * backs with its cached jev (`lab/segmentation/harness/jev-cache.ts`).
 */

import type { Ask } from "../../../src/segment/ask.js";
import type { RouteJudgment } from "../../../src/segment/de/routing.js";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import type { CallRecord, JevCache } from "../harness/jev-cache.js";

export type { RouteJudgment };

export type ArmOptions = Readonly<Record<string, string>>;

export type ArmContext = {
	readonly jev: JevCache;
	readonly repetition: number;
	readonly calls: CallRecord[];
	readonly options: ArmOptions;
};

/** One membership probability between two pieces, kept for calibration. */
export type LinkJudgment = {
	readonly left: number;
	readonly right: number;
	readonly probability: number;
};

type ArmResult = {
	/** One output per assembly policy, all from the same answers. */
	readonly outputs: Readonly<Record<string, SegmentInUnitsOutput>>;
	/** The policy the arm's headline numbers use. */
	readonly primary: string;
	readonly routes?: readonly RouteJudgment[];
	readonly links?: readonly LinkJudgment[];
};

export type Arm = {
	readonly id: string;
	readonly summary: string;
	readonly run: (
		input: SegmentInUnitsInput,
		context: ArmContext,
	) => Promise<ArmResult>;
};

/**
 * The production stage's `ask` port, answered from the lab's cached jev at
 * this repetition. A failed request rejects with the lab's own error.
 */
export const askOf = (
	context: Pick<ArmContext, "jev" | "repetition" | "calls">,
): Ask => context.jev.port(context.repetition, context.calls);
