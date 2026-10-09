/**
 * Deterministic candidates for German units. Code finds the pieces that
 * could attach to another word (articles, separable particles,
 * auxiliaries, reflexives, expletive es, governed prepositions, a noun's
 * idiom verb), the pairs that could be one unit (split adverbs,
 * correlators, circumpositions, multiword names) and the spans a Saying
 * could cover. The judge only picks a host among a bounded window, or
 * `none`, and weighs the pairs and spans.
 */
import {
	type AuthoredRealization,
	authoredRealizations,
	cliticEsSpellings,
	germanSeparablePrefixes,
} from "dumcorpus/inventories";
import { numeralWords } from "../../resolve/de/numeral.js";
import { foldApostrophes } from "../fusion-table.js";
import type { GermanInventory } from "./inventory.js";
import type { Piece, Sentence } from "./sentence.js";

export type SlotKind =
	| "idiom"
	| "article"
	| "particle"
	| "auxiliary"
	| "reflexive"
	| "expletive"
	| "preposition";

export type Slot = {
	readonly kind: SlotKind;
	readonly piece: Piece;
	/** The pieces the judge may choose as the host. */
	readonly hosts: readonly Piece[];
};

/** Two pieces code proposes as one unit, for a Noul. */
export type PairCandidate = {
	readonly kind: "split-adverb" | "correlator" | "circumposition" | "name";
	readonly left: Piece;
	readonly right: Piece;
	readonly name: string;
};

function pronTypeOf({ member }: AuthoredRealization): unknown {
	const features: Readonly<Record<string, unknown>> =
		member.lemma.coreFeatures;
	return features.pronType;
}

/**
 * Every spelling of der and ein: the DET `pronType: Art` realizations, the
 * shortened ones among them (n, ne, nem, nen, ner) also with the apostrophe
 * that may open them ('ne Frage).
 */
export const articleForms: ReadonlySet<string> = new Set(
	authoredRealizations
		.filter(
			(realization) =>
				realization.member.lemma.kind === "DET" &&
				pronTypeOf(realization) === "Art",
		)
		.flatMap(({ spelled, orthography }) => {
			const form = spelled.toLowerCase();
			return orthography === "Shorthand" ? [form, `'${form}`] : [form];
		}),
);

/**
 * Separable prefixes that open no particle slot: the slot's recall was tuned
 * on the lab without them. Opening a slot on one changes the judge's
 * requests, so each waits for a lab round (#1057). Resolution still offers
 * da and leid as a VERB's prefix (daliegen, leidtun; `prefixParticles`).
 */
const noSlotParticles: ReadonlySet<string> = new Set([
	"bekannt",
	"da",
	"dagegen",
	"daneben",
	"dazwischen",
	"gut",
	"irre",
	"kund",
	"leer",
	"leid",
	"nahe",
	"offen",
	"sicher",
	"spazieren",
	"stand",
	"voll",
	"wahr",
	"wider",
]);

/**
 * The separable prefixes that open a particle slot (ab, hinaus, raus, teil,
 * umher, …): dumcorpus's list without `noSlotParticles`.
 */
export const particleForms: ReadonlySet<string> = new Set(
	[...germanSeparablePrefixes].filter(
		(prefix) => !noSlotParticles.has(prefix),
	),
);

/** The personal pronouns that are no possessive, each with its Core Features. */
const personalPronouns = authoredRealizations.flatMap((realization) => {
	const { lemma } = realization.member;
	const features: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return lemma.kind === "PRON" &&
		features.pronType === "Prs" &&
		features.poss !== "Yes"
		? [{ form: realization.spelled.toLowerCase(), features }]
		: [];
});

/** The 1st and 2nd person object pronouns: mich, mir, uns, dich, dir, euch. */
const objectPronouns = personalPronouns.filter(
	({ features }) =>
		(features.person === "1" || features.person === "2") &&
		(features.case === "Acc" || features.case === "Dat"),
);

