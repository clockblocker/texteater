/**
 * The `production` arm: production's unit stage as intake runs it
 * (`segmentGermanUnits`), and the policies the `--opt` levers add
 * (`production-levers.ts`), every policy read from the same answers.
 *
 * `--opt pool=mean,median` (X2) reads every policy again over answers
 * pooled across the cache's repetitions 0 to 2
 * (`lab/segmentation/harness/pool.ts`), as `pooled-<pooling>+<policy>`. A
 * pooled output is the same in every repetition.
 */

import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import type { RequestBudget } from "../../../../src/call.js";
import type { Ask, AskFailure } from "../../../../src/segment/ask.js";
import { productionUnitSettings } from "../../../../src/segment/de/units.js";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../../evaluation/spec-corpus/segment-in-units.js";
import { onceEach } from "../../harness/once.js";
import { type Heard, pooledAsk, recording } from "../../harness/pool.js";
import { type Arm, type ArmContext, askOf } from "../arm.js";
import { type Levers, leversOf } from "./production-levers.js";
import { unitStageOf } from "./production-stage.js";

/** Production's policy and every lever's over one `ask`, each name prefixed. */
const outputsOf = Effect.fnUntraced(function* (
	input: SegmentInUnitsInput,
	ask: Ask,
	levers: Levers,
	prefix = "",
) {
	const stage = yield* unitStageOf(input, ask);
	const { read, routed } = yield* stage.production;
	const outputs: Record<string, SegmentInUnitsOutput> = {
		[`${prefix}production`]: {
			units: routed.units(productionUnitSettings.variantMargin),
		},
	};
	for (const policies of levers.policies)
		for (const [name, output] of Object.entries(yield* policies(stage)))
			outputs[`${prefix}${name}`] = output;
	return { outputs, routes: [...read.answers.routes.identity.values()] };
});

/** The repetitions a pool reads. */
const pooledRepetitions = [0, 1, 2] as const;

/** A case's answers by repetition, heard once per run whichever repetition asks first. */
type HeardOf = (asked: {
	readonly input: SegmentInUnitsInput;
	readonly context: ArmContext;
}) => Effect.Effect<Heard[], AskFailure>;

/** Each run's heard answers, by the cached jev the run asks. */
const heardCache = new WeakMap<ArmContext["jev"], HeardOf>();

/** The case's answers at each pooled repetition; fresh calls land in the first asker's record, so a live run counts them. */
const hear = ({
	input,
	context,
}: Parameters<HeardOf>[0]): Effect.Effect<Heard[], AskFailure, RequestBudget> =>
	Effect.forEach(
		pooledRepetitions,
		(repetition) =>
			Effect.gen(function* () {
				const answers: Heard = new Map();
				const ask = yield* askOf({
					jev: context.jev,
					repetition,
					calls: context.calls,
				});
				yield* outputsOf(input, recording(ask, answers), {
					pool: [],
					policies: [],
				});
				return answers;
			}),
		{ concurrency: "unbounded" },
	);

/** The run's memo of heard answers, made the first time one of its cases asks. */
const heardOf = (
	context: ArmContext,
): Effect.Effect<HeardOf, never, RequestBudget> =>
	Effect.flatMap(
		onceEach(
			(asked: Parameters<HeardOf>[0]) => canonicalJson(asked.input),
			hear,
		),
		(made) =>
			Effect.sync(() => {
				const known = heardCache.get(context.jev);
				if (known) return known;
				heardCache.set(context.jev, made);
				return made;
			}),
	);

export const productionArm: Arm = {
	id: "production",
	summary:
		"production's unit stage with #851's offline levers: the X1 floors × Saying grid, X2 pooled repetitions, X7 route variants, X3 code rules and the X5 Locution, D4 Verb and X4 Government Choice variants",
	run: (input, context) =>
		Effect.gen(function* () {
			const levers = leversOf(context.options);
			const { outputs, routes } = yield* outputsOf(
				input,
				yield* askOf(context),
				levers,
			);
			if (levers.pool.length > 0) {
				const heard = yield* (yield* heardOf(context))({
					input,
					context,
				});
				for (const pooling of levers.pool) {
					const pooled = yield* outputsOf(
						input,
						pooledAsk(heard, pooling),
						levers,
						`pooled-${pooling}+`,
					);
					Object.assign(outputs, pooled.outputs);
				}
			}
			return { primary: "production", outputs, routes };
		}),
};
