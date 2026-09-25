import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import type { SegmentedSentence } from "../../../types.js";
import {
	fusedPieceAt,
	shorthandSurfaces,
} from "../../../universal/fusion-table.js";
import { choice } from "../../../universal/questions.js";
import { indexedContext } from "../../../universal/validation.js";
import { germanFusionTable } from "../fusion-entries.js";

/**
 * The parts of German target classification that do not talk to the judge:
 * the state and questions sent in the one round trip, and the pure assembly
 * of the answers into a target. Production and the live experiments under
 * `prototypes/` share this so an experiment measures exactly what ships.
 */

export const routes = {
	"Lexeme/ADJ":
		"Adjective, including adverbial adjective uses, an adjective with the preposition it governs (stolz auf), and every participle outside a perfect or passive: attributive, adverbial, or predicative after sein or another verb, whatever its sense and dependents (der zweimal verschobene Termin, den Koffer ziehend)",
	"Lexeme/ADP":
		"Adposition (preposition, postposition or fixed circumposition)",
	"Lexeme/ADV":
		"Adverb that cannot inflect as an adjective (heute, dort, gern), including a whole adverbial correlator; never an adjective used adverbially",
	"Lexeme/CCONJ":
		"Coordinating conjunction, including a complete fixed correlator",
	"Lexeme/DET": "Determiner modifying a noun",
	"Lexeme/INTJ": "Interjection",
	"Lexeme/NOUN":
		"Common noun, including substantivized participles and a noun with the preposition it governs (Angst vor)",
	"Lexeme/NUM": "Numeral",
	"Lexeme/PART": "Particle",
	"Lexeme/PRON":
		"Pronoun used substantively, or attributive genitive dessen/deren/wessen",
	"Lexeme/PROPN": "Proper noun",
	"Lexeme/SCONJ":
		"Subordinating conjunction, including fixed multi-member conjunctions",
	"Lexeme/SYM": "Symbol",
	"Lexeme/VERB":
		"Whole lexical verb with its own scoped auxiliaries and fixed members, including a modal or copula",
	"Phraseme/Aphorism": "Established concise attributed maxim",
	"Phraseme/Collocation":
		"Conventional multiword expression with restricted lexical choices and a compositional overall meaning, including Funktionsverbgefüge (eine Entscheidung treffen, zur Verfügung stellen)",
	"Phraseme/DiscourseFormula": "Established fixed discourse formula",
	"Phraseme/Idiom":
		"Established noncompositional expression in this contextual meaning",
	"Phraseme/Proverb": "Established traditional saying",
	Unresolved:
		"The exact assembled group is invalid, incomplete, includes free material, or has no defensible allowed route",
};

/** Definite/indefinite article forms a German NOUN target may absorb. */
export const articleForms: ReadonlySet<string> = new Set([
	"der",
	"die",
	"das",
	"den",
	"dem",
	"des",
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
]);

export type ClassificationInput = {
	readonly sentence: SegmentedSentence;
	readonly clickedSegmentIndex: number;
};

/**
 * What each piece of a split fused word stands for (ADR 0035): `<s4>i</s4>`
 * and `<s5>m</s5>` read as one written word, so the judge is told that they
 * are in and dem.
 */
export function fusedWordNotes(sentence: SegmentedSentence): string[] {
	const notes: string[] = [];
	for (const index of sentence.segments.keys()) {
		const piece = fusedPieceAt(germanFusionTable, sentence.segments, index);
		if (piece?.component !== 0) continue;
		const parts = piece.pieces.map(
			({ span, surfaces }, position) =>
				`<s${index + position}> ${span} ${
					surfaces.length
						? `stands for ${surfaces.join(" or ")}`
						: "keeps its own letters"
				}`,
		);
		notes.push(
			`${piece.pieces.map(({ span }) => span).join("")} is one written word split into pieces: ${parts.join("; ")}.`,
		);
	}
	return notes;
}

