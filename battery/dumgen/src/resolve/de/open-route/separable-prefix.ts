/**
 * The separable prefixes a VERB unit may carry: those offered for one, and
 * the reading of the prefix answer.
 */

import { germanAdpositionEntry } from "dumcorpus/inventories";
import { particleForms } from "../../../segment/de/candidates.js";
import { rShortenings } from "../member-spelling.js";
import type { Answered, Choice } from "../questions.js";
import type { Member, Target } from "../target.js";
import { coordinators, type GovernedQuestions } from "./governed.js";
import { fold, spellingOf } from "./shape.js";

/**
 * The separable prefixes a VERB unit may carry: those that open a particle
 * slot, and those that open none but stand for a particle verb's first part
 * often enough (daliegen, gutheißen, offenlegen, irreführen, volltanken,
 * großziehen). stand (standen) is not offered (#1057).
 */
export const prefixParticles: ReadonlySet<string> = new Set([
	...particleForms,
	"da",
	"dagegen",
	"flach",
	"groß",
	"gut",
	"irre",
	"leer",
	"offen",
	"voll",
]);
export const isParticle = (word: string) => prefixParticles.has(word);

/**
 * The separable prefixes a VERB unit could carry, longest first: each
 * particle member standing apart from the verb, the words a shortened one
 * stands for in its place (rein is herein or hinein, never a prefix of its
 * own: Rule de/r-adverb-is-her-or-hin-shorthand), and each particle a
 * member's word begins with. A member that is no particle, such as the
 * verb's own participle, is never offered whole.
 */
export function prefixCandidates(target: Target, skip: ReadonlySet<number>) {
	const found = new Set<string>();
	for (const member of target.members) {
		if (skip.has(member.position)) continue;
		const word = fold(spellingOf(member));
		if (
			target.members.length > 1 &&
			member.spelling?.orthography === "Shorthand"
		)
			for (const surface of member.spelling.surfaces)
				found.add(fold(surface));
		else if (
			target.members.length > 1 &&
			/^\p{L}+$/u.test(word) &&
			isParticle(word)
		)
			found.add(word);
		for (let length = word.length - 2; length >= 2; length--) {
			const prefix = word.slice(0, length);
			if (isParticle(prefix)) found.add(prefix);
		}
	}
	return [...found].sort((left, right) => right.length - left.length);
}

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
): string {
	const governed = (word: string) =>
		governable.some(
			(chosen) =>
				chosen.preposition === word &&
				answered.peek(chosen.governed) === "Governed",
		);
	const settled = answered.peek(asked);
	// A preposition the verb governs is never its prefix (Rule
	// de/verb-core-features): warten auf is warten.
	if (settled !== undefined && settled !== "None") {
		const prefix = prefixes[Number(settled.slice(1))];
		return prefix !== undefined && governed(prefix) ? "None" : settled;
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
		return only !== undefined && others.length === 0 ? only : "None";
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
	return likeliest ?? answered.pick(asked);
}

/** Each her- or hin- word an r- shortening stands for. */
const shortenedFrom: Readonly<Record<string, string>> = Object.fromEntries(
	Object.entries(rShortenings).flatMap(([word, expansions]) =>
		expansions.map((expansion) => [expansion, word]),
	),
);
