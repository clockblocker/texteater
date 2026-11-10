/** Luna's call on a guess at jev's answers, and why the guess can miss. */

import { isRecord } from "common-utils";
import type { LunaDraft } from "../../../luna.js";
import type { Judged } from "../canonical-form.js";
import type { MemberOrthography } from "../member-spelling.js";
import type { Member, Target } from "../target.js";
import { type Governable, headwordOutside } from "./governed.js";
import type { OpeningArticle } from "./nominal.js";
import { fold, type Shape, spellingOf } from "./shape.js";

/** The auxiliaries a satellite of these spellings is guessed to be, never a main verb. */
const guessedAuxiliaries = new Set(["haben", "sein", "werden"]);

/**
 * What Luna reads before jev has answered: every member Standard unless
 * the unit or dumcorpus's tables already fix its orthography, the opening
 * article and a lexical reflexive outside the headword, only the readings
 * code fixes, and no judged features. Where jev's answer is all but
 * certain, a VERB Lexeme's guess takes it: a satellite that spells
 * haben, sein or werden is an auxiliary, and a preposition that cannot be
 * its separable prefix is governed and so outside its headword. A
 * Locution's haben or sein is as often its own word (Hunger haben). Of 193 dev clicks whose guess missed, 74
 * missed an auxiliary and 42 a governed preposition.
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
		readonly tail: { readonly governable: readonly Governable[] };
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
	// A preposition that may be the verb's separable prefix is left to jev.
	const prefixes = new Set(planned.verbal?.prefixes ?? []);
	const governed = verbLexeme
		? planned.tail.governable.filter(
				({ member }) => !prefixes.has(fold(spellingOf(member))),
			)
		: [];
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

/**
 * Why Luna's answer to the guess cannot stand once jev has judged, or
 * undefined when it can: the request jev's answers make reads otherwise,
 * judged features aside, as for a Typo or Shorthand, another fixed
 * spelling, an auxiliary or a governed member.
 */
export function guessMisses(
	guessed: LunaDraft,
	judged: LunaDraft,
): string | undefined {
	const read = isRecord(judged.input)
		? Object.fromEntries(
				Object.entries(judged.input).filter(
					([key]) => key !== "judged",
				),
			)
		: judged.input;
	return JSON.stringify(guessed.input) === JSON.stringify(read)
		? undefined
		: "jev changed what Luna reads";
}
