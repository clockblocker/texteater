/**
 * What every lab arm shares: its contract and the context the lab runs it
 * in. The arms are thin configurations of the production unit stage
 * (`src/segment/de/`); they reach jev through its `ask` port, which the lab
 * backs with its cached jev client.
 */
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import type { Ask } from "../../segment/ask.js";
import type { RouteJudgment } from "../../segment/de/routing.js";
import type { CallRecord, Jev } from "../lab/jev.js";

export type { RouteJudgment };

export type ArmOptions = Readonly<Record<string, string>>;

export type ArmContext = {
	readonly jev: Jev;
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
	) => Promise<ArmResult>;
};

/** The production stage's `ask` port, answered from the lab's cached jev at this repetition. */
export const askOf =
	(context: Pick<ArmContext, "jev" | "repetition" | "calls">): Ask =>
	(request) =>
		context.jev.ask({
			...request,
			repetition: context.repetition,
			calls: context.calls,
		});
