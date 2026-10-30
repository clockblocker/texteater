/**
 * A free pronominal adverb in the governor's clause (Rule
 * de/pronominal-adverb-stands-alone): `darauf` in *wartet darauf* is an ADV
 * unit of its own, and when it stands for the complement of a preposition
 * the head selects, the head's valency evidence records that preposition
 * with no member. One question asks this of each such adverb.
 */

import { fill, options, question } from "../prompts.js";
import {
	type Answered,
	answerReader,
	type Choice,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
	type ReaderBody,
} from "../questions.js";
import type { Target } from "../target.js";
import { prepositionLemma } from "./governed.js";
import { type HeldPreposition, heldPreposition } from "./pronominal-adverb.js";
import type { AdpCase, Shape, ValencyEvidence } from "./shape.js";

/** A free pronominal adverb in the clause, and the questions asked of it. */
export type FreeAdverbQuestions = HeldPreposition & {
	readonly segment: number;
	readonly governed: ChoiceOf<typeof options.freeGoverned>;
	/** The case, when the preposition may take more than one. */
	readonly governedCase: Choice<AdpCase> | undefined;
};

/** Punctuation that ends a clause. */
const clauseMark = /^[,;:.!?()–—…]+$/u;

/**
 * The Segments of the unit's clause: from the last clause mark before its
 * first member to the first one after its last.
 */
function clauseOf(target: Target): readonly number[] {
	const { segments, members } = target;
	const first = members[0]?.segment ?? 0;
	const last = members.at(-1)?.segment ?? first;
	const ends = (index: number) => {
		const segment = segments[index];
		return segment?.kind === "Punctuation" && clauseMark.test(segment.text);
	};
	let start = first;
	while (start > 0 && !ends(start - 1)) start--;
	let end = last;
	while (end < segments.length - 1 && !ends(end + 1)) end++;
	return Array.from(
		{ length: end - start + 1 },
		(_, offset) => start + offset,
	);
}

/**
 * Asks, of each one-word pronominal adverb in a governor's clause that is
 * no member of the unit, whether it fills the slot of a preposition the
 * head selects, and the case it takes there when it may take more than one.
 */
export function askFreeAdverbs(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
): readonly FreeAdverbQuestions[] {
	if (!shape.governor) return [];
	const members = new Set(target.members.map(({ segment }) => segment));
	const head = JSON.stringify(
		target.members.map(({ text }) => text).join(" "),
	);
	return clauseOf(target).flatMap((segment) => {
		const value = target.segments[segment];
		if (value?.kind !== "ResolvableText" || members.has(segment)) return [];
		const held = heldPreposition(value.text);
		if (!held) return [];
		const ref = JSON.stringify(value.text);
		const governed = questionnaire.choice(
			`freeGoverned_s${segment}`,
			fill(question.freeGoverned, {
				s: ref,
				p: held.preposition,
				h: head,
			}),
			options.freeGoverned,
			["freeAdverb"],
		);
		const governedCase =
			held.cases.length > 1
				? questionnaire.choice(
						`freeGovernedCase_s${segment}`,
						fill(question.freeGovernedCase, {
							s: ref,
							p: held.preposition,
						}),
						optionsOf(held.cases, options.case),
					)
				: undefined;
		return [{ ...held, segment, governed, governedCase }];
	});
}

/**
 * The evidence the free adverbs give: each one the head governs is its
 * preposition with no member, its complement a thing.
 */
export const readFreeAdverbs = answerReader(function* (
	adverbs: readonly FreeAdverbQuestions[],
	answered: Answered,
): ReaderBody<readonly ValencyEvidence[]> {
	const evidence: ValencyEvidence[] = [];
	for (const adverb of adverbs) {
		if ((yield* answered.pick(adverb.governed)) !== "Governed") continue;
		const [only] = adverb.cases;
		const governedCase = adverb.governedCase
			? yield* answered.pick(adverb.governedCase)
			: only;
		if (governedCase === undefined)
			throw Error(
				`The ADP Case Table lets ${adverb.preposition} take no case`,
			);
		evidence.push({
			member: null,
			complement: {
				kind: "Preposition",
				preposition: prepositionLemma(adverb.preposition),
				governedCase,
				referent: "Something",
			},
			realizedCase: governedCase,
		});
	}
	return evidence;
});
