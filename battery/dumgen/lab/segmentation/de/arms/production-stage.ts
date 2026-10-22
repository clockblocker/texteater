/**
 * Production's unit stage (`productionUnitSettings`) over one case and one
 * `ask`, in the pieces the production arm's levers recombine. A policy
 * runs production's settings with at most its own Choice replaced, so a
 * Choice production gains reaches every lever. Each nomination is asked
 * once (a `Cache` by was … für), production's own units once
 * (`Effect.cached`), and each distinct request once (`onceEach`), however
 * many policies read it.
 */

import { canonicalJson } from "common-utils";
import * as Cache from "effect/Cache";
import * as Effect from "effect/Effect";
import type { Ask, AskFailure } from "../../../../src/segment/ask.js";
import {
	type Membership,
	membershipOf,
} from "../../../../src/segment/de/assembly.js";
import {
	type CodeRule,
	codeRoutes,
	withCodeRules,
} from "../../../../src/segment/de/code-rules.js";
import { answerBeforeFormula } from "../../../../src/segment/de/code-rules-words.js";
import {
	askGovernmentChoice,
	withGovernmentChoice,
} from "../../../../src/segment/de/government-choice.js";
import {
	askLocutionChoice,
	withLocutionChoice,
} from "../../../../src/segment/de/locution-choice.js";
import {
	type Nomination,
	nominate,
} from "../../../../src/segment/de/nomination.js";
import {
	askRouteBatches,
	askUnaskedRoutes,
	type RouteAnswers,
} from "../../../../src/segment/de/route-requests.js";
import {
	type RoutedMembership,
	routeMembership,
} from "../../../../src/segment/de/routing.js";
import {
	productionUnitSettings,
	type UnitSettings,
} from "../../../../src/segment/de/units.js";
import {
	askVerbChoice,
	withVerbChoice,
} from "../../../../src/segment/de/verb-choice.js";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../../evaluation/spec-corpus/segment-in-units.js";
import { onceEach } from "../../harness/once.js";

const settings = productionUnitSettings;

/** The Choices run over the ruled membership, in production's order; absent ones are skipped. */
export type Choices = Pick<UnitSettings, "locution" | "verb" | "government">;

/** A nomination and its batched route answers. */
type Read = {
	readonly nomination: Nomination;
	readonly answers: RouteAnswers;
};

export type UnitStage = {
	/** Production's read and its membership routed as intake routes it. */
	readonly production: Effect.Effect<
		{
			readonly read: Read;
			readonly routed: RoutedMembership;
		},
		AskFailure
	>;
	/** The read `rules` ask: was-fuer adds its Noul to `final`, and a Sentence without was … für asks the same. */
	readonly read: (
		rules: readonly CodeRule[],
	) => Effect.Effect<Read, AskFailure>;
	/** Production's floors and Saying assembly over `read`, then `rules`, then production's Choices with `replaced` in their place. */
	readonly membership: (
		read: Read,
		rules: readonly CodeRule[],
		replaced?: Partial<Choices>,
	) => Effect.Effect<Membership, AskFailure>;
	/** A membership's units under `rules`, routed as production routes them unless `unasked` says otherwise. */
	readonly units: (
		read: Read,
		membership: Membership,
		rules: readonly CodeRule[],
		unasked?: UnitSettings["unasked"],
	) => Effect.Effect<SegmentInUnitsOutput, AskFailure>;
};

/** The policies one lever adds over a case's unit stage, by name. */
export type Policies = (
	stage: UnitStage,
) => Effect.Effect<Readonly<Record<string, SegmentInUnitsOutput>>, AskFailure>;

/** Production's unit stage over `input`, asking through `ask`. */
export const unitStageOf = Effect.fnUntraced(function* (
	input: SegmentInUnitsInput,
	ask: Ask,
): Effect.fn.Return<UnitStage> {
	// `ask`, sending each distinct request once and handing every later asker its answers.
	const once: Ask = yield* onceEach(canonicalJson, ask);
	const reads = yield* Cache.make({
		capacity: 2,
		lookup: (wasFuer: boolean) =>
			Effect.gen(function* () {
				const nomination = yield* nominate(
					input,
					once,
					settings.inventory,
					{ wasFuer },
				);
				return {
					nomination,
					answers: yield* askRouteBatches(nomination, once),
				};
			}),
	});
	const read = (rules: readonly CodeRule[]) =>
		Cache.get(reads, rules.includes("was-fuer"));
	// As `segmentGermanUnits` runs them.
	const membership = (
		{ nomination }: Read,
		rules: readonly CodeRule[],
		replaced: Partial<Choices> = {},
	) =>
		Effect.gen(function* () {
			const { locution, verb, government }: Choices = {
				...settings,
				...replaced,
			};
			const base = membershipOf(
				nomination,
				settings.floors,
				settings.saying,
			);
			const ruled = withCodeRules(nomination, base, rules);
			let current = ruled;
			if (locution)
				current = withLocutionChoice(
					nomination,
					base,
					ruled,
					yield* askLocutionChoice(nomination, ruled, once, rules),
					rules,
					locution,
				);
			if (verb)
				current = withVerbChoice(
					nomination,
					current,
					yield* askVerbChoice(nomination, once, verb.families),
					rules,
					verb,
				);
			if (government)
				current = withGovernmentChoice(
					nomination,
					current,
					yield* askGovernmentChoice(
						nomination,
						current,
						once,
						rules,
						government.families,
					),
					rules,
					government,
				);
			return current;
		});
	const routed = (
		at: Read,
		units: Membership,
		rules: readonly CodeRule[],
		unasked: UnitSettings["unasked"],
	) =>
		Effect.gen(function* () {
			const extra =
				unasked === "ask"
					? yield* askUnaskedRoutes(
							at.nomination,
							at.answers,
							units.partition,
							once,
						)
					: undefined;
			return routeMembership(
				at.nomination,
				units,
				at.answers,
				extra,
				rules.includes("answer-apart")
					? answerBeforeFormula
					: undefined,
				codeRoutes(at.nomination, rules),
			);
		});
	const production = yield* Effect.cached(
		Effect.gen(function* () {
			const at = yield* read(settings.rules);
			const units = yield* membership(at, settings.rules);
			return {
				read: at,
				routed: yield* routed(
					at,
					units,
					settings.rules,
					settings.unasked,
				),
			};
		}),
	);
	return {
		production,
		read,
		membership,
		units: (at, units, rules, unasked = settings.unasked) =>
			Effect.map(routed(at, units, rules, unasked), (routing) => ({
				units: routing.units(),
			})),
	};
});
