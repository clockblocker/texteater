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
import type { Ask } from "../../../../src/segment/ask.js";
import { productionUnitSettings } from "../../../../src/segment/de/units.js";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../../evaluation/spec-corpus/segment-in-units.js";
import { type Heard, pooledAsk, recording } from "../../harness/pool.js";
import { type Arm, type ArmContext, askOf } from "../arm.js";
import { type Levers, leversOf } from "./production-levers.js";
import { unitStageOf } from "./production-stage.js";

/** Production's policy and every lever's over one `ask`, each name prefixed. */
async function outputsOf(
	input: SegmentInUnitsInput,
	ask: Ask,
	levers: Levers,
	prefix = "",
) {
	const stage = unitStageOf(input, ask);
	const { read, routed } = await stage.production();
	const outputs: Record<string, SegmentInUnitsOutput> = {
		[`${prefix}production`]: {
			units: routed.units(productionUnitSettings.variantMargin),
		},
	};
	for (const policies of levers.policies)
		for (const [name, output] of Object.entries(await policies(stage)))
			outputs[`${prefix}${name}`] = output;
	return { outputs, routes: [...read.answers.routes.identity.values()] };
}

/** The repetitions a pool reads. */
const pooledRepetitions = [0, 1, 2] as const;

/** Each case's answers by repetition, heard once per run. */
const heardCache = new WeakMap<
	ArmContext["jev"],
	Map<string, Promise<Heard[]>>
>();

function heardOf(
	input: SegmentInUnitsInput,
	context: ArmContext,
): Promise<Heard[]> {
	const byCase = heardCache.get(context.jev) ?? new Map();
	heardCache.set(context.jev, byCase);
	const key = canonicalJson(input);
	const known = byCase.get(key);
	if (known) return known;
	const heard = Promise.all(
		pooledRepetitions.map(async (repetition) => {
			const answers: Heard = new Map();
			// Fresh calls land in this repetition's record, so a live run counts them.
			await outputsOf(
				input,
				recording(
					askOf({
						jev: context.jev,
						repetition,
						calls: context.calls,
					}),
					answers,
				),
				{ pool: [], policies: [] },
			);
			return answers;
		}),
	);
	byCase.set(key, heard);
	return heard;
}

export const productionArm: Arm = {
	id: "production",
	summary:
		"production's unit stage with #851's offline levers: the X1 floors × Saying grid, X2 pooled repetitions, X7 route variants, X3 code rules and the X5 Locution, D4 Verb and X4 Government Choice variants",
	async run(input, context) {
		const levers = leversOf(context.options);
		const { outputs, routes } = await outputsOf(
			input,
			askOf(context),
			levers,
		);
		if (levers.pool.length > 0) {
			const heard = await heardOf(input, context);
			for (const pooling of levers.pool)
				Object.assign(
					outputs,
					(
						await outputsOf(
							input,
							pooledAsk(heard, pooling),
							levers,
							`pooled-${pooling}+`,
						)
					).outputs,
				);
		}
		return { primary: "production", outputs, routes };
	},
};
