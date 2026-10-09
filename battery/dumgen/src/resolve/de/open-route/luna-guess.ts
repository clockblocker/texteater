/** Luna's call on a guess at jev's answers, and why the guess can miss. */

import { isRecord } from "common-utils";
import type { LunaDraft } from "../../../luna.js";
import type { Judged } from "../canonical-form.js";
import type { MemberOrthography } from "../member-spelling.js";
import type { Target } from "../target.js";
import type { OpeningArticle } from "./nominal.js";

/**
 * What Luna reads before jev has answered: every member Standard unless
 * the unit or dumcorpus's tables already fix its orthography, the opening
 * article outside the headword, no auxiliary, no governed member, only
 * the readings code fixes, and no judged features.
 */
export function guessedJudgment(
	target: Target,
	planned: {
		readonly article: OpeningArticle | undefined;
		readonly presetReadings: ReadonlyMap<number, string>;
	},
): Judged {
	const { article } = planned;
	return {
		orthographies: target.members.map(
			(member): MemberOrthography =>
				member.spelling?.orthography ??
				(member === article?.member ? article.orthography : "Standard"),
		),
		outsideHeadword: new Set(article ? [article.member.position] : []),
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
