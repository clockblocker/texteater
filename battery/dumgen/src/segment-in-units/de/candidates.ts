/**
 * Deterministic candidate generators for German satellites: code finds the
 * pieces that could attach to another word (articles, separable particles,
 * auxiliaries, reflexives, expletive es, governed prepositions, split
 * adverbs, correlators) from dumspec's inventories and closed word lists,
 * and the judge only picks the host among a bounded window, or `none`.
 */
import { authoredRealizations, germanAdpositionCases } from "dumspec";
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

const articleForms = new Set([
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
	"'ne",
	"'nen",
	"'nem",
	"'ner",
	"ne",
	"nen",
]);

/** Separable verb prefixes, the her-/hin- adverbs and their r- shorthands. */
export const particleForms = new Set(
	"ab an auf aus bei dabei dar durch ein empor entgegen entlang fehl fern fest fort frei gegenüber heim her herab heran herauf heraus herbei herein herüber herum herunter hervor hin hinab hinauf hinaus hinein hinüber hinunter hinweg hinzu hoch los mit nach nieder raus rein rüber runter rauf ran statt teil um vor voran voraus vorbei vorüber vorweg weg weiter wieder zu zurecht zurück zusammen zuvor über unter kennen preis bloß kaputt klar".split(
		" ",
	),
);

export /** Particles v3 adds after the v2 run missed them (umher, übrig, …). */
const moreParticleForms = new Set(
	"umher übrig fertig auseinander beiseite hinterher davon dazu dahin daher vorwärts rückwärts entzwei bereit ein".split(
		" ",
	),
);

export const reflexiveForms = new Set([
	"sich",
	"mich",
	"dich",
	"uns",
	"euch",
	"mir",
	"dir",
]);
export const expletiveForms = new Set(["es", "'s", "s"]);

let auxiliaryForms: Set<string> | undefined;
export function isAuxiliaryForm(text: string): boolean {
	auxiliaryForms ??= new Set(
		authoredRealizations
			.filter((realization) => realization.member.lemma.kind === "AUX")
			.map((realization) => realization.spelled.toLowerCase()),
	);
	return auxiliaryForms.has(text.toLowerCase());
}

export function isAdposition(word: string): boolean {
	const lemma = {
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: word.toLowerCase(),
		coreFeatures: { adpType: "Prep" },
	} as unknown as Parameters<typeof germanAdpositionCases>[0];
	return germanAdpositionCases(lemma) !== null;
}

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

/** Shortened articles only v2 lists: `n Auto`, `nem`, `ner`. */
const shortArticleForms = new Set(["n", "'n", "nem", "ner"]);

/** A fused word's article piece (`m` of `im`) stands for its article. */
function isArticle(piece: Piece, version = 1): boolean {
	if (piece.fusedWord && piece.surface !== piece.text)
		return articleForms.has(piece.surface.toLowerCase());
	return (
		!piece.fusedWord &&
		(articleForms.has(lower(piece)) ||
			(version >= 2 && shortArticleForms.has(lower(piece))))
	);
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
		!isArticle(piece, 2) &&
		!capitalizedFunctionWords.has(lower(piece))
	);
}

export function slotsOf(sentence: Sentence, version = 1): Slot[] {
	const slots: Slot[] = [];
	for (const piece of sentence.pieces) {
		const text = lower(piece);
		if (version >= 2 && nounLike(piece))
			slots.push({
				kind: "idiom",
				piece,
				hosts: window(sentence, piece, 10, 10).filter(
					(other) => !nounLike(other) && !isArticle(other, 2),
				),
			});
		if (isArticle(piece, version)) {
			const hosts = sentence.pieces.filter(
				(other) =>
					other.id > piece.id &&
					other.id <= piece.id + 6 &&
					other.clause === piece.clause,
			);
			if (hosts.length > 0) slots.push({ kind: "article", piece, hosts });
			// v3: `ein` is also a particle (trat … ein).
			if (!(version >= 3 && text === "ein")) continue;
		}
		if (
			(particleForms.has(text) ||
				(version >= 3 && moreParticleForms.has(text))) &&
			!piece.fusedWord
		)
			slots.push({
				kind: "particle",
				piece,
				hosts: sentence.pieces.filter(
					(other) => other.id < piece.id && other.id >= piece.id - 15,
				),
			});
		if (isAuxiliaryForm(text))
			slots.push({
				kind: "auxiliary",
				piece,
				hosts: window(sentence, piece, 12, 12),
			});
		if (reflexiveForms.has(text))
			slots.push({
				kind: "reflexive",
				piece,
				hosts: window(sentence, piece, 10, 10),
			});
		if (expletiveForms.has(text))
			slots.push({
				kind: "expletive",
				piece,
				hosts: window(sentence, piece, 8, 8),
			});
		if (isAdposition(piece.surface))
			slots.push({
				kind: "preposition",
				piece,
				hosts: window(sentence, piece, 12, 12),
			});
	}
	return slots.filter((slot) => slot.hosts.length > 0);
}

