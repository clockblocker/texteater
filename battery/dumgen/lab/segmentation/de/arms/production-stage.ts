/**
 * Production's unit stage (`productionUnitSettings`) over one case and one
 * `ask`, in the pieces the production arm's levers recombine. A policy
 * runs production's settings with at most its own Choice replaced, so a
 * Choice production gains reaches every lever. Each nomination is asked
 * once, production's own units once, and each distinct request once,
 * however many policies read it.
 */

import { canonicalJson } from "common-utils";
import * as Effect from "effect/Effect";
import type { Answers, Ask, AskFailure } from "../../../../src/segment/ask.js";
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
	readonly production: () => Promise<{
		readonly read: Read;
		readonly routed: RoutedMembership;
	}>;
	/** The read `rules` ask: was-fuer adds its Noul to `final`, and a Sentence without was … für asks the same. */
	readonly read: (rules: readonly CodeRule[]) => Promise<Read>;
	/** Production's floors and Saying assembly over `read`, then `rules`, then production's Choices with `replaced` in their place. */
	readonly membership: (
		read: Read,
		rules: readonly CodeRule[],
		replaced?: Partial<Choices>,
	) => Promise<Membership>;
	/** A membership's units under `rules`, routed as production routes them unless `unasked` says otherwise. */
	readonly units: (
		read: Read,
		membership: Membership,
		rules: readonly CodeRule[],
		unasked?: UnitSettings["unasked"],
	) => Promise<SegmentInUnitsOutput>;
};

/** The policies one lever adds over a case's unit stage, by name. */
export type Policies = (
	stage: UnitStage,
) => Promise<Readonly<Record<string, SegmentInUnitsOutput>>>;

/** `ask`, sending each distinct request once and handing every later asker its answers. */
function askingOnce(ask: Ask): Ask {
	const asked = new Map<string, Effect.Effect<Answers, AskFailure>>();
	return (request) => {
		const key = canonicalJson(request);
		const known = asked.get(key);
		if (known) return known;
		const once = Effect.runSync(Effect.cached(ask(request)));
		asked.set(key, once);
		return once;
	};
}

/** Production's unit stage over `input`, asking through `ask`. */
export function unitStageOf(input: SegmentInUnitsInput, ask: Ask): UnitStage {
	const once = askingOnce(ask);
	const run = <A>(effect: Effect.Effect<A, AskFailure>) =>
		Effect.runPromise(effect);
	const reads = new Map<boolean, Promise<Read>>();
	const read = (rules: readonly CodeRule[]): Promise<Read> => {
		const wasFuer = rules.includes("was-fuer");
		const known = reads.get(wasFuer);
		if (known) return known;
		const reading = (async () => {
			const nomination = await run(
				nominate(input, once, settings.inventory, { wasFuer }),
			);
			return {
				nomination,
				answers: await run(askRouteBatches(nomination, once)),
			};
		})();
		reads.set(wasFuer, reading);
		return reading;
	};
	// As `segmentGermanUnits` runs them.
	const membership = async (
		{ nomination }: Read,
		rules: readonly CodeRule[],
		replaced: Partial<Choices> = {},
	): Promise<Membership> => {
		const { locution, verb, government }: Choices = {
			...settings,
			...replaced,
		};
		const base = membershipOf(nomination, settings.floors, settings.saying);
		const ruled = withCodeRules(nomination, base, rules);
		let current = ruled;
		if (locution)
			current = withLocutionChoice(
				nomination,
				base,
				ruled,
				await run(askLocutionChoice(nomination, ruled, once, rules)),
				rules,
				locution,
			);
		if (verb)
			current = withVerbChoice(
				nomination,
				current,
				await run(askVerbChoice(nomination, once, verb.families)),
				rules,
				verb,
			);
		if (government)
			current = withGovernmentChoice(
				nomination,
				current,
				await run(
					askGovernmentChoice(
						nomination,
						current,
						once,
						rules,
						government.families,
					),
				),
				rules,
				government,
			);
		return current;
	};
	const routed = async (
		at: Read,
		units: Membership,
		rules: readonly CodeRule[],
		unasked: UnitSettings["unasked"],
	): Promise<RoutedMembership> =>
		routeMembership(
			at.nomination,
			units,
			at.answers,
			unasked === "ask"
				? await run(
						askUnaskedRoutes(
							at.nomination,
							at.answers,
							units.partition,
							once,
						),
					)
				: undefined,
			rules.includes("answer-apart") ? answerBeforeFormula : undefined,
			codeRoutes(at.nomination, rules),
		);
	let production: ReturnType<UnitStage["production"]> | undefined;
	return {
		production: () => {
			production ??= (async () => {
				const at = await read(settings.rules);
				return {
					read: at,
					routed: await routed(
						at,
						await membership(at, settings.rules),
						settings.rules,
						settings.unasked,
					),
				};
			})();
			return production;
		},
		read,
		membership,
		units: async (at, units, rules, unasked = settings.unasked) => ({
			units: (await routed(at, units, rules, unasked)).units(),
		}),
	};
}
