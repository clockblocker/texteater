/**
 * The German unit stage of `segment.inUnits` (Dumgen ADR 0007): a
 * Sentence's Segments in, its biggest units out, each with its route or
 * `Unresolved`. Nomination asks what jev judges about the connections code
 * proposes, membership assembles the units under floors without a
 * request, and routing routes them. Their requests run as a graph of what
 * each reads (`germanUnitGraph`, `stage-graph.ts`), not in the order this
 * comment tells them: a typical Sentence asks `candidates+final+closed`
 * and then `route`, and one that reaches every Choice five requests in a
 * row at most.
 *
 * The production setting is candidates4's maxim+closed policy
 * (`step0+saying+maxim@0.7+closed`), which the main session chose on
 * 2026-10-02 (#843): on dev it matched or beat the reference on every
 * grouping measure and gained Sayings beyond noise. The floors, the Saying
 * assembly and the inventory are settings, so the reference's adopted
 * setting (#762) stays expressible for experiments. Over its membership
 * run X3's ten code rules, X5's saying-closed, D4's stranded-adverb,
 * X4's bracket-particle (#851, `code-rules.ts`) and #1155's particle-verb,
 * which routing reads, each enforcing one dumcorpus Rule: on dev X3's
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
import type { Answers, Ask, AskFailure } from "../ask.js";
import type { Segment, Unit } from "../segmented-sentence.js";
import {
	type Degraded,
	type Plan,
	runStageGraph,
	type StageGraph,
} from "../stage-graph.js";
import {
	type Floors,
	type Membership,
	membershipOf,
	type SayingAssembly,
} from "./assembly.js";
import { type CodeRule, codeRoutes, withCodeRules } from "./code-rules.js";
import { answerBeforeFormula } from "./code-rules-words.js";
import {
	type GovernmentAnswers,
	type GovernmentSettings,
	governmentPlan,
	withGovernmentChoice,
} from "./government-choice.js";
import { authoredInventory, type GermanInventory } from "./inventory.js";
import {
	type LocutionAnswers,
	type LocutionSettings,
	locutionPlan,
	withLocutionChoice,
} from "./locution-choice.js";
import {
	type Candidates,
	candidatesPlan,
	type Expressions,
	expressionsPlan,
	finalPlan,
	type Nomination,
	type Proposal,
	proposalOf,
} from "./nomination.js";
import {
	type BatchAnswers,
	closedPlan,
	type RouteAnswers,
	type RouteBatches,
	type Routes,
	route2Plan,
	routeAnswersOf,
	routeBatchesOf,
	routeExtraPlan,
	routePlan,
} from "./route-requests.js";
import { routeMembership } from "./routing.js";
import {
	type VerbAnswers,
	type VerbSettings,
	verbPlan,
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
	 * ADR 0007). None when absent.
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
		"particle-verb",
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

/** What each stage of the German unit stage settles: its graph's values. */
export type UnitStages = {
	readonly candidates: Candidates;
	readonly final: Answers;
	readonly closed: Pick<BatchAnswers, "answers" | "unanswered">;
	readonly expressions: Expressions;
	readonly nomination: Nomination;
	readonly verb: VerbAnswers | undefined;
	readonly ruled: { readonly base: Membership; readonly ruled: Membership };
	readonly batches: RouteBatches;
	readonly route: BatchAnswers;
	readonly route2: BatchAnswers;
	readonly locution: LocutionAnswers | undefined;
	readonly located: Membership;
	readonly verbed: Membership;
	readonly government: GovernmentAnswers | undefined;
	readonly membership: Membership;
	readonly routeAnswers: RouteAnswers;
	readonly "route-extra": Routes | undefined;
	readonly units: Unit[];
};

/** A Choice's plan, or none when its setting is off; without its answers, the membership before it stands. */
const choicePlan = <A>(plan: Plan<A> | undefined): Plan<A | undefined> =>
	plan
		? { ...plan, absent: () => undefined }
		: { questions: {}, read: () => undefined };

/**
 * The German unit stage as a graph of what each stage reads
 * (`stage-graph.ts`). Nomination's `candidates` and `final` and routing's
 * `closed` read only the Sentence, so they go out together; `expressions`
 * and the Verb Choice read only `candidates`; the batched route requests
 * and the Locution Choice read the nomination; the Government Choice
 * reads the membership the Locution and Verb Choices leave; `route-extra`
 * reads the final membership. Without its answers, a Choice keeps the
 * membership before it and a route request leaves the routes it decides
 * `Unresolved`; a failed nomination request fails the Sentence.
 */