const splitHeads = new Set(["da", "wo", "hier"]);
const splitTails = new Set([
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

/** Two adjacent words v2 proposes as one subordinator (#735 keeps *X dass* a Locution). */
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
	version = 1,
): PairCandidate[] {
	const pairs: PairCandidate[] = [];
	if (version >= 2) {
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
				let next = index + 1;
				while (
					pieces[next] &&
					nameConnectors.has(lower(pieces[next] as Piece)) &&
					next - index < 3
				)
					next++;
				const partner = pieces[next];
				if (
					partner &&
					nounLike(partner) &&
					partner.clause === left.clause
				)
					pairs.push({
						kind: "name",
						left,
						right: partner,
						name: "",
					});
			}
		}
		for (const left of pieces) {
			if (!isAdposition(left.surface) || left.fusedWord) continue;
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

/** A span v2 asks about as a whole Saying. */
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

/** An adposition piece right before a phrase: `in` of `in den Sand`. */
export function isAdpositionPiece(piece: Piece): boolean {
	return isAdposition(piece.surface);
}

/** The first piece of its clause: a capitalized one may be a verb, not a noun. */
export function clauseInitial(sentence: Sentence, piece: Piece): boolean {
	const previous = sentence.pieces[piece.id - 2];
	return previous === undefined || previous.clause !== piece.clause;
}

/**
 * The hosts an idiom slot offers a noun. v2 left out every capitalized
 * piece as a noun, so a clause-initial imperative (`Blase … Trübsal`) could
 * never host; `fixed` keeps clause-initial pieces.
 */
export function idiomHosts(
	sentence: Sentence,
	piece: Piece,
	fixed: boolean,
): Piece[] {
	return window(sentence, piece, 10, 10).filter(
		(other) =>
			(!nounLike(other) || (fixed && clauseInitial(sentence, other))) &&
			!isArticle(other, 2),
	);
}

/** Non-adjacent correlators v2 missed: the old spelling daß. */
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

const numberWords = new Set(
	"null eins ein eine zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig dreißig vierzig fünfzig sechzig siebzig achtzig neunzig hundert tausend".split(
		" ",
	),
);

export const isNumberPiece = (piece: Piece) =>
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

/**
 * The written words of a sentence, each the piece ids of one word: a fused
 * word (`zu` + `m`) is one word.
 */
export function writtenWords(sentence: Sentence): number[][] {
	const words: number[][] = [];
	for (const piece of sentence.pieces) {
		const last = words[words.length - 1];
		const previous = last
			? sentence.pieces[(last[last.length - 1] ?? 0) - 1]
			: undefined;
		if (
			last &&
			previous &&
			piece.fusedWord &&
			previous.fusedWord &&
			previous.segment === piece.segment - 1
		)
			last.push(piece.id);
		else words.push([piece.id]);
	}
	return words;
}

/** Every clause-internal run of 2 to 4 written words, as piece ids. */
export function contiguousSpans(sentence: Sentence, most = 4): number[][] {
	const words = writtenWords(sentence);
	const spans: number[][] = [];
	for (let start = 0; start < words.length; start++)
		for (
			let length = 2;
			length <= most && start + length <= words.length;
			length++
		) {
			const run = words.slice(start, start + length);
			const clauses = new Set(
				run.flat().map((id) => sentence.pieces[id - 1]?.clause),
			);
			if (clauses.size !== 1) break;
			spans.push(run.flat());
		}
	return spans;
}
