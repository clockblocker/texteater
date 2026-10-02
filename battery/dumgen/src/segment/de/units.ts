/**
 * The German unit stage of `segment.inUnits` (Dumgen ADR 0007): a
 * Sentence's Segments in, its biggest units out, each with its route or
 * `Unresolved`. Nomination asks what jev judges about the connections code
 * proposes, membership assembles the units under floors without a
 * request, and routing routes them.
 *
 * The production setting is candidates4's maxim+closed policy
 * (`step0+saying+maxim@0.7+closed`), which the main session chose on
 * 2026-10-02 (#843): on dev it matched or beat the reference on every
 * grouping measure and gained Sayings beyond noise. The floors, the Saying
 * assembly and the inventory are settings, so the reference's adopted
 * setting (#762) stays expressible for experiments.
 */
import type { Ask } from "../ask.js";
import type { Segment, Unit } from "../segmented-sentence.js";
import { type Floors, membershipOf, type SayingAssembly } from "./assembly.js";
import {
	answerBeforeFormula,
	type CodeRule,
	withCodeRules,
} from "./code-rules.js";
import { authoredInventory, type GermanInventory } from "./inventory.js";
import { nominate } from "./nomination.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	routeMembership,
} from "./routing.js";

export type UnitSettings = {
	readonly floors: Floors;
	readonly saying: SayingAssembly;
	readonly inventory: GermanInventory;
	/**
	 * A group no batched route request asked about: `ask` sends one more
	 * request (`route-extra`), `unresolved` routes it `Unresolved` unasked.
	 */
	readonly unasked: "ask" | "unresolved";
	/**
	 * Borderline units carry route variants when the top two shares of the
	 * distribution that decided their route lie within this margin (Dumgen
	 * ADR 0007, amended 2026-09-30). None when absent.
	 */
	readonly variantMargin?: number;
	/**
	 * The code rules applied over the assembled membership (#851, X3), each
	 * enforcing one dumspec Rule. `was-fuer` also asks its Noul in `final`.
	 */
	readonly rules: readonly CodeRule[];
};

/** Candidates4 maxim+closed: v3's floors, the Saying Choice with the maxim at 0.7. */
export const productionUnitSettings: UnitSettings = {
	floors: {
		satellite: 0.5,
		margin: 0,
		idiom: 0.7,
		expression: 0.7,
		fixed: 0.5,
	},
	saying: { floor: 0.7, maxim: true },
	inventory: authoredInventory,
	unasked: "ask",
	rules: [],
};

/** Groups one German Sentence's Segments into its biggest units and routes each. */
export async function segmentGermanUnits(
	sentence: { readonly segments: readonly Segment[] },
	ask: Ask,
	settings: UnitSettings = productionUnitSettings,
): Promise<Unit[]> {
	const nomination = await nominate(sentence, ask, settings.inventory, {
		wasFuer: settings.rules.includes("was-fuer"),
	});
	const membership = withCodeRules(
		nomination,
		membershipOf(nomination, settings.floors, settings.saying),
		settings.rules,
	);
	const answers = await askRouteBatches(nomination, ask);
	const extra =
		settings.unasked === "ask"
			? await askUnaskedRoutes(
					nomination,
					answers,
					membership.partition,
					ask,
				)
			: undefined;
	return routeMembership(
		nomination,
		membership,
		answers,
		extra,
		settings.rules.includes("answer-apart")
			? answerBeforeFormula
			: undefined,
	).units(settings.variantMargin);
}
