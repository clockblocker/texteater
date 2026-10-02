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
		"Adposition (preposition, postposition or fixed circumposition) alone: the article and noun of its complement are never members, also when the preposition and the article are pieces of one written word (i in im)",
	"Lexeme/ADV":
		"Adverb that cannot inflect as an adjective (heute, dort, gern), including a whole adverbial correlator; never an adjective used adverbially",
	"Lexeme/CCONJ":
		"Coordinating conjunction, including a complete fixed correlator",
	"Lexeme/DET":
		"A determiner directly modifying a noun (mein, dieser, kein, welcher, jeder), never the absorbed article der/die/das/ein of a noun",
	"Lexeme/INTJ": "Interjection",
	"Lexeme/NOUN":
		"Common noun with the article opening its phrase, including substantivized participles and a noun with the preposition it governs (Angst vor); a click on that article is this noun. A unit that also holds a verb is never a NOUN",
	"Lexeme/NUM": "Numeral",
	"Lexeme/PART":
		"Particle, including negation, modal and focus particles and the infinitive marker zu before an infinitive (schwer zu erklären, versucht zu schlafen)",
	"Lexeme/PRON":
		"Pronoun used substantively, or attributive genitive dessen/deren/wessen",
	"Lexeme/PROPN":
		"Proper noun, with the definite article it is canonically cited with (die Schweiz), and a click on that article is this name; a name cited bare (Berlin) absorbs no article",
	"Lexeme/SCONJ":
		"Subordinating conjunction, including fixed multi-member conjunctions and correlators (um/zu, ohne/zu, statt/zu, so/dass); a zu without um, ohne or statt is not one",
	"Lexeme/SYM": "Symbol",
	"Lexeme/VERB":
		"Whole lexical verb with its own scoped auxiliaries and fixed members, including a modal or copula",
	"Phraseme/Aphorism": "Established concise attributed maxim",
	"Phraseme/Collocation":
		"Funktionsverbgefüge: a support verb with its predicate noun, restricted in wording and compositional in meaning; wording without a predicate noun, such as a copula with a predicative adjective, is never one",
	"Phraseme/DiscourseFormula": "Established fixed discourse formula",
	"Phraseme/Idiom":
		"Established noncompositional expression in this contextual meaning",
	"Phraseme/Proverb": "Established traditional saying",
	Unresolved:
		"No defensible complete fixed unit contains this occurrence: its exact members or its Family/Kind cannot be decided",
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

/**
 * The written words of a sentence as the Segment indices that spell them:
 * the pieces of a fused word (i and m of im) are one written word.
 */
function writtenWords(sentence: SegmentedSentence): number[][] {
	const words: number[][] = [];
	let current: number[] = [];
	for (const [index, segment] of sentence.segments.entries()) {
		if (segment.kind === "ResolvableText") current.push(index);
		else if (current.length) {
			words.push(current);
			current = [];
		}
	}
	if (current.length) words.push(current);
	return words;
}

type Expansion = {
	readonly text: string;
	readonly abbreviation: string;
	readonly kind: string;
	readonly members: readonly number[];
};

/**
 * Written-out expansions of the table's abbreviations with one reading and a
 * Kind (zum Teil for z.T.): the table knows them as one fixed unit, which a
 * learner's click on any of their words may open.
 */
function writtenExpansions(sentence: SegmentedSentence): Expansion[] {
	const words = writtenWords(sentence).map((indices) => ({
		indices,
		text: indices
			.map((index) => sentence.segments[index]?.text ?? "")
			.join("")
			.toLocaleLowerCase("de"),
	}));
	const found: Expansion[] = [];
	for (const entry of germanFusionTable.abbreviations) {
		if (!entry.kind || typeof entry.surface !== "string") continue;
		const expansion = entry.surface.toLocaleLowerCase("de").split(" ");
		if (expansion.length < 2) continue;
		for (let start = 0; start + expansion.length <= words.length; start++) {
			const run = words.slice(start, start + expansion.length);
			if (
				run.every((word, position) => word.text === expansion[position])
			)
				found.push({
					text: entry.surface,
					abbreviation: entry.text,
					kind: entry.kind,
					members: run.flatMap((word) => word.indices),
				});
		}
	}
	return found;
}

export function classificationState(
	input: ClassificationInput,
	criteria: string,
) {
	const german = input.sentence.language === "de";
	const fusedWords = german ? fusedWordNotes(input.sentence) : [];
	const fixedExpansions = german
		? writtenExpansions(input.sentence).map(
				({ text, abbreviation, kind, members }) =>
					`${members.map((index) => `<s${index}>`).join(", ")} spell ${text}, which ${abbreviation} abbreviates: used as that fixed expression, it is one ${kind} whose members are all of them.`,
			)
		: [];
	return {
		sentence: indexedContext(input.sentence),
		clickedSegmentIndex: input.clickedSegmentIndex,
		...(fusedWords.length ? { fusedWords } : {}),
		...(fixedExpansions.length ? { fixedExpansions } : {}),
		criteria:
			"In `sentence`, <sN> tags identify selectable occurrences by original segment index N. Untagged text supplies context only. " +
			criteria,
	};
}

