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
	answerReader,
	type Choice,
	type ChoiceOf,
	optionsOf,
	type Questionnaire,
	type ReaderBody,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import { heldPreposition } from "./pronominal-adverb.js";
import {
	type AdpCase,
	fold,
	type Shape,
	spellingOf,
	type ValencyEvidence,
} from "./shape.js";

/**
 * A member that may be the preposition its head governs, with the cases the
 * ADP Case Table lets it take; `adverb` when the member is a pronominal
 * adverb holding it (`damit` holds `mit`).
 */
type Governable = {
	readonly member: Member;
	readonly preposition: string;
	readonly cases: readonly AdpCase[];
	readonly adverb: boolean;
};

/** A member that may be its head's preposition, and the questions asked of it. */
export type GovernedQuestions = Governable & {
	/** Whether the head governs it; none when code knows it does (`bracketTwins`). */
	readonly governed: ChoiceOf<typeof options.governed> | undefined;
	/** A governor's case question, when the table lets the preposition take more than one. */
	readonly governedCase: Choice<AdpCase> | undefined;
	/** A governor's question of what the complement refers to; none for a pronominal adverb. */
	readonly governedReferent:
		| ChoiceOf<typeof options.governedReferent>
		| undefined;
};

/**
 * Whether the member after `member` follows it with no word between: a
 * preposition there heads that fixed word, never an open slot (`zu tun`,
 * `an die Wand`).
 */
function headsNextMember(target: Target, member: Member): boolean {
	const next = target.members[member.position + 1];
	return (
		next !== undefined &&
		!target.segments
			.slice(member.segment + 1, next.segment)
			.some((segment) => segment.kind === "ResolvableText")
	);
}

/**
 * The members that may be the head's preposition: one the ADP Case Table
 * lists, or, in a governing Locution, a pronominal adverb holding one,
 * which can only mark the slot of a preposition in the Locution's wording
 * (de/pronominal-adverb-stands-alone). A preposition right before another
 * member heads that member and is never asked; a pronominal adverb holds
 * its own complement.
 */
function governableMembers(
	target: Target,
	skip: ReadonlySet<number>,
	shape: Shape,
): readonly Governable[] {
	if (target.members.length < 2) return [];
	return target.members.flatMap((member): Governable[] => {
		const whole =
			member.spelling?.orthography === "Fused" &&
			member.spelling.written !== undefined;
		if (skip.has(member.position) || whole) return [];
		const preposition = fold(spellingOf(member));
		const entry = germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: preposition,
		});
		if (entry)
			return headsNextMember(target, member)
				? []
				: [
						{
							member,
							preposition,
							cases: germanAdpositionAllowedCases(entry),
							adverb: false,
						},
					];
		const held =
			shape.locution && shape.governor
				? heldPreposition(preposition)
				: undefined;
		return held ? [{ member, ...held, adverb: true }] : [];
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
 * The question whether the head governs `chosen`; of a pronominal adverb,
 * whether the preposition it holds is a fixed word heading the
 * expression's open slot.
 */
function governedChoice(
	questionnaire: Questionnaire,
	chosen: Governable,
): ChoiceOf<typeof options.governed> {
	const { member } = chosen;
	return questionnaire.choice(
		`governed_m${member.position}`,
		chosen.adverb
			? fill(question.governedAdverb, {
					m: member.ref,
					p: chosen.preposition,
				})
			: fill(question.governed, { m: member.ref }),
		chosen.adverb ? options.governedAdverb : options.governed,
		["government"],
	);
}

/**
 * Asks, of each member no satellite `taken` that may be a preposition,
 * whether the head governs it; of a governor's, also the case it governs
 * and what its complement refers to, which a pronominal adverb's da-
 * settles as a thing. A VERB's twin prepositions are read by
 * `bracketTwins` instead.
 */
export function askGoverned(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	taken: ReadonlySet<number>,
): readonly GovernedQuestions[] {
	const members = shape.governs
		? governableMembers(target, taken, shape)
		: [];
	const twins = bracketTwins(members, shape);
	const governable = members.filter(
		({ member }) => twins.get(member.position) !== "Particle",
	);
	return governable.map((chosen) => {
		const { member, cases: allowed } = chosen;
		const governed =
			twins.get(member.position) === "Governed"
				? undefined
				: governedChoice(questionnaire, chosen);
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
		const governedReferent = chosen.adverb
			? undefined
			: questionnaire.choice(
					`governedReferent_m${member.position}`,
					fill(question.governedReferent, { m: member.ref }),
					options.governedReferent,
				);
		return { ...chosen, governed, governedCase, governedReferent };
	});
}

/** The ADP Lemma of a governed preposition. */
export const prepositionLemma = (canonicalForm: string) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm,
		coreFeatures: {},
	}) as const;

