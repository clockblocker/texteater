/**
 * Preposition slots at intake (ADR 0030, ADR 0034): for every occurrence
 * that realizes a governable preposition (the preposition itself, a fused
 * word's adposition, or a pronominal adverb), which occurrence in the
 * sentence lexically governs it, for a two-way preposition the case the
 * government requires, and whether the complement names a person or a thing.
 * The questions ride in the one Sentence Analysis call; a sentence without a
 * governable preposition asks nothing.
 */

import type { Questions } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import { choice } from "../../../universal/questions.js";
import {
	governablePrepositionIn,
	governablePrepositionLemma,
	governablePrepositions,
	isGovernablePreposition,
} from "../governable-prepositions.js";
import {
	headOf,
	type LexemeTarget,
	type PhrasemeTarget,
	type PrepositionComplement,
	type Slot,
} from "./analysis.js";
import type { Answers } from "./assemble.js";
import type { Placement } from "./placement.js";

export const governmentCriteria = `A word lexically governs a preposition when its meaning selects that preposition for a complement and a learner memorises the pair: warten auf + Acc, bestehen auf + Dat (insist) but bestehen aus + Dat (consist of), stolz auf + Acc, abhängig von + Dat, Angst vor + Dat, Interesse an + Dat, sich bedanken bei + Dat and für + Acc, Bescheid wissen über + Acc. A pronominal adverb (darauf, davon, worüber, hierfür) realizes a governed preposition together with its complement: in freut sich darauf, freut governs darauf. No word governs a free adjunct of place, time, manner, cause or instrument (wartet am Bahnhof, spielt im Garten, schneidet mit dem Messer), a separable verb particle (fängt ... an), or a pronominal adverb used as a connective (darum, danach, damit meaning so that). For a two-way preposition (an, auf, in, über, unter, vor, zwischen), read the case from the complement's form whenever the form shows it: an meine Mutter and auf ihn are accusative, an der Sitzung and vor dem Haus are dative. When the form does not show it, as with a pronominal adverb or a bare noun, give the case the governing word requires with this preposition, not the case a location would take.`;

/**
 * The placed piece of an input Segment that realizes a governable
 * preposition, and whether it is a pronominal adverb, which realizes the
 * preposition's filler too.
 */
function prepositionPiece(placement: Placement, index: number) {
	for (const piece of placement.pieces.get(index) ?? []) {
		const preposition = governablePrepositionIn(piece.surface);
		if (preposition)
			return {
				offset: piece.offset,
				preposition,
				adverb: !isGovernablePreposition(
					piece.surface.normalize("NFC").toLocaleLowerCase("de"),
				),
			};
	}
	return null;
}

const label = (sentence: SegmentedSentence<"de">, index: number) =>
	`<s${index}> "${sentence.segments[index]?.text ?? ""}"`;

/**
 * Intake asks only about prepositions; bare-case slots come from the Knowledge
 * call's frame (ADR 0034). Widening to bare Dat/Gen objects is tracked in
 * https://github.com/clockblocker/texteater/issues/609.
 */
export function slotQuestions(
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
		// A pronominal adverb's filler is always a thing, so it asks nothing.
		if (!piece.adverb)
			questions[`ref_${index}`] = choice(
				`Under \`government\`, does the complement of the preposition realized by occurrence ${label(sentence, index)} name a person or a thing here?`,
				{
					Someone: "A person or a group of people",
					Something:
						"A thing, place, event, fact, idea or anything that is not a person",
					Unresolved: "What it names cannot be defensibly decided",
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

function top(answers: Answers, id: string): string | undefined {
	return Object.entries(probabilities(answers, id)).sort(
		(a, b) => b[1] - a[1],
	)[0]?.[0];
}

/** A word governs a preposition when its occurrences carry at least this much of the governor vote. */
export const governorTau = 0.6;

/**
 * One Slot per governed preposition. The governor vote is summed per word,
 * so `nimmt` and `teil` vote together for `teilnehmen`, and the word reaching
 * `governorTau` governs. Failing that, a preposition the Lexeme layer made a
 * verb's `GovernedPreposition` member is governed by that verb, and failing
 * that, the vote summed over a Phraseme's words lets the expression govern
 * (`mit … nichts zu tun haben`, the vote split between `tun` and `haben`). A
 * preposition voted to govern itself and an unresolved case yield nothing;
 * an unresolved referent is `Either`.
 */
export function assembleSlots(
	placement: Placement,
	targets: readonly LexemeTarget[],
	answers: Answers,
	phrasemes: readonly PhrasemeTarget[] = [],
): Slot[] {
	const targetAt = (offset: number) =>
		targets.find((target) =>
			target.members.some((member) => member.offset === offset),
		);
	const slots: Slot[] = [];
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
		if (governor && headOf(governor).offset === piece.offset) continue;
		const expression = governor
			? undefined
			: phrasemes.find(
					(phraseme) =>
						!phraseme.members.includes(own.id) &&
						[...votes]
							.filter(([target]) =>
								phraseme.members.includes(target.id),
							)
							.reduce((sum, [, share]) => sum + share, 0) >=
							governorTau,
				);
		const governorId = governor?.id ?? expression?.id;
		if (!governorId) continue;
		const voted = top(answers, `case_${index}`);
		const governedCase: PrepositionComplement["case"] | null =
			governablePrepositions[piece.preposition] ??
			(voted === "Acc" || voted === "Dat" ? voted : null);
		if (!governedCase) continue;
		const referent = piece.adverb
			? "Something"
			: top(answers, `ref_${index}`);
		slots.push({
			governor: governorId,
			marker: piece.adverb ? null : piece.offset,
			filler: piece.adverb ? own.id : null,
			complement: {
				kind: "Preposition",
				preposition: governablePrepositionLemma(piece.preposition),
				case: governedCase,
				referent:
					referent === "Someone" || referent === "Something"
						? referent
						: "Either",
			},
			realizedCase: governedCase,
		});
	}
	return slots;
}
