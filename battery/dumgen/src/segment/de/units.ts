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
 * setting (#762) stays expressible for experiments. Over its membership
 * run X3's ten code rules, X5's saying-closed and D4's stranded-adverb
 * (#851, `code-rules.ts`), each enforcing one dumspec Rule: on dev X3's
 * held 44 more gold units and lost none. Then X5's Locution Choice (#851, `locution-choice.ts`) asks
 * one `locution` request about the units a sub-floor link still joins and
 * merges those whose two units both pass de/fixed-member-test at 0.6: with
 * saying-closed, 12 more dev gold units held and none lost.
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
import {
	askLocutionChoice,
	type LocutionSettings,
	withLocutionChoice,
} from "./locution-choice.js";
import { nominate } from "./nomination.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	routeMembership,
} from "./routing.js";
import {
	askVerbChoice,
	type VerbSettings,
	withVerbChoice,
} from "./verb-choice.js";

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
	/**
	 * The Locution Choice (#851, X5, `locution-choice.ts`): a `locution`
	 * request over the units sub-floor links still join, and the merges it
	 * accepts. None when absent.
	 */
	readonly locution?: LocutionSettings;
	/**
	 * The Verb Choice (#851, D4, `verb-choice.ts`): a `verb` request over
	 * the verb satellites whose slot named a host, and the joins and splits
	 * its Rule-worded answers decide. None when absent.
	 */
	readonly verb?: VerbSettings;
};

/** Candidates4 maxim+closed: v3's floors, the Saying Choice with the maxim at 0.7, every code rule and the Locution Choice at 0.6. */
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
	rules: [
		"split-adverb",
		"stranded-adverb",
		"anchors",
		"quantifier",
		"pronoun",
		"article-head",
		"sein-chain",
		"was-fuer",
		"infixed-zu",
		"binomial",
		"answer-apart",
		"saying-closed",
	],
	locution: { floor: 0.6, absorb: true },
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
	const base = membershipOf(nomination, settings.floors, settings.saying);
	const ruled = withCodeRules(nomination, base, settings.rules);
	const located = settings.locution
		? withLocutionChoice(
				nomination,
				base,
				ruled,
				await askLocutionChoice(nomination, ruled, ask, settings.rules),
				settings.rules,
				settings.locution,
			)
		: ruled;
	const membership = settings.verb
		? withVerbChoice(
				nomination,
				located,
				await askVerbChoice(nomination, ask),
				settings.rules,
				settings.verb,
			)
		: located;
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