/** The first Segment of the fused word a Segment is a piece of, if any. */
function fusedWordStart(sentence: SegmentedSentence, index: number) {
	const piece = fusedPieceAt(germanFusionTable, sentence.segments, index);
	return piece && index - piece.component;
}

const isArticle = (sentence: SegmentedSentence, index: number) =>
	articleMembers(sentence, [index]).length > 0;
const isCapitalized = (sentence: SegmentedSentence, index: number) => {
	const text = sentence.segments[index]?.text ?? "";
	return text !== text.toLocaleLowerCase("de");
};

/**
 * The article form that may open the phrase of a capitalized word, German
 * capitalizing nouns and names: the nearest one before it with only lowercase
 * words (adjectives, numerals) between, all within one stretch of text.
 */
function openingArticle(sentence: SegmentedSentence, noun: number) {
	if (!isCapitalized(sentence, noun)) return undefined;
	for (let index = noun - 1; index >= 0; index--) {
		const segment = sentence.segments[index];
		if (segment?.kind === "Whitespace") continue;
		if (segment?.kind !== "ResolvableText") return undefined;
		if (isArticle(sentence, index)) return index;
		if (isCapitalized(sentence, index)) return undefined;
	}
	return undefined;
}

/** The capitalized word an article form may open the phrase of. */
function openedNoun(sentence: SegmentedSentence, article: number) {
	if (!isArticle(sentence, article)) return undefined;
	for (let index = article + 1; index < sentence.segments.length; index++) {
		const segment = sentence.segments[index];
		if (segment?.kind === "Whitespace") continue;
		if (segment?.kind !== "ResolvableText" || isArticle(sentence, index))
			return undefined;
		if (isCapitalized(sentence, index)) return index;
	}
	return undefined;
}

/**
 * What the sentence's shape suggests about one membership question, for the
 * judge to weigh (ADR 0035): a written-out abbreviation is one unit, the
 * pieces of one written word stand for different words, and an article
 * belongs to the noun its phrase opens onto, whatever that noun's role.
 */
