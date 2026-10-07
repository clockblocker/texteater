/**
 * The questions every open route's first request asks around its shape's
 * block, and their reading. The head asks a member's Typo or Shorthand,
 * the spelling, an archaic form, the word a fused piece or a shortened
 * member stands for, and a citation. The tail asks an answer word, a
 * Foreign word's source language, coverage, and the prepositions the head
 * governs.
 */

import { ambiguousPieces, type MemberOrthography } from "../member-spelling.js";
import { fill, question } from "../prompts.js";
import {
	type Answered,
	type Questionnaire,
	UnresolvedAnswer,
} from "../questions.js";
import type { Member, Target } from "../target.js";
import { askGoverned, type Governable, readGoverned } from "./governed.js";
import type { OpeningArticle } from "./nominal.js";
import type { Shape, Values } from "./shape.js";

/** What the head of the first request asked, and the readings code fixed. */
export type HeadPlan = {
	readonly pieces: ReturnType<typeof ambiguousPieces>;
	/** Shortened members whose word is judged, by Segment. */
	readonly shortened: readonly Member[];
	/** Readings code fixes: a VERB's clitic 's is its subject es. */
	readonly presetReadings: ReadonlyMap<number, string>;
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
	askSpelling(
		questionnaire,
		shape,
		target.members.filter(
			(member) => !member.spelling && member !== article?.member,
		),
	);
	for (const [segment, piece] of pieces)
		questionnaire.choice(
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
		);
	// A shortened adverb the table cannot settle (raus: heraus or hinaus)
	// is judged here; a VERB's prefix question settles its particle.
	const shortened = shape.verbal
		? []
		: target.members.filter(
				(member) =>
					member.spelling?.orthography === "Shorthand" &&
					member.spelling.surfaces.length > 1,
			);
	for (const member of shortened)
		questionnaire.choice(
			`short_s${member.segment}`,
			fill(question.shortened, { m: member.ref }),
			Object.fromEntries(
				(member.spelling?.surfaces ?? []).map((surface, index) => [
					`w${index}`,
					surface,
				]),
			),
			["orthography"],
		);
	if (shape.citable && !article)
		questionnaire.choice(
			"citation",
			question.citation,
			{
				Used: "Used in the sentence, inflected as its role there needs",
				Citation:
					"Only mentioned, as a dictionary entry, a name or a title",
			},
			["inflection"],
		);
	return { pieces, shortened, presetReadings };
}

