/**
 * Production's unit stage (`productionUnitSettings`) over one case and one
 * `ask`, in the pieces the production arm's levers recombine. Each
 * nomination is asked once, and production's own units once, however many
 * policies read them.
 */

import * as Effect from "effect/Effect";
import type { Ask } from "../../../../src/segment/ask.js";
import {
	type Membership,
	membershipOf,
} from "../../../../src/segment/de/assembly.js";
import {
	answerBeforeFormula,
	type CodeRule,
	codeRoutes,
	withCodeRules,
} from "../../../../src/segment/de/code-rules.js";
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
	type RoutedMembership,
	routeMembership,
} from "../../../../src/segment/de/routing.js";
import { productionUnitSettings } from "../../../../src/segment/de/units.js";
import {
	askVerbChoice,
	withVerbChoice,
} from "../../../../src/segment/de/verb-choice.js";
import type {
	SegmentInUnitsInput,
	SegmentInUnitsOutput,
} from "../../../evaluation/spec-corpus/segment-in-units.js";

const settings = productionUnitSettings;

/** A nomination and its batched route answers. */
type Read = {
	readonly nomination: Nomination;
	readonly answers: RouteAnswers;
};

/** A membership after code rules, and the assembled one they ruled. */
type Ruled = { readonly base: Membership; readonly ruled: Membership };

export type UnitStage = {
	readonly ask: Ask;
	/** Production's read and its membership routed as intake routes it. */
	readonly production: () => Promise<{
		readonly read: Read;
		readonly routed: RoutedMembership;
	}>;
	/** The read `rules` ask: was-fuer adds its Noul to `final`, and a Sentence without was … für asks the same. */
	readonly read: (rules: readonly CodeRule[]) => Promise<Read>;
	/** Production's floors and Saying assembly over `read`, then `rules`. */
	readonly ruled: (read: Read, rules: readonly CodeRule[]) => Ruled;
	/** The ruled membership after production's Locution Choice, asked over `rules`. */
	readonly located: (
		read: Read,
		rules: readonly CodeRule[],
	) => Promise<Membership>;
	/** The located membership after production's Verb and Government Choices. */
	readonly membership: (
		read: Read,
		rules: readonly CodeRule[],
	) => Promise<Membership>;
	/** A membership's units under `rules`; a group no batch asked about routes `Unresolved`, unasked. */
	readonly units: (
		read: Read,
		membership: Membership,
		rules: readonly CodeRule[],
	) => SegmentInUnitsOutput;
};

/** The policies one lever adds over a case's unit stage, by name. */
export type Policies = (
	stage: UnitStage,
) => Promise<Readonly<Record<string, SegmentInUnitsOutput>>>;

const routed = (
	read: Read,
	membership: Membership,
	rules: readonly CodeRule[],
	extra?: Parameters<typeof routeMembership>[3],
) =>
	routeMembership(
		read.nomination,
		membership,
		read.answers,
		extra,
		rules.includes("answer-apart") ? answerBeforeFormula : undefined,
		codeRoutes(read.nomination, rules),
	);

/** Production's unit stage over `input`, asking through `ask`. */
export function unitStageOf(input: SegmentInUnitsInput, ask: Ask): UnitStage {
	const reads = new Map<boolean, Promise<Read>>();
	const read = (rules: readonly CodeRule[]): Promise<Read> => {
		const wasFuer = rules.includes("was-fuer");
		const known = reads.get(wasFuer);
		if (known) return known;
		const reading = (async () => {
			const nomination = await Effect.runPromise(
				nominate(input, ask, settings.inventory, { wasFuer }),
			);
			return {
				nomination,
				answers: await Effect.runPromise(
					askRouteBatches(nomination, ask),
				),
			};
		})();
		reads.set(wasFuer, reading);
		return reading;
	};
	const ruled = (at: Read, rules: readonly CodeRule[]): Ruled => {
		const base = membershipOf(
			at.nomination,
			settings.floors,
			settings.saying,
		);
		return { base, ruled: withCodeRules(at.nomination, base, rules) };
	};
	const located = async (
		at: Read,
		rules: readonly CodeRule[],
	): Promise<Membership> => {
		const { base, ruled: membership } = ruled(at, rules);
		if (!settings.locution) return membership;
		const answers = await Effect.runPromise(
			askLocutionChoice(at.nomination, membership, ask, rules),
		);
		return withLocutionChoice(
			at.nomination,
			base,
			membership,
			answers,
			rules,
			settings.locution,
		);
	};
	const membership = async (
		at: Read,
		rules: readonly CodeRule[],
	): Promise<Membership> => {
		let current = await located(at, rules);
		if (settings.verb)
			current = withVerbChoice(
				at.nomination,
				current,
				await Effect.runPromise(
					askVerbChoice(at.nomination, ask, settings.verb.families),
				),
				rules,
				settings.verb,
			);
		if (settings.government)
			current = withGovernmentChoice(
				at.nomination,
				current,
				await Effect.runPromise(
					askGovernmentChoice(
						at.nomination,
						current,
						ask,
						rules,
						settings.government.families,
					),
				),
				rules,
				settings.government,
			);
		return current;
	};
	let production: ReturnType<UnitStage["production"]> | undefined;
	return {
		ask,
		production: () => {
			production ??= (async () => {
				const at = await read(settings.rules);
				const units = await membership(at, settings.rules);
				const extra =
					settings.unasked === "ask"
						? await Effect.runPromise(
								askUnaskedRoutes(
									at.nomination,
									at.answers,
									units.partition,
									ask,
								),
							)
						: undefined;
				return {
					read: at,
					routed: routed(at, units, settings.rules, extra),
				};
			})();
			return production;
		},
		read,
		ruled,
		located,
		membership,
		units: (at, units, rules) => ({
			units: routed(at, units, rules).units(),
		}),
	};
}