export function germanUnitGraph(
	proposal: Proposal,
	settings: UnitSettings,
): StageGraph<UnitStages> {
	const { rules } = settings;
	return {
		candidates: { reads: [], ask: () => candidatesPlan(proposal) },
		final: {
			reads: [],
			ask: () =>
				finalPlan(proposal, { wasFuer: rules.includes("was-fuer") }),
		},
		closed: { reads: [], ask: () => closedPlan(proposal) },
		expressions: {
			reads: ["candidates"],
			ask: (read) => expressionsPlan(read("candidates")),
		},
		nomination: {
			reads: ["candidates", "expressions", "final"],
			code: (read) => ({
				...read("candidates"),
				...read("expressions"),
				final: read("final"),
			}),
		},
		verb: {
			reads: ["candidates"],
			ask: (read) =>
				choicePlan(
					settings.verb &&
						verbPlan(read("candidates"), settings.verb.families),
				),
		},
		ruled: {
			reads: ["nomination"],
			code: (read) => {
				const nomination = read("nomination");
				const base = membershipOf(
					nomination,
					settings.floors,
					settings.saying,
				);
				return { base, ruled: withCodeRules(nomination, base, rules) };
			},
		},
		batches: {
			reads: ["nomination"],
			code: (read) => routeBatchesOf(read("nomination")),
		},
		route: {
			reads: ["nomination", "batches"],
			ask: (read) => routePlan(read("nomination"), read("batches").v3),
		},
		route2: {
			reads: ["nomination", "batches"],
			ask: (read) => route2Plan(read("nomination"), read("batches")),
		},
		locution: {
			reads: ["nomination", "ruled"],
			ask: (read) =>
				choicePlan(
					settings.locution &&
						locutionPlan(
							read("nomination"),
							read("ruled").ruled,
							rules,
						),
				),
		},
		located: {
			reads: ["nomination", "ruled", "locution"],
			code: (read) => {
				const { base, ruled } = read("ruled");
				const answers = read("locution");
				return settings.locution && answers
					? withLocutionChoice(
							read("nomination"),
							base,
							ruled,
							answers,
							rules,
							settings.locution,
						)
					: ruled;
			},
		},
		verbed: {
			reads: ["nomination", "located", "verb"],
			code: (read) => {
				const answers = read("verb");
				return settings.verb && answers
					? withVerbChoice(
							read("nomination"),
							read("located"),
							answers,
							rules,
							settings.verb,
						)
					: read("located");
			},
		},
		government: {
			reads: ["nomination", "verbed"],
			ask: (read) =>
				choicePlan(
					settings.government &&
						governmentPlan(
							read("nomination"),
							read("verbed"),
							rules,
							settings.government.families,
						),
				),
		},
		membership: {
			reads: ["nomination", "verbed", "government"],
			code: (read) => {
				const answers = read("government");
				return settings.government && answers
					? withGovernmentChoice(
							read("nomination"),
							read("verbed"),
							answers,
							rules,
							settings.government,
						)
					: read("verbed");
			},
		},
		routeAnswers: {
			reads: ["batches", "route", "route2", "closed"],
			code: (read) =>
				routeAnswersOf(
					read("batches"),
					read("route"),
					read("route2"),
					read("closed"),
				),
		},
		"route-extra": {
			reads: ["nomination", "routeAnswers", "membership"],
			ask: (read) =>
				settings.unasked === "ask"
					? routeExtraPlan(
							read("nomination"),
							read("routeAnswers"),
							read("membership").partition,
						)
					: { questions: {}, read: () => undefined },
		},
		units: {
			reads: ["nomination", "membership", "routeAnswers", "route-extra"],
			code: (read) => {
				const nomination = read("nomination");
				return routeMembership(
					nomination,
					read("membership"),
					read("routeAnswers"),
					read("route-extra"),
					rules.includes("answer-apart")
						? answerBeforeFormula
						: undefined,
					codeRoutes(nomination, rules),
				).units(settings.variantMargin, { identity: true });
			},
		},
	};
}

/** One Sentence's units, and the stages whose failed request they were settled without. */
export type GermanUnits = {
	readonly units: Unit[];
	readonly degraded: readonly Degraded[];
};

/** Groups one German Sentence's Segments into its biggest units and routes each. */
export const segmentGermanUnits = (
	sentence: { readonly segments: readonly Segment[] },
	ask: Ask,
	settings: UnitSettings = productionUnitSettings,
): Effect.Effect<GermanUnits, AskFailure> => {
	const proposal = proposalOf(sentence, settings.inventory);
	return Effect.map(
		runStageGraph(germanUnitGraph(proposal, settings), proposal.state, ask),
		({ values, degraded }) => ({ units: values.units, degraded }),
	);
};
