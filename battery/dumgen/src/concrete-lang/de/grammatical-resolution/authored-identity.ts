import type { DumgenOptions } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { choice } from "../../../universal/questions.js";
import { recordEvent } from "../../../universal/trace.js";
import {
	type AuthoredRealization,
	locateAuthoredIdentity,
} from "../authored-closed-sets/realizations.js";

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

export async function resolveAuthoredGrammarIdentity(
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
	signal: AbortSignal,
	mappings?: readonly AuthoredRealization[],
) {
	const located = locateAuthoredIdentity(input, mappings);
	const route = `de/Lexeme/${input.kind}`;
	recordEvent(signal, "AuthoredRealizationLookup", {
		status: located.status,
		spelled: input.spelled,
		matches: located.matches.map((member) => member.lemma),
		compatible: located.compatible.map((member) => member.lemma),
	});
	if (located.status === "Hit") return located.matches[0]!;
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
		recordEvent(signal, "AuthoredRealizationLookup", {
			status: relocated.status,
			spelled: lowered,
			matches: relocated.matches.map((member) => member.lemma),
			compatible: relocated.compatible.map((member) => member.lemma),
		});
		const [hit] = relocated.matches;
		if (relocated.status === "Hit" && hit) return hit;
	}
	const answer = await judgmentCaller(options)(
		"resolveGrammar",
		`${route}/identity`,
		{
			markedContext: input.markedContext,
			spelled: input.spelled,
			judgedCore: JSON.stringify(input.core),
			judgedInflection: JSON.stringify(input.inflection),
			lookupStatus: located.status,
			reviewedIdentities: located.compatible.map(
				(member) => member.lemma,
			),
		},
		{
			identity: choice(
				"Select the required reviewed Lemma from these candidates compatible with the already-judged features. Do not revise any feature, collapse same-spelling identities, or treat a spelling-map gap as catalog absence. NoMatch means no reviewed compatible identity fits this occurrence; Unresolved means uncertain. Domain null is literal, not a wildcard.",
				{
					...Object.fromEntries(
						located.compatible.map((member, index) => [
							`identity_${index}`,
							JSON.stringify(member.lemma),
						]),
					),
					NoMatch:
						"The required identity is not in the supplied compatible population",
					Unresolved:
						"Cannot establish a fitting identity or a genuine absence",
				},
			),
		},
		signal,
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
		recordEvent(signal, "AuthoredPopulationMiss", { route });
		if (input.kind === "DET")
			throw new DumgenFailure(
				"CatalogMiss",
				"resolveGrammar",
				"Required DET identity is absent from the reviewed catalog",
				route,
			);
		return null;
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
	return member;
}
