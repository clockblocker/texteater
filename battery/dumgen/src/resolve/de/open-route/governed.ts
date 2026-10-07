/**
 * The members a head may govern as its preposition, with the cases each may
 * take, the questions that ask whether it does, and their reading.
 */

import {
	germanAdpositionAllowedCases,
	germanAdpositionEntry,
} from "dumcorpus/inventories";
import { fill, question } from "../prompts.js";
import type { Answered, Questionnaire } from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	type AdpCase,
	caseNames,
	fold,
	type Shape,
	spellingOf,
	type Values,
} from "./shape.js";

/** A member that may be the preposition its head governs, with the cases the ADP Case Table lets it take. */
export type Governable = {
	readonly member: Member;
	readonly preposition: string;
	readonly cases: readonly AdpCase[];
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
): readonly Governable[] {
	const governable = shape.governs ? governableMembers(target, taken) : [];
	for (const { member, cases: allowed } of governable) {
		questionnaire.choice(
			`governed_m${member.position}`,
			fill(question.governed, { m: member.ref }),
			{
				Governed: "Yes, the head selects it",
				Free: question.governedFree,
			},
			["government"],
		);
		if (!shape.governor) continue;
		if (allowed.length > 1)
			questionnaire.choice(
				`governedCase_m${member.position}`,
				fill(question.governedCase, { m: member.ref }),
				Object.fromEntries(
					allowed.map((value) => [value, caseNames[value]]),
				),
			);
		questionnaire.choice(
			`governedReferent_m${member.position}`,
			fill(question.governedReferent, { m: member.ref }),
			{
				Someone: "A person or people",
				Something: "A thing, place, event, fact or idea",
				Either: "Either: the sentence leaves it open or it names both",
			},
		);
	}
	return governable;
}

/**
 * Reads which members the head governs: their positions, and a governor's
 * valency evidence for each.
 */
export function readGoverned(
	governable: readonly Governable[],
	shape: Shape,
	answered: Answered,
): {
	readonly governed: readonly Values[];
	readonly governedPositions: readonly number[];
} {
	const governed: Values[] = [];
	const governedPositions: number[] = [];
	for (const chosen of governable) {
		const position = chosen.member.position;
		if (answered.pick(`governed_m${position}`) !== "Governed") continue;
		governedPositions.push(position);
		if (!shape.governor) continue;
		const governedCase =
			chosen.cases.length === 1
				? chosen.cases[0]
				: answered.pick(`governedCase_m${position}`);
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
					answered.peek(`governedReferent_m${position}`) ?? "Either",
			},
			realizedCase: governedCase,
		});
	}
	return { governed, governedPositions };
}