/** sich, and each object pronoun a lexical reflexive may take for it. */
export const reflexiveForms: ReadonlySet<string> = new Set([
	"sich",
	...objectPronouns.map(({ form }) => form),
]);

/**
 * Each 1st and 2nd person object pronoun and the subject its reflexive use
 * needs: the Nom pronoun of its person and number (mir and mich ich, uns
 * wir, dir and dich du, euch ihr).
 */
export const reflexiveSubject: ReadonlyMap<string, string> = new Map(
	objectPronouns.map(({ form, features }) => {
		const subject = personalPronouns.find(
			(candidate) =>
				candidate.features.case === "Nom" &&
				candidate.features.person === features.person &&
				candidate.features.number === features.number,
		);
		if (!subject) throw Error(`No subject pronoun for ${form}`);
		return [form, subject.form];
	}),
);

/** Expletive es in full and as a clitic: 's, typographic ’s, s of gehts. */
export const expletiveForms: ReadonlySet<string> = new Set([
	"es",
	...cliticEsSpellings,
]);

/** A piece's text in lowercase, a typographic apostrophe as `'` (’ne, Geht’s). */
export const foldedText = (piece: Piece) =>
	foldApostrophes(piece.text.toLowerCase());

const lower = (piece: Piece) => piece.text.toLowerCase();
const window = (
	sentence: Sentence,
	piece: Piece,
	before: number,
	after: number,
) =>
	sentence.pieces.filter(
		(other) =>
			other.id !== piece.id &&
			other.id >= piece.id - before &&
			other.id <= piece.id + after,
	);

/** A form of der or ein; a fused word's article piece (`m` of `im`) stands for its article. */
export function isArticle(piece: Piece): boolean {
	if (piece.fusedWord && piece.surface !== piece.text)
		return articleForms.has(foldApostrophes(piece.surface.toLowerCase()));
	return !piece.fusedWord && articleForms.has(foldedText(piece));
}

/** Capitalized words that are no noun: pronouns and function words opening a clause. */
const capitalizedFunctionWords = new Set(
	"ich du er sie es wir ihr man wer was wo wie wann warum ob dass daß als wenn weil da so und oder aber doch denn nicht nur auch noch schon ja nein ach oh na dann jetzt hier dort heute mein dein sein unser euer kein dieser jener jeder alle mit von zu in an auf aus bei nach vor über unter für um durch ohne gegen seit bis trotz wegen während".split(
		" ",
	),
);

/** A capitalized piece that can be a noun: not an article, pronoun or function word. */
export function nounLike(piece: Piece): boolean {
	return (
		/^\p{Lu}/u.test(piece.text) &&
		!isArticle(piece) &&
		!capitalizedFunctionWords.has(lower(piece))
	);
}

/** The satellite slots of a Sentence, and an idiom slot for each noun. */
export function slotsOf(
	sentence: Sentence,
	inventory: GermanInventory,
): Slot[] {
	const slots: Slot[] = [];
	for (const piece of sentence.pieces) {
		const text = lower(piece);
		if (nounLike(piece))
			slots.push({
				kind: "idiom",
				piece,
				hosts: window(sentence, piece, 10, 10).filter(
					(other) => !nounLike(other) && !isArticle(other),
				),
			});
		if (isArticle(piece)) {
			const hosts = sentence.pieces.filter(
				(other) =>
					other.id > piece.id &&
					other.id <= piece.id + 6 &&
					other.clause === piece.clause,
			);
			if (hosts.length > 0) slots.push({ kind: "article", piece, hosts });
			// `ein` is also a particle (trat … ein).
			if (text !== "ein") continue;
		}
		if (particleForms.has(text) && !piece.fusedWord)
			slots.push({
				kind: "particle",
				piece,
				hosts: sentence.pieces.filter(
					(other) => other.id < piece.id && other.id >= piece.id - 15,
				),
			});
		if (inventory.isAuxiliary(text))
			slots.push({
				kind: "auxiliary",
				piece,
				hosts: window(sentence, piece, 12, 12),
			});
		if (reflexiveForms.has(foldedText(piece)))
			slots.push({
				kind: "reflexive",
				piece,
				hosts: window(sentence, piece, 10, 10),
			});
		if (expletiveForms.has(foldedText(piece)))
			slots.push({
				kind: "expletive",
				piece,
				hosts: window(sentence, piece, 8, 8),
			});
		if (inventory.isAdposition(piece.surface))
			slots.push({
				kind: "preposition",
				piece,
				hosts: window(sentence, piece, 12, 12),
			});
	}
	return slots.filter((slot) => slot.hosts.length > 0);
}

