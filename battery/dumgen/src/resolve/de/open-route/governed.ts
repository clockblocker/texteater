/**
 * The members a head may govern as its preposition, with the cases each may
 * take, the questions that ask whether it does, and their reading.
 */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import { fill, options, question } from "../prompts.js";
import {
	type Answered,
	type Choice,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	type AdpCase,
	fold,
	type Shape,
	spellingOf,
	type ValencyEvidence,
} from "./shape.js";

/** A member that may be the preposition its head governs, with the cases the ADP Case Table lets it take. */
type Governable = {
	readonly member: Member;
	readonly preposition: string;
	readonly cases: readonly AdpCase[];
};

/** A member that may be its head's preposition, and the questions asked of it. */
export type GovernedQuestions = Governable & {
	readonly governed: ChoiceOf<typeof options.governed>;
	/** A governor's case question, when the table lets the preposition take more than one. */
	readonly governedCase: Choice<AdpCase> | undefined;
	/** A governor's question of what the complement refers to. */
	readonly governedReferent:
		| ChoiceOf<typeof options.governedReferent>
		| undefined;
};

function governableMembers(
	target: Target,
	skip: ReadonlySet<number>,
): readonly Governable[] {
	if (target.members.length < 2) return [];
	return target.members.flatMap((member) => {
		const whole =
			member.spelling?.orthography === "Fused" &&
			member.spelling.written !== undefined;
		if (skip.has(member.position) || whole) return [];
		const preposition = fold(spellingOf(member));
		const entry = germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: preposition,
		});
		return entry
			? [
					{
						member,
						preposition,
						cases: germanAdpositionAllowedCases(entry),
					},
				]
			: [];
	});
}

/** Coordinating conjunctions, which never open a preposition's complement. */
export const coordinators = new Set([
	"und",
	"oder",
	"aber",
	"sondern",
	"denn",
	"sowie",
]);

/**
 * Asks, of each member no satellite `taken` that may be a preposition,
 * whether the head governs it; of a governor's, also the case it governs
 * and what its complement refers to.
 */
export function askGoverned(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	taken: ReadonlySet<number>,
): readonly GovernedQuestions[] {
	const governable = shape.governs ? governableMembers(target, taken) : [];
	return governable.map((chosen) => {
		const { member, cases: allowed } = chosen;
		const governed = questionnaire.choice(
			`governed_m${member.position}`,
			fill(question.governed, { m: member.ref }),
			options.governed,
			["government"],
		);
		if (!shape.governor)
			return {
				...chosen,
				governed,
				governedCase: undefined,
				governedReferent: undefined,
			};
		const governedCase =
			allowed.length > 1
				? questionnaire.choice(
						`governedCase_m${member.position}`,
						fill(question.governedCase, { m: member.ref }),
						optionsOf(allowed, options.case),
					)
				: undefined;
		const governedReferent = questionnaire.choice(
			`governedReferent_m${member.position}`,
			fill(question.governedReferent, { m: member.ref }),
			options.governedReferent,
		);
		return { ...chosen, governed, governedCase, governedReferent };
	});
}

/**
 * Reads which members the head governs: their positions, and a governor's
 * valency evidence for each.
 */
export function readGoverned(
	governable: readonly GovernedQuestions[],
	shape: Shape,
	answered: Answered,
): {
	readonly governed: readonly ValencyEvidence[];
	readonly governedPositions: readonly number[];
} {
	const governed: ValencyEvidence[] = [];
	const governedPositions: number[] = [];
	for (const chosen of governable) {
		const position = chosen.member.position;
		if (answered.pick(chosen.governed) !== "Governed") continue;
		governedPositions.push(position);
		if (!shape.governor) continue;
		const [only] = chosen.cases;
		const governedCase = chosen.governedCase
			? answered.pick(chosen.governedCase)
			: only;
		if (governedCase === undefined)
			throw Error(
				`The ADP Case Table lets ${chosen.preposition} take no case`,
			);
		governed.push({
			member: position,
			complement: {
				kind: "Preposition",
				preposition: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "ADP",
					canonicalForm: chosen.preposition,
					coreFeatures: {},
				},
				governedCase,
				referent:
					(chosen.governedReferent &&
						answered.peek(chosen.governedReferent)) ??
					"Either",
			},
			realizedCase: governedCase,
		});
	}
	return { governed, governedPositions };
}
