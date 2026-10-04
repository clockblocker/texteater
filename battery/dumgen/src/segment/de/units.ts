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
 * run X3's ten code rules, X5's saying-closed, D4's stranded-adverb and
 * X4's bracket-particle (#851, `code-rules.ts`), each enforcing one dumcorpus
 * Rule: on dev X3's
 * held 44 more gold units and lost none. Then X5's Locution Choice (#851, `locution-choice.ts`) asks
 * one `locution` request about the units a sub-floor link still joins and
 * merges those whose two units both pass de/fixed-member-test at 0.6: with
 * saying-closed, 12 more dev gold units held and none lost. Last, D4's
 * Verb Choice (#851, `verb-choice.ts`) asks one `verb` request about the
 * lassen, bekommen, haben and sein forms whose auxiliary slot named an
 * infinitive or participle: causative lassen and sich lassen, the
 * recipient passive, and perfect or state. On dev, 11 more gold units held
 * and none lost. After it, X4's Government Choice (#851,
 * `government-choice.ts`) asks one `government` request about the
 * prepositions whose grouping depends on valency, worded with E-VALBU's
 * tests, and splits or joins each as de/governed-preposition-joins-its-governor
 * and de/idiom decide: on dev, 16 more gold units held and 2 lost.
 */
import * as Effect from "effect/Effect";
import type { Ask, AskFailure } from "../ask.js";
import type { Segment, Unit } from "../segmented-sentence.js";
import { type Floors, membershipOf, type SayingAssembly } from "./assembly.js";
import {
	answerBeforeFormula,
	type CodeRule,
	withCodeRules,
} from "./code-rules.js";
import {
	askGovernmentChoice,
	type GovernmentSettings,
	withGovernmentChoice,
} from "./government-choice.js";
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
	 * enforcing one dumcorpus Rule. `was-fuer` also asks its Noul in `final`.
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
	/**
	 * The Government Choice (#851, X4, `government-choice.ts`): a
	 * `government` request over the prepositions whose grouping depends on
	 * valency, and the splits and joins its answers decide. None when absent.
	 */
	readonly government?: GovernmentSettings;
};

/** Candidates4 maxim+closed: v3's floors, the Saying Choice with the maxim at 0.7, every code rule, the Locution Choice at 0.6, the Verb Choice's lassen, recipient and state families at 0.5 and the Government Choice at 0.5 without its weak family. */
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
		"bracket-particle",
	],
	locution: { floor: 0.6, absorb: true },
	// Picked on dev (#851, D4) after the pre-registered 0.6 over all five
	// families failed: these three ask what no slot question names, and
	// lost no dev unit at 0.5, 0.6 or 0.7. Held-out (#852) is the check.
	verb: { floor: 0.5, families: ["lassen", "recipient", "state"] },
	// Picked on dev (#851, X4) after the pre-registered setting, v2 without
	// the duel at 0.5, held +12 −2 (net 10, under the 10.5-unit floor): v3
	// adds the duel and frees a literal idiom's preposition. Held-out (#852)
	// is the check.
	government: {
		floor: 0.5,
		families: ["joined", "particle", "rival", "literal", "duel"],
	},
};

/** Groups one German Sentence's Segments into its biggest units and routes each. */
export const segmentGermanUnits = Effect.fnUntraced(function* (
	sentence: { readonly segments: readonly Segment[] },
	ask: Ask,
	settings: UnitSettings = productionUnitSettings,
): Effect.fn.Return<Unit[], AskFailure> {
	const nomination = yield* nominate(sentence, ask, settings.inventory, {
		wasFuer: settings.rules.includes("was-fuer"),
	});
	const base = membershipOf(nomination, settings.floors, settings.saying);
	const ruled = withCodeRules(nomination, base, settings.rules);
	const located = settings.locution
		? withLocutionChoice(
				nomination,
				base,
				ruled,
				yield* askLocutionChoice(
					nomination,
					ruled,
					ask,
					settings.rules,
				),
				settings.rules,
				settings.locution,
			)
		: ruled;
	const verbed = settings.verb
		? withVerbChoice(
				nomination,
				located,
				yield* askVerbChoice(nomination, ask, settings.verb.families),
				settings.rules,
				settings.verb,
			)
		: located;
	const membership = settings.government
		? withGovernmentChoice(
				nomination,
				verbed,
				yield* askGovernmentChoice(
					nomination,
					verbed,
					ask,
					settings.rules,
					settings.government.families,
				),
				settings.rules,
				settings.government,
			)
		: verbed;
	const answers = yield* askRouteBatches(nomination, ask);
	const extra =
		settings.unasked === "ask"
			? yield* askUnaskedRoutes(
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
	).units(settings.variantMargin, { identity: true });
});
