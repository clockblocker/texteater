/**
 * The questions every open route's first request asks around its shape's
 * block, and their reading. The head asks a member's Typo or Shorthand,
 * the spelling, an archaic form, the word a fused piece or a shortened
 * member stands for, and a citation. The tail asks an answer word, a
 * Foreign word's source language, coverage, and the prepositions the head
 * governs.
 */

import type * as Dumling from "dumling/types";
import { ambiguousPieces, type MemberOrthography } from "../member-spelling.js";
import { fill, options, question } from "../prompts.js";
import {
	type Answered,
	type Choice,
	type ChoiceOf,
	type Questionnaire,
	UnresolvedAnswer,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import {
	askGoverned,
	type GovernedQuestions,
	readGoverned,
} from "./governed.js";
import type { OpeningArticle } from "./nominal.js";
import type { Shape, ValencyEvidence } from "./shape.js";

/** A Surface's spelling: canonical, or a variant with its tags. */
export type Spelling = Dumling.Surface<"de">["spelling"];

/** A Surface's features: an archaic form's historical status. */
export type SurfaceFeatures = Dumling.Surface<"de">["surfaceFeatures"];

/** The Core Feature the tail settles: an INTJ's answer word, a Foreign word's source language. */
export type TailCore =
	| Dumling.Lemma<"de", "Lexeme", "INTJ">["coreFeatures"]
	| Dumling.Lemma<"de", "Foreign", "Foreign">["coreFeatures"]
	| Record<string, never>;

/** What the head of the first request asked, and the readings code fixed. */
export type HeadPlan = {
	/** Each fused piece whose word is judged: its Segment, the words it may stand for, and its question. */
	readonly pieces: readonly {
		readonly segment: number;
		readonly surfaces: readonly string[];
		readonly reading: Choice;
	}[];
	/** Shortened members whose word is judged, with their questions. */
	readonly shortened: readonly {
		readonly member: Member;
		readonly reading: Choice;
	}[];
	/** Readings code fixes: a VERB's clitic 's is its subject es. */
	readonly presetReadings: ReadonlyMap<number, string>;
	readonly orthography: Choice | undefined;
	readonly spelling: ChoiceOf<typeof options.spelling> | undefined;
	readonly archaic: ChoiceOf<typeof options.archaic> | undefined;
	readonly citation: ChoiceOf<typeof options.citation> | undefined;
};

/**
 * Asks the head of the first request. A member the table spells, or an
 * article read as shortened, is not judged; a VERB's subject es is read
 * as es.
 */
export function askHead(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	article: OpeningArticle | undefined,
	expletive: Member | undefined,
): HeadPlan {
	// A VERB holds es only as its subject es (Rule de/expletive-es-joins-its-verb).
	const presetReadings = new Map<number, string>(
		expletive && shape.lexeme && expletive.spelling
			? [[expletive.segment, "es"]]
			: [],
	);
	const pieces = new Map(
		[
			...ambiguousPieces(
				target.segments,
				target.members.map(({ segment }) => segment),
			),
		].filter(([segment]) => !presetReadings.has(segment)),
	);
	const spelling = askSpelling(
		questionnaire,
		shape,
		target.members.filter(
			(member) => !member.spelling && member !== article?.member,
		),
	);
	const judgedPieces = [...pieces].map(([segment, piece]) => ({
		segment,
		surfaces: piece.surfaces,
		reading: questionnaire.choice(
			`reading_s${segment}`,
			fill(question.reading, {
				m: target.members[piece.member]?.ref ?? "",
				word: piece.spelling,
				piece: target.segments[segment]?.text ?? "",
			}),
			Object.fromEntries(
				piece.surfaces.map((surface, index) => [`w${index}`, surface]),
			),
			["fused"],
		),
	}));
	// A shortened adverb the table cannot settle (raus: heraus or hinaus)
	// is judged here; a VERB's prefix question settles its particle.
	const shortened = (
		shape.verbal
			? []
			: target.members.filter(
					(member) =>
						member.spelling?.orthography === "Shorthand" &&
						member.spelling.surfaces.length > 1,
				)
	).map((member) => ({
		member,
		reading: questionnaire.choice(
			`short_s${member.segment}`,
			fill(question.shortened, { m: member.ref }),
			Object.fromEntries(
				(member.spelling?.surfaces ?? []).map((surface, index) => [
					`w${index}`,
					surface,
				]),
			),
			["orthography"],
		),
	}));
	const citation =
		shape.citable && !article
			? questionnaire.choice(
					"citation",
					question.citation,
					options.citation,
					["inflection"],
				)
			: undefined;
	return {
		pieces: judgedPieces,
		shortened,
		presetReadings,
		...spelling,
		citation,
	};
}

/** Asks the judged members' Typo or Shorthand, and the spelling and its currency. */
function askSpelling(
	questionnaire: Questionnaire,
	shape: Shape,
	judgedMembers: readonly Member[],
): Pick<HeadPlan, "orthography" | "spelling" | "archaic"> {
	if (judgedMembers.length === 0)
		return {
			orthography: undefined,
			spelling: undefined,
			archaic: undefined,
		};
	const orthography = questionnaire.choice(
		"orthography",
		question.orthography,
		{
			...options.orthography,
			...Object.fromEntries(
				judgedMembers.flatMap((member) => [
					[
						`t${member.position}`,
						fill(question.typoMember, { m: member.ref }),
					],
					[
						`s${member.position}`,
						fill(question.shorthandMember, { m: member.ref }),
					],
				]),
			),
		},
		["orthography"],
	);
	if (shape.foreign)
		return { orthography, spelling: undefined, archaic: undefined };
	return {
		orthography,
		spelling: questionnaire.choice(
			"spelling",
			question.spelling,
			options.spelling,
			["orthography"],
		),
		archaic: questionnaire.choice(
			"archaic",
			question.archaic,
			options.archaic,
			["orthography"],
		),
	};
}

/** Reads the head: each member's orthography, the spelling, the readings, and a citation. */
export function readHead(
	target: Target,
	article: OpeningArticle | undefined,
	head: HeadPlan,
	indefinite: ChoiceOf<typeof options.indefinite> | undefined,
	answered: Answered,
): {
	readonly orthographies: readonly MemberOrthography[];
	readonly spelling: Spelling;
	readonly surfaceFeatures: SurfaceFeatures;
	readonly readings: ReadonlyMap<number, string>;
	readonly cited: boolean;
} {
	const irregular = head.orthography
		? answered.pick(head.orthography)
		: "None";
	const shorthand =
		indefinite !== undefined && answered.peek(indefinite) === "Indefinite";
	const orthographies = target.members.map(
		(member): MemberOrthography =>
			member.spelling?.orthography ??
			(member === article?.member
				? article.orthography
				: irregular === `t${member.position}`
					? "Typo"
					: irregular === `s${member.position}` || shorthand
						? "Shorthand"
						: "Standard"),
	);
	const spellingAnswer = head.spelling
		? answered.pick(head.spelling)
		: "Canonical";
	const digits = target.members.every(
		(member) => member.spelling || /^\d+$/u.test(member.text),
	);
	const spelling: Spelling =
		target.route.kind === "NUM" && digits
			? { kind: "Variant", variantTags: ["Licensed"] }
			: spellingAnswer === "Canonical"
				? { kind: "Canonical" }
				: { kind: "Variant", variantTags: [spellingAnswer] };
	const surfaceFeatures: SurfaceFeatures =
		head.archaic && answered.pick(head.archaic) === "Archaic"
			? { historicalStatus: "Archaic" }
			: null;
	const readings = new Map(head.presetReadings);
	for (const piece of head.pieces) {
		const answer = answered.pick(piece.reading);
		const reading = piece.surfaces[Number(answer.slice(1))];
		if (reading === undefined)
			throw new UnresolvedAnswer(
				`No reading of Segment ${piece.segment}`,
			);
		readings.set(piece.segment, reading);
	}
	for (const { member, reading: asked } of head.shortened) {
		const answer = answered.pick(asked);
		const reading = member.spelling?.surfaces[Number(answer.slice(1))];
		if (reading === undefined)
			throw new UnresolvedAnswer(
				`No reading of Segment ${member.segment}`,
			);
		readings.set(member.segment, reading);
	}
	const cited =
		head.citation !== undefined &&
		answered.pick(head.citation) === "Citation";
	return { orthographies, spelling, surfaceFeatures, readings, cited };
}

/** What the tail of the first request asked. */
export type TailPlan = {
	readonly answer: ChoiceOf<typeof options.answer> | undefined;
	readonly sourceLanguage:
		| ChoiceOf<typeof options.sourceLanguage>
		| undefined;
	readonly coverage: ChoiceOf<typeof options.coverage> | undefined;
	readonly governable: readonly GovernedQuestions[];
};

/**
 * Asks the tail of the first request, the prepositions governed among the
 * members no satellite `taken` included.
 */
export function askTail(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	taken: ReadonlySet<number>,
): TailPlan {
	const answer =
		target.route.kind === "INTJ" && shape.lexeme
			? questionnaire.choice("answer", question.answer, options.answer, [
					"interjection",
				])
			: undefined;
	const sourceLanguage = shape.foreign
		? questionnaire.choice(
				"sourceLanguage",
				question.sourceLanguage,
				options.sourceLanguage,
				["foreign"],
			)
		: undefined;
	const coverage = shape.coverage
		? questionnaire.choice(
				"coverage",
				question.coverage,
				options.coverage,
				["coverage"],
			)
		: undefined;
	return {
		answer,
		sourceLanguage,
		coverage,
		governable: askGoverned(questionnaire, target, shape, taken),
	};
}

/**
 * Reads the tail: an INTJ's or a Foreign word's Core Feature, coverage,
 * and the prepositions governed. A subject es is evidence only of a used
 * verb, in a complete realization: jev's citation or Partial against it
 * is a clash.
 */
export function readTail(
	tail: TailPlan,
	shape: Shape,
	answered: Answered,
	expletive: Member | undefined,
	cited: boolean,
): {
	readonly core: TailCore;
	readonly coverage: "Full" | "Partial";
	readonly governed: readonly ValencyEvidence[];
	readonly governedPositions: readonly number[];
} {
	const core: TailCore = tail.answer
		? { partType: answered.pick(tail.answer) === "Res" ? "Res" : null }
		: tail.sourceLanguage
			? { sourceLang: answered.pick(tail.sourceLanguage) }
			: {};
	const coverage =
		tail.coverage && answered.pick(tail.coverage) === "Partial"
			? "Partial"
			: "Full";
	if (expletive && cited)
		throw new UnresolvedAnswer("The subject es clashes with a citation");
	if (expletive && coverage === "Partial")
		throw new UnresolvedAnswer(
			"The subject es clashes with a partial realization",
		);
	return {
		core,
		coverage,
		...readGoverned(tail.governable, shape, answered),
	};
}
