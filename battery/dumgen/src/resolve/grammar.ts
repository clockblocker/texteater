/**
 * The body of `resolve.grammar` (#859): the stored unit a click landed on
 * comes in, its Attestation goes out, or the judge's Unresolved, or a
 * Catalog Miss. A unit intake left Unresolved stays Unresolved with no
 * call (#861). A closed DET or PRON unit builds its Lemma from the
 * identity intake stored (#864); any other unit asks jev and Luna (#862).
 * Whatever comes back is checked by Dumling before it is returned, and
 * the operation's trace says how the click came out and why.
 */
import { lemmaIdentityKey, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type { AuthoredMember, AuthoredRealization } from "dumspec/inventories";
import { closedRoute } from "dumspec/inventories";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../errors.js";
import { askThrough, type JevSettings } from "../jev-call.js";
import type { LunaSettings } from "../luna-call.js";
import type { Ask } from "../segment/ask.js";
import type { Route } from "../segment/segmented-sentence.js";
import {
	authoredOptions,
	type ClosedOption,
	cellQuestion,
	closedAttestation,
} from "./de/closed-class.js";
import { resolveOpenRoute } from "./de/open-route.js";
import { Answered, UnresolvedAnswer } from "./de/questions.js";
import { type Target, targetOf, targetState } from "./de/target.js";
import type { GrammarResolution, ResolveGrammarInput } from "./types.js";

/** What `resolve.grammar` reaches its models with. */
export type GrammarModels = {
	readonly jev: JevSettings;
	readonly luna: LunaSettings;
};

/** A deciding answer read synchronously, or why the click stops. */
function settle<T>(read: () => T): T | UnresolvedAnswer {
	try {
		return read();
	} catch (error) {
		if (error instanceof UnresolvedAnswer) return error;
		throw error;
	}
}

type Outcome =
	| { readonly _tag: "Attestation"; readonly attestation: unknown }
	| { readonly _tag: "Unresolved"; readonly reason: string }
	| { readonly _tag: "CatalogMiss"; readonly message: string };

/**
 * A closed DET or PRON unit, or a Locution DET or PRON an inventory
 * authors: the authored cells its spelling realizes, and the cell
 * question when several remain. None realized on a Closed Route is a
 * Catalog Miss (ADR 0021); a Locution none realizes is left to the open
 * route (`undefined`).
 */
const resolveAuthored = Effect.fnUntraced(function* (
	target: Target,
	input: ResolveGrammarInput,
	ask: Ask,
): Effect.fn.Return<Outcome | undefined, ProviderFailure | InvalidModelOutput> {
	const { kind, family } = target.route;
	const closed = closedRoute(target.route);
	if (kind !== "DET" && kind !== "PRON")
		return {
			_tag: "CatalogMiss",
			message: `No authored identity resolves a ${kind} unit`,
		};
	const { options, lemma } = authoredOptions(
		target,
		family === "Lexeme" ? input.unit.identity : undefined,
	);
	const [only] = options;
	if (!only)
		return closed
			? {
					_tag: "CatalogMiss",
					message:
						target.members.length === 1 && !input.unit.identity
							? `No authored identity was stored for this ${kind} unit`
							: `No authored ${kind} ${lemma} is spelled ${target.members.map(({ text }) => text).join(" ")}`,
				}
			: undefined;
	if (options.length === 1)
		return {
			_tag: "Attestation",
			attestation: closedAttestation(target, only, only.realization),
		};
	const reference = target.members.map(({ ref }) => ref).join(" ");
	const cell = cellQuestion(lemma, reference, options, input.neighbours);
	const answers = yield* ask({
		stage: "cell",
		state: {
			...targetState(target),
			policy: cell.questionnaire.policyBlock(),
			...(cell.neighbours ? { neighbours: cell.neighbours } : {}),
		},
		questions: cell.questionnaire.questions,
	});
	const picked = settle(() => new Answered(answers).pick("cell"));
	if (picked instanceof UnresolvedAnswer)
		return { _tag: "Unresolved", reason: picked.reason };
	const chosen = cell.answerOf(picked);
	if (!chosen)
		return yield* new InvalidModelOutput({
			stage: "cell",
			message: `jev answered the cell question with ${picked}, no option of it`,
		});
	return {
		_tag: "Attestation",
		attestation: closedAttestation(
			target,
			chosen,
			realizationOf(chosen, options),
		),
	};
});

/**
 * The authored spelling an answer attests: its own, or for a Syncretism
 * the spelling of its Canonical Form among its units' (ihnen, not Ihnen).
 */
function realizationOf(
	chosen: ClosedOption | AuthoredMember,
	options: readonly ClosedOption[],
): AuthoredRealization {
	if ("realization" in chosen) return chosen.realization;
	const units = new Set(
		(
			(chosen.lemma as { syncretized?: readonly Dumling.Lemma[] })
				.syncretized ?? []
		).map((unit) => lemmaIdentityKey(unit)),
	);
	const ofUnits = options.filter(({ member }) =>
		units.has(lemmaIdentityKey(member.lemma)),
	);
	const option =
		ofUnits.find(
			({ realization }) =>
				realization.spelled === chosen.lemma.canonicalForm,
		) ??
		ofUnits[0] ??
		options[0];
	if (!option) throw Error("A Syncretism answer comes from options");
	return option.realization;
}

/**
 * Resolves one click. Another language than German, a Sentence whose
 * segmentation failed, or a unit that is no unit of its Sentence is bad
 * input, a Defect raised before anything is asked.
 */
export const resolveGrammar = Effect.fnUntraced(function* (
	scope: OperationScope,
	models: GrammarModels,
	input: ResolveGrammarInput,
): Effect.fn.Return<GrammarResolution, ProviderFailure | InvalidModelOutput> {
	if (input.language !== "de")
		return yield* Effect.die(
			Error(
				`resolve.grammar resolves German ("de") only, not ${JSON.stringify(input.language)}`,
			),
		);
	if (input.sentence.failed)
		return yield* Effect.die(
			Error(
				"The Sentence's segmentation failed; segment it again before resolving a click on it",
			),
		);
	const { unit } = input;
	if (unit.route === "Unresolved") {
		scope.resolution({ outcome: "Unresolved", reason: "UnresolvedUnit" });
		return { _tag: "Unresolved" };
	}
	const route: Route = unit.route;
	const target = targetOf(input.sentence, unit, route);
	const ask = askThrough(scope, models.jev);
	// A Locution DET or PRON an inventory authors resolves as authored too.
	const authored =
		closedRoute(route) || route.kind === "DET" || route.kind === "PRON"
			? yield* resolveAuthored(target, input, ask)
			: undefined;
	const outcome: Outcome =
		authored ??
		(yield* resolveOpenRoute(
			scope,
			target,
			ask,
			models.luna,
			input.lemmaCandidates,
		));
	if (outcome._tag === "Unresolved") {
		scope.resolution({ outcome: "Unresolved", reason: outcome.reason });
		return { _tag: "Unresolved" };
	}
	if (outcome._tag === "CatalogMiss") {
		scope.resolution({ outcome: "CatalogMiss", reason: outcome.message });
		return { _tag: "CatalogMiss", route, message: outcome.message };
	}
	const parsed = parseUnit(outcome.attestation);
	if (!parsed.success)
		return yield* new InvalidModelOutput({
			stage: "attestation",
			message: `The answers make no valid Attestation: ${parsed.error.message}`,
		});
	const { chain } = parsed;
	if (
		chain.unitKind !== "Attestation" ||
		chain.family !== route.family ||
		chain.kind !== route.kind
	)
		throw Error("The Attestation left the unit's route");
	scope.resolution({ outcome: "Resolved" });
	return {
		_tag: "Resolved",
		attestation: chain.value as Dumling.Attestation<"de">,
	};
});
