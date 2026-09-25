/**
 * Preposition slots at intake (ADR 0030, ADR 0034): for every occurrence
 * that realizes a governable preposition (the preposition itself, a fused
 * word's adposition, or a pronominal adverb), which occurrence in the
 * sentence lexically governs it, for a two-way preposition the case the
 * government requires, whether the complement names a person or a thing, and
 * whether the governing word keeps the government on its own or only inside
 * an expression. The questions ride in the one Sentence Analysis call; a
 * sentence without a governable preposition asks nothing.
 */

import type * as Dumling from "dumling/types";
import { allowedComplementKinds } from "dumrel";
import type { Questions } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import { choice } from "../../../universal/questions.js";
import {
	fixedCaseOf,
	governablePrepositionIn,
	governablePrepositionLemma,
	isGovernablePreposition,
} from "../governable-prepositions.js";
import {
	effectiveRoute,
	headOf,
	type LexemeTarget,
	type PhrasemeTarget,
	type PrepositionComplement,
	type Slot,
	selectPhrasemeKind,
} from "./analysis.js";
import type { Answers } from "./assemble.js";
import type { Placement } from "./placement.js";

export const governmentCriteria = `A word lexically governs a preposition when its meaning selects that preposition for a complement and a learner memorises the pair: warten auf + Acc, bestehen auf + Dat (insist) but bestehen aus + Dat (consist of), stolz auf + Acc, abhängig von + Dat, Angst vor + Dat, Interesse an + Dat, sich bedanken bei + Dat and für + Acc, Bescheid wissen über + Acc. A pronominal adverb (darauf, davon, worüber, hierfür) realizes a governed preposition together with its complement: in freut sich darauf, freut governs darauf. No word governs a free adjunct of place, time, manner, cause or instrument (wartet am Bahnhof, spielt im Garten, schneidet mit dem Messer), a separable verb particle (fängt ... an), or a pronominal adverb used as a connective (darum, danach, damit meaning so that). For a two-way preposition (an, auf, in, über, unter, vor, zwischen), read the case from the complement's form whenever the form shows it: an meine Mutter and auf ihn are accusative, an der Sitzung and vor dem Haus are dative. When the form does not show it, as with a pronominal adverb or a bare noun, give the case the governing word requires with this preposition, not the case a location would take. A word keeps its government on its own when the pair means the same without any expression around it: Angst vor also in aus Angst vor Hunden, so it keeps it inside Angst haben vor, and stolz auf keeps it beside a copula. A word inside an expression governs only through the expression when it has another sense alone: Bescheid means being informed only in Bescheid wissen or Bescheid geben, and Bescheid über alone is an official notice.`;

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
		if (fixedCaseOf(piece.preposition) === null)
			questions[`case_${index}`] = choice(
				`Under \`government\`, which case does the complement of the preposition realized by occurrence ${label(sentence, index)} take here?`,
				{
					Acc: "Accusative",
					Dat: "Dative",
					Unresolved: "The case cannot be defensibly decided",
				},
			);
		questions[`scope_${index}`] = choice(
			`Under \`government\`, does the word that governs the preposition realized by occurrence ${label(sentence, index)} govern it in this sense on its own, or only inside a multiword expression it belongs to here?`,
			{
				Word: "The word governs it in this sense on its own, also where it stands inside an expression (stolz auf, Angst vor, Angst haben vor)",
				Expression:
					"The word governs it only inside the expression around it and has another sense alone (Bescheid wissen über)",
				Unresolved:
					"No word governs it, or the scope cannot be defensibly decided",
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
 * Whether a route's Valency Frame holds a Preposition slot, by Dumrel's
 * valency policy (ADR 0034): VERB, ADJ and NOUN Lexemes, Collocations and
 * Idioms.
 */
export function takesPreposition(route: {
	readonly family: string;
	readonly kind: string;
}): boolean {
	return allowedComplementKinds({
		language: "de",
		...route,
	} as Pick<Dumling.Lemma, "language" | "family" | "kind">).includes(
		"Preposition",
	);
}

/** Routes whose preposition is a fixed part: infinitive zu, and um, ohne or statt … zu. */
const fixedPartKinds = new Set(["PART", "SCONJ"]);

/**
 * One Slot per governed preposition. Fixed parts are not slots (ADR 0034):
 * a separable particle (`hört … auf`), the zu of an infinitive or of `um …
 * zu`, and a Phraseme's wording (`zu` in `zur Verfügung stellen`) yield
 * nothing, and only a route whose frame takes a preposition governs one.
 * The governor vote is summed per word, so `nimmt` and `teil` vote together
 * for `teilnehmen`, and the word reaching `governorTau` governs. Failing
 * that, a preposition the Lexeme layer made a word's `GovernedPreposition`
 * member is governed by that word, and failing that, the vote summed over a
 * Phraseme's words lets the expression govern (`mit … nichts zu tun haben`,
 * the vote split between `tun` and `haben`). A governing word inside a
 * Phraseme hands the slot to the Phraseme when it governs only inside it
 * (`Bescheid wissen über`, ADR 0034); a word that keeps the government alone
 * keeps the slot (`Angst vor` inside `Angst haben`). A preposition voted to
 * govern itself and an unresolved case yield nothing; an unresolved referent
 * is `Either`.
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
	const governs = (target: LexemeTarget) =>
		takesPreposition(effectiveRoute(target));
	const expressionGoverns = (phraseme: PhrasemeTarget) =>
		takesPreposition({
			family: "Phraseme",
			kind: selectPhrasemeKind({ targets }, phraseme).kind,
		});
	const slots: Slot[] = [];
	for (const index of placement.resolvable) {
		const piece = prepositionPiece(placement, index);
		if (!piece) continue;
		const own = targetAt(piece.offset);
		if (!own) continue;
		const role = own.members.find(
			(member) => member.offset === piece.offset,
		)?.role;
		if (
			role === "SeparableParticle" ||
			fixedPartKinds.has(effectiveRoute(own).kind)
		)
			continue;
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
			([target, share]) => share >= governorTau && governs(target),
		)?.[0];
		if (!governor && role === "GovernedPreposition" && governs(own))
			governor = own;
		if (governor && headOf(governor).offset === piece.offset) continue;
		// A preposition in a Phraseme's fixed word is its wording, unless that
		// word is the governor that took it in (`Bescheid über`).
		if (
			own !== governor &&
			phrasemes.some((phraseme) => phraseme.members.includes(own.id))
		)
			continue;
		const around = governor
			? phrasemes.find(
					(phraseme) =>
						phraseme.members.includes(governor.id) &&
						expressionGoverns(phraseme),
				)
			: undefined;
		const expression = governor
			? around && top(answers, `scope_${index}`) === "Expression"
				? around
				: undefined
			: phrasemes.find(
					(phraseme) =>
						expressionGoverns(phraseme) &&
						[...votes]
							.filter(([target]) =>
								phraseme.members.includes(target.id),
							)
							.reduce((sum, [, share]) => sum + share, 0) >=
							governorTau,
				);
		const governorId = expression?.id ?? governor?.id;
		if (!governorId) continue;
		const voted = top(answers, `case_${index}`);
		const governedCase: PrepositionComplement["case"] | null =
			fixedCaseOf(piece.preposition) ??
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
