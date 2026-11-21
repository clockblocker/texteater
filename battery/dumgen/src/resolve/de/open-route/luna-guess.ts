/** Luna's call on a guess at jev's answers, and why the guess can miss. */

import { isRecord } from "common-utils";
import type { LunaDraft } from "../../../luna.js";
import type { Judged } from "../canonical-form.js";
import type { MemberOrthography } from "../member-spelling.js";
import { fixedSpelling, type Member, type Target } from "../target.js";
import { type GovernedQuestions, headwordOutside } from "./governed.js";
import type { OpeningArticle } from "./nominal.js";
import { fold, type Shape, spellingOf } from "./shape.js";

/** The auxiliaries a satellite of these spellings is guessed to be, never a main verb. */
const guessedAuxiliaries = new Set(["haben", "sein", "werden"]);

/**
 * The governable prepositions guessed to be governed before jev answers:
 * on any governing Lexeme (NOUN, ADJ, VERB, INTJ), every governable
 * preposition except one that may be a VERB's separable prefix — unless
 * `bracketTwins` already settled it as governed. A Locution's governed
 * preposition may stay inside its headword, so it is left to jev.
 */
export function guessedGoverned(planned: {
	readonly shape: Shape;
	readonly verbal: { readonly prefixes: readonly string[] } | undefined;
	readonly tail: { readonly governable: readonly GovernedQuestions[] };
}): readonly GovernedQuestions[] {
	if (!(planned.shape.lexeme && planned.shape.governs)) return [];
	const prefixes = new Set(planned.verbal?.prefixes ?? []);
	return planned.tail.governable.filter(
		({ member, governed }) =>
			governed === undefined || !prefixes.has(fold(spellingOf(member))),
	);
}

/**
 * What Luna reads before jev has answered: every member Standard unless
 * the unit or dumcorpus's tables already fix its orthography, the opening
 * article and a lexical reflexive outside the headword, only the readings
 * code fixes, and no judged features. Where jev's answer is all but
 * certain, a Lexeme's guess takes it: on any governing Lexeme (NOUN, ADJ,
 * VERB, INTJ), a governable preposition that cannot be a VERB's separable
 * prefix (or is a bracket twin settled as governed) is governed and so
 * outside its headword; on a VERB Lexeme, a satellite that spells haben,
 * sein or werden is an auxiliary. A Locution's haben or sein is as often
 * its own word (Hunger haben), and its governed preposition may stay inside
 * its headword. Of 193 dev clicks whose guess missed, 74 missed an
 * auxiliary and 42 a governed preposition.
 */
export function guessedJudgment(
	target: Target,
	planned: {
		readonly shape: Shape;
		readonly article: OpeningArticle | undefined;
		readonly verbal:
			| {
					readonly reflexive: Member | undefined;
					readonly prefixes: readonly string[];
					readonly auxiliaries: readonly {
						readonly member: Member;
						readonly uses: readonly string[];
					}[];
			  }
			| undefined;
		readonly tail: { readonly governable: readonly GovernedQuestions[] };
		readonly presetReadings: ReadonlyMap<number, string>;
	},
): Judged {
	const { article, shape } = planned;
	const reflexive = planned.verbal?.reflexive;
	const verbLexeme = shape.lexeme && shape.verbal;
	const auxiliaries = verbLexeme
		? (planned.verbal?.auxiliaries ?? []).flatMap(({ member, uses }) =>
				uses.some((use) =>
					guessedAuxiliaries.has(use.split(" ")[0] ?? ""),
				)
					? [member.position]
					: [],
			)
		: [];
	const governed = guessedGoverned(planned);
	return {
		orthographies: target.members.map(
			(member): MemberOrthography =>
				member.spelling?.orthography ??
				(member === article?.member ? article.orthography : "Standard"),
		),
		outsideHeadword: headwordOutside(
			[
				...(article ? [article.member] : []),
				...(reflexive ? [reflexive] : []),
			],
			governed,
			shape,
		),
		...(auxiliaries.length > 0
			? { auxiliaries: new Set(auxiliaries) }
			: {}),
		readings: new Map(planned.presetReadings),
	};
}

