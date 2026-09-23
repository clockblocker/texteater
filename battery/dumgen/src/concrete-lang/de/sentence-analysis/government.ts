/**
 * Preposition government at intake (ADR 0030): for every occurrence that
 * realizes a governable preposition (the preposition itself, a fused word's
 * adposition, or a pronominal adverb), which occurrence in the sentence
 * lexically governs it and, for a two-way preposition, the case the
 * government requires. The questions ride in the one Sentence Analysis call;
 * a sentence without a governable preposition asks nothing.
 */

import type * as Dumrel from "dumrel/types";
import type { Questions } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import { choice } from "../../../universal/questions.js";
import {
	governablePrepositionIn,
	governablePrepositions,
} from "../governable-prepositions.js";
import { type Government, headOf, type LexemeTarget } from "./analysis.js";
import type { Answers } from "./assemble.js";
import type { Placement } from "./placement.js";

export const governmentCriteria = `A word lexically governs a preposition when its meaning selects that preposition for a complement and a learner memorises the pair: warten auf + Acc, bestehen auf + Dat (insist) but bestehen aus + Dat (consist of), stolz auf + Acc, abhängig von + Dat, Angst vor + Dat, Interesse an + Dat, sich bedanken bei + Dat and für + Acc, Bescheid wissen über + Acc. A pronominal adverb (darauf, davon, worüber, hierfür) realizes a governed preposition together with its complement: in freut sich darauf, freut governs darauf. No word governs a free adjunct of place, time, manner, cause or instrument (wartet am Bahnhof, spielt im Garten, schneidet mit dem Messer), a separable verb particle (fängt ... an), or a pronominal adverb used as a connective (darum, danach, damit meaning so that). For a two-way preposition (an, auf, in, über, unter, vor, zwischen), read the case from the complement's form whenever the form shows it: an meine Mutter and auf ihn are accusative, an der Sitzung and vor dem Haus are dative. When the form does not show it, as with a pronominal adverb or a bare noun, give the case the governing word requires with this preposition, not the case a location would take.`;

/** The placed piece of an input Segment that realizes a governable preposition. */
function prepositionPiece(placement: Placement, index: number) {
	for (const piece of placement.pieces.get(index) ?? []) {
		const preposition = governablePrepositionIn(piece.surface);
		if (preposition) return { offset: piece.offset, preposition };
	}
	return null;
}

const label = (sentence: SegmentedSentence<"de">, index: number) =>
	`<s${index}> "${sentence.segments[index]?.text ?? ""}"`;

export function governmentQuestions(
	sentence: SegmentedSentence<"de">,
	placement: Placement,
): Questions {
	const questions: Questions = {};
	for (const index of placement.resolvable) {
		const piece = prepositionPiece(placement, index);
		if (!piece) continue;
		questions[`gov_${index}`] = choice(
			`Under \`government\`, which occurrence in \`sentence\` lexically governs the preposition realized by occurrence ${label(sentence, index)}?`,
			{
				...Object.fromEntries(
					placement.resolvable
						.filter((other) => other !== index)
						.map((other) => [
							`s${other}`,
							`${label(sentence, other)} selects this preposition for its complement`,
						]),
				),
				None: "No word governs it: it is a free adjunct, a separable particle or a connective",
				Unresolved: "Government cannot be defensibly decided",
			},
		);
		if (governablePrepositions[piece.preposition] === null)
			questions[`case_${index}`] = choice(
				`Under \`government\`, which case does the complement of the preposition realized by occurrence ${label(sentence, index)} take here?`,
				{
					Acc: "Accusative",
					Dat: "Dative",
					Unresolved: "The case cannot be defensibly decided",
				},
			);
	}
	return questions;
}

function probabilities(
	answers: Answers,
	id: string,
): Readonly<Record<string, number>> {
	const answer = answers[id];
	return answer?.type === "choice"
		? (answer.probabilities as Readonly<Record<string, number>>)
		: {};
}

/** A word governs a preposition when its occurrences carry at least this much of the governor vote. */
export const governorTau = 0.6;

/**
 * One Government per governed preposition. The governor vote is summed per
 * word, so `nimmt` and `teil` vote together for `teilnehmen`, and the word
 * reaching `governorTau` governs. Failing that, a preposition the Lexeme
 * layer made a verb's `GovernedPreposition` member is governed by that verb.
 * A preposition voted to govern itself and an unresolved case yield nothing.
 */
export function assembleGovernment(
	placement: Placement,
	targets: readonly LexemeTarget[],
	answers: Answers,
): Government[] {
	const targetAt = (offset: number) =>
		targets.find((target) =>
			target.members.some((member) => member.offset === offset),
		);
	const government: Government[] = [];
	for (const index of placement.resolvable) {
		const piece = prepositionPiece(placement, index);
		if (!piece) continue;
		const own = targetAt(piece.offset);
		if (!own) continue;
		const votes = new Map<LexemeTarget, number>();
		for (const [option, share] of Object.entries(
			probabilities(answers, `gov_${index}`),
		)) {
			if (!/^s\d+$/u.test(option)) continue;
			const first = placement.pieces.get(Number(option.slice(1)))?.[0];
			const target = first ? targetAt(first.offset) : undefined;
			if (target) votes.set(target, (votes.get(target) ?? 0) + share);
		}
		let governor = [...votes].find(
			([, share]) => share >= governorTau,
		)?.[0];
		const role = own.members.find(
			(member) => member.offset === piece.offset,
		)?.role;
		if (!governor && role === "GovernedPreposition") governor = own;
		if (!governor || headOf(governor).offset === piece.offset) continue;
		const voted = Object.entries(
			probabilities(answers, `case_${index}`),
		).sort((a, b) => b[1] - a[1])[0]?.[0];
		const governedCase: Dumrel.GovernedCase | null =
			governablePrepositions[piece.preposition] ??
			(voted === "Acc" || voted === "Dat" ? voted : null);
		if (!governedCase) continue;
		government.push({
			offset: piece.offset,
			preposition: piece.preposition,
			case: governedCase,
			governor: governor.id,
		});
	}
	return government;
}
