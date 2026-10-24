/**
 * A VERB's separable prefix as its answers and its members settle it: the
 * prefix jev picked unless the verb governs it, else a particle standing
 * apart in the unit.
 */

import { germanAdpositionEntry } from "dumcorpus/inventories";
import * as Result from "effect/Result";
import { rShortenings } from "../member-spelling.js";
import type { Answered, Choice, Unresolved } from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	coordinators,
	type GovernedQuestions,
	governedPrefix,
} from "./governed.js";
import { fold, spellingOf } from "./shape.js";

/**
 * The prefix answer. A shortened r- word in the verbal bracket is the
 * particle of its her- or hin- word's particle verb (Rule
 * de/r-adverb-is-her-or-hin-shorthand), so when jev leaves the prefix
 * Unresolved, the likelier of those two it weighed is read; None is never
 * one of them.
 */
export function prefixAnswer(
	target: Target,
	prefixes: readonly string[],
	asked: Choice,
	governable: readonly GovernedQuestions[],
	answered: Answered,
): Result.Result<string, Unresolved> {
	const governed = governedPrefix(target, governable, answered);
	const settled = answered.peek(asked);
	// A preposition the verb governs is never its prefix (Rule
	// de/verb-core-features): warten auf is warten. One its twin closes the
	// bracket after, or its own word opens, keeps it: Pass auf dich auf, dass
	// er auf sie aufpasst.
	if (settled !== undefined && settled !== "None") {
		const prefix = prefixes[Number(settled.slice(1))];
		return Result.succeed(
			prefix !== undefined && governed(prefix) ? "None" : settled,
		);
	}
	// A particle standing apart that segmentation put in the VERB unit, and
	// that the verb does not govern, is its separable prefix: it belongs to
	// the verb's Lemma, and only the prefix can (de/verb-core-features,
	// de/bracket-particle-or-circumposition): tut … leid is leidtun. A
	// preposition followed by a word has its own complement and is never
	// the prefix (sich mit ihm zanken; de/verb-core-features).
	const ownComplement = (member: Member) => {
		if (
			germanAdpositionEntry({
				family: "Lexeme",
				canonicalForm: fold(member.text),
			}) === null
		)
			return false;
		const next = target.segments
			.slice(member.segment + 1)
			.find((segment) => segment.kind !== "Whitespace");
		// A coordinating conjunction or another preposition after it opens
		// no complement of its own (gingen … entlang und spazierten; liefen
		// den Fluss entlang bis zur Brücke).
		return (
			next?.kind === "ResolvableText" &&
			!coordinators.has(fold(next.text)) &&
			germanAdpositionEntry({
				family: "Lexeme",
				canonicalForm: fold(next.text),
			}) === null
		);
	};
	const standing = prefixes.flatMap((prefix, index) =>
		target.members.length > 1 &&
		target.members.some(
			(member) =>
				fold(spellingOf(member)) === prefix &&
				member.spelling === undefined &&
				!ownComplement(member),
		) &&
		!governed(prefix)
			? [`p${index}`]
			: [],
	);
	if (settled === "None") {
		const [only, ...others] = standing;
		return Result.succeed(
			only !== undefined && others.length === 0 ? only : "None",
		);
	}
	const expansions = new Set(
		target.members.flatMap((member) =>
			member.spelling?.orthography === "Shorthand" &&
			member.spelling.surfaces.some((surface) => surface in shortenedFrom)
				? member.spelling.surfaces
				: [],
		),
	);
	const likeliest = answered.alternatives(asked, 0).find((option) => {
		const prefix = prefixes[Number(option.slice(1))];
		return prefix !== undefined && expansions.has(prefix);
	});
	return likeliest === undefined
		? answered.pick(asked)
		: Result.succeed(likeliest);
}

/** Each her- or hin- word an r- shortening stands for. */
const shortenedFrom: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(rShortenings).flatMap(([word, expansions]) =>
		expansions.map((expansion) => [expansion, word]),
	),
);