/** The first words of a split pronominal or directional adverb (Da … hin, Wo … mit). */
export const splitHeads: ReadonlySet<string> = new Set(["da", "wo", "hier"]);

/** The second words of a split pronominal or directional adverb (Da … hin, Wo … mit). */
export const splitTails: ReadonlySet<string> = new Set([
	"hin",
	"her",
	"an",
	"auf",
	"aus",
	"bei",
	"durch",
	"für",
	"gegen",
	"hinter",
	"in",
	"mit",
	"nach",
	"neben",
	"über",
	"um",
	"unter",
	"von",
	"vor",
	"zu",
	"zwischen",
]);

const correlators: readonly (readonly [string, string, string])[] = [
	["entweder", "oder", "entweder … oder"],
	["weder", "noch", "weder … noch"],
	["sowohl", "als", "sowohl … als auch"],
	["sowohl", "wie", "sowohl … wie auch"],
	["nicht", "sondern", "nicht nur … sondern auch"],
	["je", "desto", "je … desto"],
	["je", "umso", "je … umso"],
	["je", "je", "je … je"],
	["einerseits", "andererseits", "einerseits … andererseits"],
	["teils", "teils", "teils … teils"],
	["um", "zu", "um … zu"],
	["ohne", "zu", "ohne … zu"],
	["statt", "zu", "statt … zu"],
	["anstatt", "zu", "anstatt … zu"],
	["so", "dass", "so … dass"],
];

/** Two adjacent words proposed as one subordinator (#735 keeps *X dass* a Locution). */
const adjacentConjunctions: readonly (readonly [string, string])[] = [
	["ohne", "dass"],
	["ohne", "daß"],
	["so", "dass"],
	["so", "daß"],
	["als", "ob"],
	["als", "wenn"],
	["statt", "dass"],
	["anstatt", "dass"],
	["außer", "dass"],
	["nur", "dass"],
	["kaum", "dass"],
	["auch", "wenn"],
	["und", "zwar"],
];

const circumpositionTails = new Set([
	"vorbei",
	"hinaus",
	"an",
	"aus",
	"her",
	"hin",
	"entlang",
	"herum",
	"willen",
	"zu",
	"ab",
]);

const nameConnectors = new Set([
	"von",
	"van",
	"de",
	"di",
	"da",
	"del",
	"zu",
	"der",
	"vom",
]);