/** Asks the judged members' Typo or Shorthand, and the spelling and its currency. */
function askSpelling(
	questionnaire: Questionnaire,
	shape: Shape,
	judgedMembers: readonly Member[],
): void {
	if (judgedMembers.length === 0) return;
	questionnaire.choice(
		"orthography",
		question.orthography,
		{
			None: question.orthographyNone,
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
	if (shape.foreign) return;
	questionnaire.choice(
		"spelling",
		question.spelling,
		{
			Canonical: question.spellingCanonical,
			Licensed: "Another spelling a current standard accepts",
			Historical: "A spelling only an earlier standard accepted",
			Regional: "A dialect or regional spelling",
			Expressive: "Letters stretched for effect",
		},
		["orthography"],
	);
	questionnaire.choice(
		"archaic",
		question.archaic,
		{ Current: "A current form", Archaic: "An archaic form" },
		["orthography"],
	);
}

/** Reads the head: each member's orthography, the spelling, the readings, and a citation. */
export function readHead(
	target: Target,
	questionnaire: Questionnaire,
	article: OpeningArticle | undefined,
	head: HeadPlan,
	answered: Answered,
): {
	readonly orthographies: readonly MemberOrthography[];
	readonly spelling: Values;
	readonly surfaceFeatures: Values | null;
	readonly readings: ReadonlyMap<number, string>;
	readonly cited: boolean;
} {
	const irregular = questionnaire.questions.orthography
		? answered.pick("orthography")
		: "None";
	const indefinite = answered.peek("indefinite") === "Indefinite";
	const orthographies = target.members.map(
		(member): MemberOrthography =>
			member.spelling?.orthography ??
			(member === article?.member
				? article.orthography
				: irregular === `t${member.position}`
					? "Typo"
					: irregular === `s${member.position}` || indefinite
						? "Shorthand"
						: "Standard"),
	);
	const spellingAnswer = questionnaire.questions.spelling
		? answered.pick("spelling")
		: "Canonical";
	const digits = target.members.every(
		(member) => member.spelling || /^\d+$/u.test(member.text),
	);
	const spelling =
		target.route.kind === "NUM" && digits
			? { kind: "Variant", variantTags: ["Licensed"] }
			: spellingAnswer === "Canonical"
				? { kind: "Canonical" }
				: { kind: "Variant", variantTags: [spellingAnswer] };
	const surfaceFeatures =
		questionnaire.questions.archaic &&
		answered.pick("archaic") === "Archaic"
			? { historicalStatus: "Archaic" }
			: null;
	const readings = new Map(head.presetReadings);
	for (const [segment, piece] of head.pieces) {
		const answer = answered.pick(`reading_s${segment}`);
		const reading = piece.surfaces[Number(answer.slice(1))];
		if (reading === undefined)
			throw new UnresolvedAnswer(`No reading of Segment ${segment}`);
		readings.set(segment, reading);
	}
	for (const member of head.shortened) {
		const answer = answered.pick(`short_s${member.segment}`);
		const reading = member.spelling?.surfaces[Number(answer.slice(1))];
		if (reading === undefined)
			throw new UnresolvedAnswer(
				`No reading of Segment ${member.segment}`,
			);
		readings.set(member.segment, reading);
	}
	const cited =
		questionnaire.questions.citation !== undefined &&
		answered.pick("citation") === "Citation";
	return { orthographies, spelling, surfaceFeatures, readings, cited };
}

/**
 * Asks the tail of the first request, the prepositions governed among the
 * members no satellite `taken` included.
 */
export function askTail(
	questionnaire: Questionnaire,
	target: Target,
	shape: Shape,
	taken: ReadonlySet<number>,
): readonly Governable[] {
	if (target.route.kind === "INTJ" && shape.lexeme)
		questionnaire.choice(
			"answer",
			question.answer,
			{ Res: "An answer word", None: "Another interjection" },
			["interjection"],
		);
	if (shape.foreign)
		questionnaire.choice(
			"sourceLanguage",
			question.sourceLanguage,
			{
				en: "English",
				fr: "French",
				it: "Italian",
				es: "Spanish",
				la: "Latin",
				pt: "Portuguese",
				nl: "Dutch",
				sv: "Swedish",
				ru: "Russian",
				tr: "Turkish",
				ja: "Japanese",
			},
			["foreign"],
		);
	if (shape.coverage)
		questionnaire.choice(
			"coverage",
			question.coverage,
			{
				Full: "All of its fixed wording is realized",
				Partial:
					"Some fixed wording is missing or deliberately changed",
			},
			["coverage"],
		);
	return askGoverned(questionnaire, target, shape, taken);
}

/**
 * Reads the tail: an INTJ's or a Foreign word's Core Feature, coverage,
 * and the prepositions governed. A subject es is evidence only of a used
 * verb, in a complete realization: jev's citation or Partial against it
 * is a clash.
 */
export function readTail(
	target: Target,
	shape: Shape,
	governable: readonly Governable[],
	answered: Answered,
	expletive: Member | undefined,
	cited: boolean,
): {
	readonly core: Values;
	readonly coverage: "Full" | "Partial";
	readonly governed: readonly Values[];
	readonly governedPositions: readonly number[];
} {
	const core: Values = {};
	if (target.route.kind === "INTJ" && shape.lexeme)
		core.partType = answered.pick("answer") === "Res" ? "Res" : null;
	if (shape.foreign) core.sourceLang = answered.pick("sourceLanguage");
	const coverage =
		shape.coverage && answered.pick("coverage") === "Partial"
			? "Partial"
			: "Full";
	if (expletive && cited)
		throw new UnresolvedAnswer("The subject es clashes with a citation");
	if (expletive && coverage === "Partial")
		throw new UnresolvedAnswer(
			"The subject es clashes with a partial realization",
		);
	return { core, coverage, ...readGoverned(governable, shape, answered) };
}