/** A member the head governs, and the preposition it is or holds. */
export type GovernedMember = {
	readonly member: Member;
	readonly preposition: string;
	readonly adverb: boolean;
};

/**
 * Reads which members the head governs, and a governor's valency evidence
 * for each. A pronominal adverb's complement is a thing.
 */
export const readGoverned = answerReader(function* (
	governable: readonly GovernedQuestions[],
	shape: Shape,
	answered: Answered,
): ReaderBody<{
	readonly governed: readonly ValencyEvidence[];
	readonly governedMembers: readonly GovernedMember[];
}> {
	const governed: ValencyEvidence[] = [];
	const governedMembers: GovernedMember[] = [];
	for (const chosen of governable) {
		if (
			chosen.governed !== undefined &&
			(yield* answered.pick(chosen.governed)) !== "Governed"
		)
			continue;
		const { member, preposition, adverb } = chosen;
		governedMembers.push({ member, preposition, adverb });
		if (!shape.governor) continue;
		const [only] = chosen.cases;
		const governedCase = chosen.governedCase
			? yield* answered.pick(chosen.governedCase)
			: only;
		if (governedCase === undefined)
			throw Error(`The ADP Case Table lets ${preposition} take no case`);
		governed.push({
			member: member.position,
			complement: {
				kind: "Preposition",
				preposition: prepositionLemma(preposition),
				governedCase,
				referent: adverb
					? "Something"
					: ((chosen.governedReferent &&
							answered.peek(chosen.governedReferent)) ??
						"Either"),
			},
			realizedCase: governedCase,
		});
	}
	return { governed, governedMembers };
});

/**
 * Whether a governed member stays outside the Lemma, as a Lexeme's always
 * does. A Locution's stays in it when its Canonical Form holds the
 * preposition, as one of its words or inside a pronominal adverb (`mit`
 * of `mit zu tun haben`, `für` of `nichts dafür können`): then it is a
 * fixed word that heads the open slot (system ADR 0056).
 */
function outsideLemma(
	governed: GovernedMember,
	shape: Shape,
	canonicalForm: string,
): boolean {
	if (!(shape.locution && shape.governor)) return true;
	return !canonicalForm
		.split(" ")
		.some(
			(word) =>
				fold(word) === governed.preposition ||
				heldPreposition(word)?.preposition === governed.preposition,
		);
}

/**
 * The members outside the headword: the satellites `outside` names (an
 * owned article, a lexical reflexive) and a Lexeme's governed members. A
 * Locution's governed member may be one of its fixed words, which Luna's
 * Canonical Form tells.
 */
export function headwordOutside(
	outside: readonly Member[],
	governed: readonly GovernedMember[],
	shape: Shape,
): Set<number> {
	return new Set([
		...outside.map(({ position }) => position),
		...(shape.locution && shape.governor
			? []
			: governed.map(({ member }) => member.position)),
	]);
}

/** The members the Surface leaves out: the headword's, and the governed ones the Lemma lacks. */
export const outsideSurface = (
	outsideHeadword: ReadonlySet<number>,
	governed: readonly GovernedMember[],
	shape: Shape,
	canonicalForm: string,
): ReadonlySet<number> =>
	new Set([
		...outsideHeadword,
		...governed.flatMap((member) =>
			outsideLemma(member, shape, canonicalForm)
				? [member.member.position]
				: [],
		),
	]);

/** The readings a governed pronominal adverb gives: the preposition it holds. */
export const adverbReadings = (governed: readonly GovernedMember[]) =>
	new Map(
		governed.flatMap(({ member, preposition, adverb }) =>
			adverb ? [[member.segment, preposition] as const] : [],
		),
	);

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