export function pairCandidatesOf(
	sentence: Sentence,
	inventory: GermanInventory,
): PairCandidate[] {
	const pairs: PairCandidate[] = [];
	const { pieces } = sentence;
	for (const [index, left] of pieces.entries()) {
		const right = pieces[index + 1];
		if (!right) continue;
		for (const [first, second] of adjacentConjunctions)
			if (lower(left) === first && lower(right) === second)
				pairs.push({
					kind: "correlator",
					left,
					right,
					name: `${first} ${second}`,
				});
		// Names: capitalized pieces, possibly joined by von, van, de.
		if (nounLike(left) && left.clause === right.clause) {
			const connects = (at: number) => {
				const piece = pieces[at];
				return piece !== undefined && nameConnectors.has(lower(piece));
			};
			let next = index + 1;
			while (connects(next) && next - index < 3) next++;
			const partner = pieces[next];
			if (partner && nounLike(partner) && partner.clause === left.clause)
				pairs.push({
					kind: "name",
					left,
					right: partner,
					name: "",
				});
		}
	}
	for (const left of pieces) {
		if (!inventory.isAdposition(left.surface) || left.fusedWord) continue;
		for (const right of pieces)
			if (
				right.id > left.id + 1 &&
				right.id - left.id <= 8 &&
				right.clause === left.clause &&
				circumpositionTails.has(lower(right))
			)
				pairs.push({
					kind: "circumposition",
					left,
					right,
					name: `${lower(left)} … ${lower(right)}`,
				});
	}
	for (const left of sentence.pieces) {
		const head = lower(left);
		for (const right of sentence.pieces) {
			if (right.id <= left.id) continue;
			const tail = lower(right);
			if (
				splitHeads.has(head) &&
				splitTails.has(tail) &&
				right.clause === left.clause &&
				right.id - left.id <= 10
			)
				pairs.push({
					kind: "split-adverb",
					left,
					right,
					name: `${head}${head === "wo" && /^[aeiouäöü]/u.test(tail) ? "r" : head === "da" && /^[aeiouäöü]/u.test(tail) ? "r" : ""}${tail}`,
				});
			for (const [first, second, name] of correlators)
				if (
					head === first &&
					tail === second &&
					right.id - left.id <= 20
				)
					pairs.push({ kind: "correlator", left, right, name });
		}
	}
	return pairs;
}

/** A span the judge weighs as a whole Saying. */
export type SayingSpan = {
	readonly pieces: readonly Piece[];
	readonly text: string;
};