export function classificationState(
	input: ClassificationInput,
	criteria: string,
) {
	const fusedWords =
		input.sentence.language === "de" ? fusedWordNotes(input.sentence) : [];
	return {
		sentence: indexedContext(input.sentence),
		clickedSegmentIndex: input.clickedSegmentIndex,
		...(fusedWords.length ? { fusedWords } : {}),
		criteria:
			"In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. " +
			criteria,
	};
}

/** One membership question per other resolvable occurrence, keyed `member_<index>`. */
export function membershipQuestions(input: ClassificationInput): Questions {
	const questions: Questions = {};
	for (const [index, segment] of input.sentence.segments.entries()) {
		if (
			segment.kind !== "ResolvableText" ||
			index === input.clickedSegmentIndex
		)
			continue;
		questions[`member_${index}`] = choice(
			`Under \`criteria\`, does occurrence <s${index}> in \`sentence\` belong to the same complete fixed unit as the occurrence identified by \`clickedSegmentIndex\`?`,
			{
				Include: "It is a fixed member of that same unit",
				Exclude:
					"It belongs to another unit or is free contextual material",
				Unresolved: "Its membership cannot be defensibly decided",
			},
		);
	}
	return questions;
}

/** The route is asked about the complete unit containing the click, not about the assembled group. */
export const routeQuestion = choice(
	"Under `criteria`, what is the Family/Kind of the complete fixed unit in `sentence` that contains the occurrence identified by `clickedSegmentIndex`? Classify the whole unit, not the clicked word's standalone part of speech. Choose Unresolved when no defensible complete target contains it.",
	routes,
);

export type Assembly =
	| {
			readonly decision: "Resolved";
			readonly family: string;
			readonly kind: string;
			readonly memberSegmentIndices: number[];
	  }
	| { readonly decision: "Unresolved"; readonly reason: string };

/**
 * The members that are an article: a standalone one (der), the article piece
 * of a fused word (m in im) or a shortened one ('ne).
 */
export function articleMembers(
	sentence: SegmentedSentence,
	members: readonly number[],
): number[] {
	return members.filter((index) => {
		const text = sentence.segments[index]?.text ?? "";
		const piece = fusedPieceAt(germanFusionTable, sentence.segments, index);
		const surfaces = piece
			? (piece.pieces[piece.component]?.surfaces ?? [])
			: (shorthandSurfaces(germanFusionTable, text) ?? [text]);
		return surfaces.some((surface) =>
			articleForms.has(surface.toLowerCase()),
		);
	});
}

/**
 * Pure assembly of the judge's answers. Membership Unresolved stops before the
 * route; a NOUN may absorb only the one article opening its phrase, because the
 * membership judge sometimes attaches every article in the sentence to the
 * clicked noun and the grammar stage would only reject that later.
 */
export function assembleTarget(
	input: ClassificationInput,
	answers: SystemOneResult<Questions>["answers"],
): Assembly {
	const members = [input.clickedSegmentIndex];
	for (const [id, answer] of Object.entries(answers)) {
		if (!id.startsWith("member_")) continue;
		if (answer?.type !== "choice" || answer.choice === "Unresolved")
			return {
				decision: "Unresolved",
				reason: "Target membership is unresolved",
			};
		if (answer.choice === "Include")
			members.push(Number(id.slice("member_".length)));
	}
	members.sort((a, b) => a - b);
	const routeAnswer = answers.route;
	const selected =
		routeAnswer?.type === "choice" ? routeAnswer.choice : "Unresolved";
	if (selected === "Unresolved")
		return {
			decision: "Unresolved",
			reason: "Assembled target is not defensible",
		};
	const [family, kind] = selected.split("/") as [string, string];
	if (kind === "NOUN") {
		const articles = articleMembers(input.sentence, members);
		if (
			articles.length > 1 ||
			(articles.length === 1 && articles[0] !== members[0])
		)
			return {
				decision: "Unresolved",
				reason: "A noun target may absorb only the one article opening its phrase",
			};
	}
	return {
		decision: "Resolved",
		family,
		kind,
		memberSegmentIndices: members,
	};
}
