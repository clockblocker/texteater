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
	/** Whether the head governs it; none when code knows it does (`bracketTwins`). */
	readonly governed: ChoiceOf<typeof options.governed> | undefined;
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

/**
 * A VERB Lexeme's twin prepositions: one preposition spelled by two or more
 * of its members, as in Pass auf dich auf. Segmentation lets a clause hold
 * the same preposition twice in one VERB unit only by its `bracket-particle`
 * rule: the last one closes the verb's bracket as its separable particle,
 * and each earlier one joined only because it heads the phrase the verb
 * governs (de/bracket-particle-or-circumposition,
 * de/governed-preposition-joins-its-governor). So the last twin is never
 * asked as a governed preposition and the earlier ones are governed
 * without asking; only their case and referent are asked. The answer is
 * each twin's position: "Particle" for the last, "Governed" for the others.
 */
function bracketTwins(
	governable: readonly Governable[],
	shape: Shape,
): ReadonlyMap<number, "Particle" | "Governed"> {
	const twins = new Map<number, "Particle" | "Governed">();
	if (!shape.verbal || !shape.lexeme) return twins;
	const byPreposition = new Map<string, Governable[]>();
	for (const chosen of governable)
		byPreposition.set(chosen.preposition, [
			...(byPreposition.get(chosen.preposition) ?? []),
			chosen,
		]);
	for (const group of byPreposition.values()) {
		if (group.length < 2) continue;
		const ordered = [...group].sort(
			(left, right) => left.member.segment - right.member.segment,
		);
		const last = ordered.at(-1);
		for (const chosen of ordered)
			twins.set(
				chosen.member.position,
				chosen === last ? "Particle" : "Governed",
			);
	}
	return twins;
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
 * and what its complement refers to. A VERB's twin prepositions are read
 * by `bracketTwins` instead.
 */
export function askGoverned(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	taken: ReadonlySet<number>,
): readonly GovernedQuestions[] {
	const members = shape.governs ? governableMembers(target, taken) : [];
	const twins = bracketTwins(members, shape);
	const governable = members.filter(
		({ member }) => twins.get(member.position) !== "Particle",
	);
	return governable.map((chosen) => {
		const { member, cases: allowed } = chosen;
		const governed =
			twins.get(member.position) === "Governed"
				? undefined
				: questionnaire.choice(
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
		if (
			chosen.governed !== undefined &&
			answered.pick(chosen.governed) !== "Governed"
		)
			continue;
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

/**
 * Whether a VERB's prefix is a preposition it governs, and so no prefix
 * (Rule de/verb-core-features: warten auf is warten): every member that
 * carries the prefix, by spelling it or opening its own word with it as
 * `prefixCandidates` offers it, is governed. A twin closing the bracket
 * after a governed one, or the verb's own word, keeps it: Pass auf dich
 * auf, dass er auf sie aufpasst.
 */
export function governedPrefix(
	target: Target,
	governable: readonly GovernedQuestions[],
	answered: Answered,
): (prefix: string) => boolean {
	const governedAt = new Set(
		governable.flatMap((chosen) =>
			chosen.governed === undefined ||
			answered.peek(chosen.governed) === "Governed"
				? [chosen.member.position]
				: [],
		),
	);
	const carries = (member: Member, prefix: string) => {
		const word = fold(spellingOf(member));
		return (
			word === prefix ||
			(word.length >= prefix.length + 2 && word.startsWith(prefix))
		);
	};
	return (prefix) => {
		const carrying = target.members.filter((member) =>
			carries(member, prefix),
		);
		return (
			carrying.length > 0 &&
			carrying.every((member) => governedAt.has(member.position))
		);
	};
}