const quoteMarks = /[„“”"»«‚‘’›‹]/u;

/**
 * The whole sentence, every quoted stretch, every clause of three or more
 * pieces and every two adjacent clauses: where a Saying may lie.
 */
export function sayingSpans(sentence: Sentence): SayingSpan[] {
	const spans = new Map<string, readonly Piece[]>();
	const add = (pieces: readonly Piece[]) => {
		if (pieces.length >= 3)
			spans.set(pieces.map((piece) => piece.id).join(","), pieces);
	};
	add(sentence.pieces);
	let open: number | undefined;
	for (const [index, segment] of sentence.segments.entries()) {
		if (segment.kind !== "Punctuation" || !quoteMarks.test(segment.text))
			continue;
		if (open === undefined) open = index;
		else {
			const start = open;
			add(
				sentence.pieces.filter(
					(piece) => piece.segment > start && piece.segment < index,
				),
			);
			open = undefined;
		}
	}
	const clauses = [...new Set(sentence.pieces.map((piece) => piece.clause))];
	for (const [position, clause] of clauses.entries()) {
		add(sentence.pieces.filter((piece) => piece.clause === clause));
		const next = clauses[position + 1];
		if (next !== undefined)
			add(
				sentence.pieces.filter(
					(piece) => piece.clause === clause || piece.clause === next,
				),
			);
	}
	return [...spans.values()].map((pieces) => {
		const first = pieces[0]?.segment ?? 0;
		const last = pieces[pieces.length - 1]?.segment ?? 0;
		return {
			pieces,
			text: sentence.segments
				.slice(first, last + 1)
				.map((segment) => segment.text)
				.join(""),
		};
	});
}

/** `am` before a superlative in -sten joins it (`am liebsten`), with no judge. */
export function superlativeLinks(
	sentence: Sentence,
): (readonly [number, number])[] {
	const links: (readonly [number, number])[] = [];
	for (const [index, piece] of sentence.pieces.entries()) {
		const next = sentence.pieces[index + 1];
		if (
			lower(piece) === "am" &&
			!piece.fusedWord &&
			next &&
			/(e?st|ßt)en$/u.test(lower(next))
		)
			links.push([piece.id, next.id]);
	}
	return links;
}

/** The pieces of each split written word, by piece id. */
export function fusedSiblings(
	sentence: Sentence,
): Map<number, readonly number[]> {
	const siblings = new Map<number, readonly number[]>();
	let run: Piece[] = [];
	const flush = () => {
		if (run.length > 1)
			for (const piece of run)
				siblings.set(
					piece.id,
					run.map((other) => other.id),
				);
		run = [];
	};
	for (const piece of sentence.pieces) {
		const previous = run[run.length - 1];
		if (
			piece.fusedWord &&
			previous &&
			previous.segment === piece.segment - 1
		)
			run.push(piece);
		else {
			flush();
			if (piece.fusedWord) run = [piece];
		}
	}
	flush();
	return siblings;
}

/** The first piece of its clause: a capitalized one may be a verb, not a noun. */
function clauseInitial(sentence: Sentence, piece: Piece): boolean {
	const previous = sentence.pieces[piece.id - 2];
	return previous === undefined || previous.clause !== piece.clause;
}

/**
 * The hosts an idiom slot offers a noun when step 0 asks it again: unlike
 * the first request's, a clause-initial capitalized piece may host
 * (`Blase … Trübsal`).
 */
export function idiomHosts(sentence: Sentence, piece: Piece): Piece[] {
	return window(sentence, piece, 10, 10).filter(
		(other) =>
			(!nounLike(other) || clauseInitial(sentence, other)) &&
			!isArticle(other),
	);
}

/** Non-adjacent correlators in the old spelling daß. */
export function oldSpellingCorrelators(sentence: Sentence): PairCandidate[] {
	const pairs: PairCandidate[] = [];
	for (const left of sentence.pieces)
		if (lower(left) === "so")
			for (const right of sentence.pieces)
				if (
					right.id > left.id + 1 &&
					right.id - left.id <= 20 &&
					lower(right) === "daß"
				)
					pairs.push({
						kind: "correlator",
						left,
						right,
						name: "so … daß",
					});
	return pairs;
}

/** A number range's number words: the numeral speller's words, and eine (eine Million). */
export const numberWords: ReadonlySet<string> = new Set([
	...numeralWords,
	"eine",
]);

const isNumberPiece = (piece: Piece) =>
	/^\p{N}+([.,]\p{N}+)?$/u.test(piece.text) || numberWords.has(lower(piece));

/** Number, `Komma` or `bis`, number: one Locution/NUM (drei Komma vierzehn, zwölf bis sechzehn). */
export function numberRanges(sentence: Sentence): (readonly number[])[] {
	const ranges: (readonly number[])[] = [];
	const { pieces } = sentence;
	for (const [index, middle] of pieces.entries()) {
		const left = pieces[index - 1];
		const right = pieces[index + 1];
		if (
			left &&
			right &&
			(lower(middle) === "komma" || lower(middle) === "bis") &&
			isNumberPiece(left) &&
			isNumberPiece(right)
		)
			ranges.push([left.id, middle.id, right.id]);
	}
	return ranges;
}

/** A piece with no letter or digit: a symbol, which takes no article. */
export const isSymbolPiece = (piece: Piece) =>
	!/[\p{L}\p{N}]/u.test(piece.text);

/** An abbreviation's shape: letters with inner dots, or a short word ending in a dot. */
export const isAbbreviationPiece = (piece: Piece) =>
	/\p{L}\.\p{L}/u.test(piece.text) || /^\p{L}{1,5}\.$/u.test(piece.text);

/** The `final` request's was für question ids, by the was and für pieces. */
export const wasFuerId = (was: number, fuer: number) => `w4_${was}_${fuer}`;

/** The was … für pairs the `final` request asks about: für within six pieces after was, in its clause. */
export function wasFuerPairs(sentence: Sentence): (readonly [Piece, Piece])[] {
	const pairs: (readonly [Piece, Piece])[] = [];
	const { pieces } = sentence;
	for (const was of pieces) {
		if (lower(was) !== "was") continue;
		for (const fuer of pieces)
			if (
				lower(fuer) === "für" &&
				fuer.id > was.id &&
				fuer.id - was.id <= 6 &&
				fuer.clause === was.clause
			)
				pairs.push([was, fuer]);
	}
	return pairs;
}
