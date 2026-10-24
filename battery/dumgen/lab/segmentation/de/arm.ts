/**
 * What every lab arm shares: its contract and the context the lab runs it
 * in. The arms are thin configurations of the production unit stage
 * (`src/segment/de/`); they reach jev through its `ask` port, which the lab
 * backs with its cached jev (`lab/segmentation/harness/jev-cache.ts`).
 *
 * An arm's run is an Effect that needs the run's `RequestBudget` and
 * nothing else (Dumgen ADR 0009, D4 on #1269): every ask holds one of its
 * permits, so a run keeps at most that many jev requests in flight however
 * many cases it runs at once. It fails with the ask's `AskFailure`; anything
 * else an arm throws is a Defect, which the run records by its message.
 */

import type * as Effect from "effect/Effect";
import type { RequestBudget } from "../../../src/call.js";
import type { Ask, AskFailure } from "../../../src/segment/ask.js";
import type { RouteJudgment } from "../../../src/segment/de/route-requests.js";
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

export type ArmResult = {
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
	) => Effect.Effect<ArmResult, AskFailure, RequestBudget>;
};

/**
 * The production stage's `ask` port, answered from the lab's cached jev at
 * this repetition, on the run's request budget. A failed request fails
 * with its `AskFailure`.
 */
export const askOf = (
	context: Pick<ArmContext, "jev" | "repetition" | "calls">,
): Effect.Effect<Ask, never, RequestBudget> =>
	context.jev.port(context.repetition, context.calls);
