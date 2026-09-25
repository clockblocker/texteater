import * as Effect from "effect/Effect";
import type { DumgenOptions } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { choice } from "../../../universal/questions.js";
import { type OperationScope, recordEvent } from "../../../universal/trace.js";
import {
	type AuthoredRealization,
	locateAuthoredIdentity,
} from "../authored-closed-sets/realizations.js";

/** The reviewed identity, if any, and the IDs of the calls that chose it. */
export type AuthoredIdentity = {
	readonly member:
		| ReturnType<typeof locateAuthoredIdentity>["compatible"][number]
		| null;
	readonly calls: readonly string[];
};

/**
 * Sentence capitalisation, not a formal spelling: lowercase only the first
 * letter, never uppercase. The exact-casing E3 policy was tested unguarded;
 * the sentence-initial guard narrows it so a mid-sentence capital (formal
 * Sie) is never lowercased.
 */
function sentenceInitialSpelling(spelled: string, sentenceInitial: boolean) {
	if (!sentenceInitial) return undefined;
	const [first = ""] = spelled;
	const lowered = first.toLocaleLowerCase("de");
	return lowered === first
		? undefined
		: lowered + spelled.slice(first.length);
}

export function resolveAuthoredGrammarIdentity(
	options: DumgenOptions,
	input: {
		kind: "DET" | "PRON";
		spelled: string;
		core: Record<string, unknown>;
		inflection: unknown;
		markedContext: string;
		/** The target's first member is the Sentence's first ResolvableText Segment. */
		sentenceInitial: boolean;
	},
	scope: OperationScope,
	dependsOn: readonly string[],
	mappings?: readonly AuthoredRealization[],
): Effect.Effect<AuthoredIdentity, DumgenFailure> {
	return Effect.gen(function* () {
		const located = locateAuthoredIdentity(input, mappings);
		const route = `de/Lexeme/${input.kind}`;
		recordEvent(scope, "AuthoredRealizationLookup", {
			status: located.status,
			spelled: input.spelled,
			matches: located.matches.map((member) => member.lemma),
			compatible: located.compatible.map((member) => member.lemma),
		});
		if (located.status === "Hit")
			return { member: located.matches[0]!, calls: [] };
		// Not an automatic retry (#445): a casing miss is a spelling-map coverage
		// gap. This deterministic lookup draws on the same exact-Core population
		// the jev fallback offers and replaces that call only on a unique Hit.
		const lowered = sentenceInitialSpelling(
			input.spelled,
			input.sentenceInitial,
		);
		if (lowered !== undefined) {
			const relocated = locateAuthoredIdentity(
				{ ...input, spelled: lowered },
				mappings,
			);
			recordEvent(scope, "AuthoredRealizationLookup", {
				status: relocated.status,
				spelled: lowered,
				matches: relocated.matches.map((member) => member.lemma),
				compatible: relocated.compatible.map((member) => member.lemma),
			});
			const [hit] = relocated.matches;
			if (relocated.status === "Hit" && hit)
				return { member: hit, calls: [] };
		}
		const { id, output: answer } = yield* judgmentCaller(options)(
			"resolveGrammar",
			`${route}/identity`,
			{
				markedContext: input.markedContext,
				spelled: input.spelled,
				judgedCore: JSON.stringify(input.core),
				judgedInflection: JSON.stringify(input.inflection),
				lookupStatus: located.status,
			},
			// Every compatible Lemma has exactly the judged Core, so an option
			// names only its Canonical Form and the Core is stated once.
			{
				identity: choice(
					"Select the required reviewed Lemma from these candidates compatible with the already-judged features: each has the Core in `judgedCore` and the Canonical Form it names. Do not revise any feature, collapse same-spelling identities, or treat a spelling-map gap as catalog absence. NoMatch means no reviewed compatible identity fits this occurrence; Unresolved means uncertain. Domain null is literal, not a wildcard.",
					{
						...Object.fromEntries(
							located.compatible.map((member, index) => [
								`identity_${index}`,
								member.lemma.canonicalForm,
							]),
						),
						NoMatch:
							"The required identity is not in the supplied compatible population",
						Unresolved:
							"Cannot establish a fitting identity or a genuine absence",
					},
				),
			},
			scope,
			dependsOn,
		);
		const selected = String(answer.answers.identity.choice);
		if (selected === "Unresolved")
			throw new DumgenFailure(
				"Unresolved",
				"resolveGrammar",
				"Authored identity remains uncertain",
				route,
			);
		if (selected === "NoMatch") {
			recordEvent(scope, "AuthoredPopulationMiss", { route });
			if (input.kind === "DET")
				throw new DumgenFailure(
					"CatalogMiss",
					"resolveGrammar",
					"Required DET identity is absent from the reviewed catalog",
					route,
				);
			return { member: null, calls: [id] };
		}
		const member =
			located.compatible[Number(selected.slice("identity_".length))];
		if (!member)
			throw new DumgenFailure(
				"InvalidModelOutput",
				"resolveGrammar",
				"Invalid identity index",
				route,
			);
		return { member, calls: [id] };
	});
}