function membershipNote(input: ClassificationInput, index: number): string {
	const { sentence, clickedSegmentIndex: clicked } = input;
	const expansion = writtenExpansions(sentence).find(({ members }) =>
		members.includes(clicked),
	);
	if (expansion?.members.includes(index))
		return ` <s${index}> and the clicked occurrence both spell ${expansion.text} (\`fixedExpansions\`): Include it where the words are used as that fixed expression.`;
	if (expansion)
		return ` The clicked occurrence belongs to ${expansion.text} (\`fixedExpansions\`), and <s${index}> is outside it: where ${expansion.text} is used as that fixed expression, Exclude <s${index}>.`;
	const start = fusedWordStart(sentence, index);
	if (start !== undefined && start === fusedWordStart(sentence, clicked))
		return isArticle(sentence, clicked)
			? ` <s${index}> is the other piece of the written word whose article piece was clicked (\`fusedWords\`). The article piece belongs to the noun its phrase opens onto, and the preposition piece to the word governing it or to an ADP of its own: Exclude <s${index}> unless both words are fixed members of one larger expression, such as an idiom or a Funktionsverbgefüge.`
			: ` <s${index}> and the clicked occurrence are pieces of one written word that stand for different words (\`fusedWords\`): Include it only when both words are fixed members of one larger expression, never because they are written together. Otherwise a preposition piece is its own ADP or joins the word governing it, and an article piece belongs to its noun.`;
	if (index === openingArticle(sentence, clicked))
		return ` <s${index}> is an article form before the clicked word with only lowercase words between. A noun owns the article opening its own phrase, across adjectives and numerals, whatever the noun's role in the sentence (subject, object, predicate noun, genitive attribute, second conjunct): if <s${index}> opens the phrase of the clicked noun or name, Include it.`;
	if (index === openedNoun(sentence, clicked))
		return ` The clicked occurrence is an article form, and <s${index}> is the next capitalized word after it with only lowercase words between. If the clicked occurrence is the article opening the phrase of the noun or name <s${index}>, Include it: a noun owns its article whatever its role in the sentence.`;
	if (isArticle(sentence, clicked))
		return " The clicked occurrence is an article form: used as an article, it joins only the noun or name whose phrase it opens, never a verb or preposition before it, and another word joins it only inside a larger fixed expression.";
	return "";
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
			`Under \`criteria\`, does occurrence <s${index}> in \`sentence\` belong to the same complete fixed unit as the occurrence identified by \`clickedSegmentIndex\`?${membershipNote(input, index)}`,
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

/**
 * The route is asked about the complete unit containing the click, not about
 * the assembled group. A click on a noun or its article is reminded that an
 * idiom holding them is the unit: the judge otherwise names the clicked word's
 * own Kind.
 */
export function routeQuestion(input: ClassificationInput) {
	const { sentence, clickedSegmentIndex: clicked } = input;
	const nominal =
		isArticle(sentence, clicked) ||
		(isCapitalized(sentence, clicked) &&
			openingArticle(sentence, clicked) !== undefined);
	return choice(
		`Under \`criteria\`, what is the Family/Kind of the complete fixed unit in \`sentence\` that contains the occurrence identified by \`clickedSegmentIndex\`? Classify the whole unit, not the clicked word's standalone part of speech.${nominal ? " When the clicked noun or article is a fixed member of an established idiom together with its verb, the unit is that Idiom, not a NOUN." : ""} Choose Unresolved when no defensible complete target contains it.`,
		routes,
	);
}

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
 * A click on a piece of a fused word opens the unit that owns that piece,
 * never the whole written word (ADR 0035). A fused article piece opens its
 * noun's phrase, so nothing before it belongs to the noun: not the
 * preposition piece written onto it, nor the word governing that
 * preposition. The ADP of a preposition piece never holds the article
 * written onto it, nor the noun that article opens, whether or not the judge
 * took the article in.
 */
function ownPieces(
	sentence: SegmentedSentence,
	clicked: number,
	kind: string,
	members: readonly number[],
): number[] {
	if (kind === "NOUN" || kind === "PROPN") {
		const piece = members.find(
			(index) =>
				isArticle(sentence, index) &&
				(fusedWordStart(sentence, index) ?? index) !== index,
		);
		return piece !== undefined && piece <= clicked
			? members.filter((index) => index >= piece)
			: [...members];
	}
	if (kind !== "ADP" || fusedWordStart(sentence, clicked) !== clicked)
		return [...members];
	const complement = new Set<number>();
	for (const [index] of sentence.segments.entries())
		if (
			index !== clicked &&
			fusedWordStart(sentence, index) === clicked &&
			isArticle(sentence, index)
		) {
			complement.add(index);
			const noun = openedNoun(sentence, index);
			if (noun !== undefined) complement.add(noun);
		}
	return members.filter((index) => !complement.has(index));
}

/**
 * Pure assembly of the judge's answers. Membership Unresolved stops before the
 * route, and a click on a piece keeps only the unit that owns it. A NOUN or
 * PROPN may absorb only the one article opening its phrase, because the
 * membership judge sometimes attaches every article in the sentence to the
 * clicked noun and the grammar stage would only reject that later; a fused
 * article piece counts as that article (ADR 0035), and a noun target needs
 * its noun. A Phraseme may own every piece (zur Verfügung stellen).
 */
export function assembleTarget(
	input: ClassificationInput,
	answers: SystemOneResult<Questions>["answers"],
): Assembly {
	const { sentence, clickedSegmentIndex: clicked } = input;
	const judged = [clicked];
	for (const [id, answer] of Object.entries(answers)) {
		if (!id.startsWith("member_")) continue;
		if (answer?.type !== "choice" || answer.choice === "Unresolved")
			return {
				decision: "Unresolved",
				reason: "Target membership is unresolved",
			};
		if (answer.choice === "Include")
			judged.push(Number(id.slice("member_".length)));
	}
	judged.sort((a, b) => a - b);
	const routeAnswer = answers.route;
	const selected =
		routeAnswer?.type === "choice" ? routeAnswer.choice : "Unresolved";
	if (selected === "Unresolved")
		return {
			decision: "Unresolved",
			reason: "Assembled target is not defensible",
		};
	const [family, kind] = selected.split("/") as [string, string];
	const members =
		family === "Lexeme"
			? ownPieces(sentence, clicked, kind, judged)
			: judged;
	if (kind === "NOUN" || kind === "PROPN") {
		const name = kind === "PROPN" ? "proper noun" : "noun";
		const articles = articleMembers(sentence, members);
		if (
			articles.length > 1 ||
			(articles.length === 1 && articles[0] !== members[0])
		)
			return {
				decision: "Unresolved",
				reason: `A ${name} target may absorb only the one article opening its phrase`,
			};
		if (articles.length === members.length)
			return {
				decision: "Unresolved",
				reason: `A ${name} target needs its ${name}, not only an article`,
			};
	}
	return {
		decision: "Resolved",
		family,
		kind,
		memberSegmentIndices: members,
	};
}