const ignoredForExact = new Set(["judged"]);
const ignoredForOutsideGrowth = new Set(["judged", "outsideHeadword"]);

/** Copy of a draft's input with `dropped` keys removed, for comparing what Luna reads. */
function inputWithout(input: unknown, dropped: ReadonlySet<string>): unknown {
	return isRecord(input)
		? Object.fromEntries(
				Object.entries(input).filter(([key]) => !dropped.has(key)),
			)
		: input;
}

/** The member refs (`m0`, ...) in a draft's `outsideHeadword`, if present. */
function outsideRefsOf(input: unknown): readonly string[] {
	if (!isRecord(input) || !Array.isArray(input.outsideHeadword)) return [];
	return input.outsideHeadword.filter(
		(ref): ref is string => typeof ref === "string",
	);
}

/** Words of a Canonical Form, folded for case-insensitive token comparison. */
const canonicalTokens = (form: string): ReadonlySet<string> =>
	new Set(
		form
			.split(/[\s….,;:!?()[\]"„“«»]+/u)
			.filter((word) => word.length > 0)
			.map(fold),
	);

/**
 * How the judged request compares to the guessed request:
 * - `miss`: jev changed something Luna reads other than adding members to
 *   `outsideHeadword` (e.g. a Typo or Shorthand, fixed spelling, auxiliary,
 *   shrunk `outsideHeadword`, or changed `lemmaCandidates`) — interrupt the
 *   guessed call and rewrite.
 * - `check`: everything else Luna reads is unchanged, and `newlyExcluded`
 *   names any members jev added to `outsideHeadword` — join the guessed call
 *   and keep it if the written headword already omits those words.
 */
export type GuessComparison =
	| { readonly kind: "miss"; readonly reason: string }
	| {
			readonly kind: "check";
			readonly newlyExcluded: readonly number[];
	  };

/** Compares what Luna reads on the guess against what it reads once jev has judged. */
export function compareGuess(
	guessed: LunaDraft,
	judged: LunaDraft,
): GuessComparison {
	if (
		JSON.stringify(guessed.input) ===
		JSON.stringify(inputWithout(judged.input, ignoredForExact))
	)
		return { kind: "check", newlyExcluded: [] };
	if (
		!isRecord(guessed.input) ||
		!isRecord(judged.input) ||
		JSON.stringify(inputWithout(guessed.input, ignoredForOutsideGrowth)) !==
			JSON.stringify(inputWithout(judged.input, ignoredForOutsideGrowth))
	)
		return { kind: "miss", reason: "jev changed what Luna reads" };
	const guessedOutside = new Set(outsideRefsOf(guessed.input));
	const judgedOutside = outsideRefsOf(judged.input);
	const judgedSet = new Set(judgedOutside);
	for (const ref of guessedOutside)
		if (!judgedSet.has(ref))
			return { kind: "miss", reason: "jev changed what Luna reads" };
	const newlyExcluded: number[] = [];
	for (const ref of judgedOutside) {
		if (guessedOutside.has(ref)) continue;
		const match = /^m(\d+)$/u.exec(ref);
		if (!match)
			return { kind: "miss", reason: "jev changed what Luna reads" };
		newlyExcluded.push(Number(match[1]));
	}
	return { kind: "check", newlyExcluded };
}

/**
 * Why a guessed headword cannot stand after jev added `newlyExcluded`
 * members to `outsideHeadword`: `form` still contains one of those
 * members' words (folded case, token-wise).
 */
export function excludedWordMisses(
	target: Target,
	judged: Judged,
	newlyExcluded: readonly number[],
	form: string,
): string | undefined {
	if (newlyExcluded.length === 0) return undefined;
	const tokens = canonicalTokens(form);
	for (const position of newlyExcluded) {
		const member = target.members[position];
		if (!member) continue;
		const fixed = fixedSpelling(member, judged.readings);
		if (
			tokens.has(fold(member.text)) ||
			(fixed !== undefined && tokens.has(fold(fixed)))
		)
			return "jev excluded a member Luna wrote in the headword";
	}
	return undefined;
}
