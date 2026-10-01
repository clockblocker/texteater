/**
 * The reference's floors swept from its cached answers (#762): one policy
 * per setting, each named after the floors it moves, the reference policy
 * being the setting that moves none. Nomination and the historical route
 * batches are asked once and shared by every setting, so a sweep over the
 * reference run's sentences sends no request the run did not send.
 *
 * A setting may build a group no historical batch asked about. Its route
 * is left `Unresolved` rather than asked: the sweep reads membership, and a
 * route only moves membership when two adjacent one-piece units are both
 * routed INTJ.
 *
 *   --opt grid=single     one floor at a time (`singleGrid`)
 *   --opt grid=combined   the best two or three together (`combinedGrid`)
 */
import { runStages, type Stages } from "../../lab/stages.js";
import { type Arm, option } from "../arm.js";
import {
	askReferenceRoutes,
	floorsKey,
	nominationOf,
	type ReferenceDetail,
	type ReferenceEvidence,
	type ReferenceFloors,
	referenceEvidence,
	referenceFloors,
	referencePolicy,
	resolveReference,
	routeReferenceWith,
} from "./reference.js";

const moved = (changes: Partial<ReferenceFloors>): ReferenceFloors => ({
	...referenceFloors,
	...changes,
});

/** One floor at a time, around the reference's own value. */
export const singleGrid: readonly ReferenceFloors[] = [
	...[0.3, 0.4, 0.5, 0.6, 0.8].map((expression) => moved({ expression })),
	...[0.3, 0.4, 0.5, 0.6, 0.8].map((idiom) => moved({ idiom })),
	...[0.3, 0.4, 0.6, 0.7].map((fixed) => moved({ fixed })),
	...[0.2, 0.3, 0.4, 0.6, 0.7].map((saying) => moved({ saying })),
	...[0.3, 0.4, 0.6].map((satellite) => moved({ satellite })),
	// Margin instead of the satellite floor: the top host links when it
	// beats `none` by the margin, whatever its share.
	...[0, 0.1, 0.2, 0.3].map((margin) => moved({ satellite: 0, margin })),
	...[0.1, 0.2].map((margin) => moved({ margin })),
];

/**
 * The single settings that gained membership net without raising flips
 * (idiom 0.6, fixed 0.3, Saying 0.4, no satellite floor), two, three and
 * four together.
 */
export const combinedGrid: readonly ReferenceFloors[] = [
	moved({ idiom: 0.6, fixed: 0.3 }),
	moved({ idiom: 0.6, saying: 0.4 }),
	moved({ fixed: 0.3, saying: 0.4 }),
	moved({ idiom: 0.6, fixed: 0.3, saying: 0.4 }),
	moved({ idiom: 0.6, fixed: 0.3, saying: 0.4, satellite: 0 }),
];

const grids: Readonly<Record<string, readonly ReferenceFloors[]>> = {
	single: singleGrid,
	combined: combinedGrid,
};

export const referenceFloorsArm: Arm = {
	id: "reference-floors",
	summary:
		"The #755 reference with its floors swept from the same cached answers (#762): one policy per setting, the reference policy first; groups no historical route batch asked stay Unresolved",
	async run(input, context) {
		const name = option(context.options, "grid", "single");
		const grid = grids[name];
		if (!grid)
			throw Error(
				`--opt grid must be one of ${Object.keys(grids).join(", ")}`,
			);
		const evidence = await referenceEvidence(input, context);
		const answers = await askReferenceRoutes(evidence, context);
		const outputs: Record<
			string,
			Awaited<ReturnType<typeof runStages>>["output"]
		> = {};
		for (const floors of [referenceFloors, ...grid]) {
			const stages: Stages<ReferenceEvidence, ReferenceDetail> = {
				nominate: async () => nominationOf(evidence, floors),
				resolve: (nomination) => resolveReference(nomination, floors),
				route: async (nomination, membership) =>
					routeReferenceWith(nomination, membership, answers),
			};
			const policy = floorsKey(floors);
			if (policy in outputs) throw Error(`Setting ${policy} repeats`);
			outputs[policy] = (await runStages(stages, input, context)).output;
		}
		return { primary: referencePolicy, outputs };
	},
};
