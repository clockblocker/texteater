/**
 * The candidate immediate-constituent analyses of one German word (system
 * ADR 0050), built by code so that jev only picks one or none: a compound's
 * two words (`Kohle + kraftwerk`), a prefix or particle with its base
 * (`ver + kaufen`, `ein + kaufen`), a base with a suffix (`Entspann +
 * ung`), and a prefix with a noun or adjective base and the citation ending
 * (`ver + arzt + en`). A hyphenated word splits at its hyphens only, and
 * a lone `E` before its one hyphen may also be DWDS's prefix 2e-
 * (`E- + Book` beside `E + Book`); no word without a hyphen is cut there.
 *
 * A linking element is not cut here: once a part's Canonical Form is known,
 * the letters it shows past that form are an Interfix (`interfix.ts`). The
 * cuts come from dumcorpus's closed affix inventory and its true separable
 * particles; a part that is a word needs at least two letters, a head three
 * (a verb's four, its ending included, or `tun`, German's one infinitive of
 * three letters), except the last of two words written together, an
 * adverb's or a conjunction's, which may have two (`zu`).
 */
import {
	germanHyphenPrefixes,
	germanPrefixes,
	germanSeparableParticles,
	germanSuffixes,
} from "dumcorpus/inventories";

/**
 * One piece of an analysis: a word, whose route and Canonical Form jev
 * picks; a prefix, true separable particle or suffix with its Morpheme
 * Lemma's Canonical Form (`ein-` in einkaufen, ADR 0050: dumcorpus's closed
 * particle list decides, and a first part such as teil or fest is a word);
 * a verb's citation ending, shown as filler; a hyphen; or a hyphenated
 * compound's front phrase as one Locution part, read with spaces
 * (`Kopf-an-Kopf` read `Kopf an Kopf`).
 */
export type WordPiece =
	| { readonly role: "Word"; readonly letters: string }
	| {
			readonly role: "Phrase";
			readonly letters: string;
			readonly reads: string;
	  }
	| {
			readonly role: "Prefix" | "Suffix";
			readonly letters: string;
			readonly canonicalForm: string;
			/** A suffix's one base Kind, from the inventory (`-ung`: VERB). */
			readonly baseKind?: string;
	  }
	| { readonly role: "Ending" | "Hyphen"; readonly letters: string };

export type WordAnalysis = {
	readonly pieces: readonly WordPiece[];
	/** How the judge reads it: `ver- + arzt + -en (citation ending)`. */
	readonly label: string;
};

const lower = (text: string) => text.toLocaleLowerCase("de");

const prefixes: ReadonlyMap<string, string> = new Map(
	germanPrefixes.map(({ spelled, canonicalForm }) => [
		spelled,
		canonicalForm,
	]),
);

/** The suffixes, longest spelling first, so `igkeit` is tried before `keit`. */
const suffixes = [...germanSuffixes].sort(
	(left, right) => right.spelled.length - left.spelled.length,
);

const suffixSpellings: ReadonlySet<string> = new Set(
	germanSuffixes.map(({ spelled }) => spelled),
);

/**
 * What a hyphen-only prefix stands for, read in its analysis's label, since
 * its letters alone also spell a letter of the alphabet or a note.
 */
export const hyphenPrefixGlosses: Readonly<Record<string, string>> = {
	"e-": "short for elektronisch",
};

/** The hyphen-only prefixes by their letters: `e` → `e-`. */
const hyphenPrefixes: ReadonlyMap<string, string> = new Map(
	germanHyphenPrefixes.map(({ spelled, canonicalForm }) => [
		spelled,
		canonicalForm,
	]),
);

/** How the judge reads an analysis; a hyphen is filler and left out. */
function labelOf(pieces: readonly WordPiece[]): string {
	return pieces
		.filter(({ role }) => role !== "Hyphen")
		.map((piece) => {
			switch (piece.role) {
				case "Prefix": {
					const gloss = hyphenPrefixGlosses[piece.canonicalForm];
					return `${piece.letters}- (prefix${gloss ? `, ${gloss}` : ""})`;
				}
				case "Suffix":
					return `-${piece.letters} (suffix)`;
				case "Ending":
					return `-${piece.letters} (citation ending)`;
				case "Phrase":
					return `[${piece.reads}]`;
				default:
					return piece.letters;
			}
		})
		.join(" + ");
}

const analysis = (pieces: readonly WordPiece[]): WordAnalysis => ({
	pieces,
	label: labelOf(pieces),
});

/** The first part of a binary cut, as the inventory names it. */
function firstPiece(letters: string): WordPiece {
	const folded = lower(letters);
	const canonicalForm = prefixes.get(folded);
	if (canonicalForm !== undefined)
		return { role: "Prefix", letters, canonicalForm };
	if (germanSeparableParticles.has(folded))
		return { role: "Prefix", letters, canonicalForm: `${folded}-` };
	return { role: "Word", letters };
}

/** A verb's citation ending: `-n` after -el and -er (`wandern`), else `-en`. */
function citationEnding(word: string): string | undefined {
	const folded = lower(word);
	if (/(?:el|er)n$/u.test(folded)) return "n";
	return folded.endsWith("en") ? "en" : undefined;
}

/**
 * The Kinds whose two-word analysis is a compound with a head the first
 * word tells apart; any other Kind's two words were written together (an
 * adverb's or a conjunction's), and its last word may have two letters
 * (`zu`, `so`, `da`; #1241 round 9).
 */
export const headedKinds: ReadonlySet<string> = new Set([
	"NOUN",
	"PROPN",
	"VERB",
	"ADJ",
]);

/** The verb heads shorter than four letters a cut may still leave: `tun` (weh + tun). */
const shortVerbHeads: ReadonlySet<string> = new Set(["tun"]);

/**
 * Every cut into a first part and a head, the head at least `minHead`
 * letters or one of `shortHeads`.
 */
function binaryCuts(
	word: string,
	minHead: number,
	shortHeads: ReadonlySet<string> = new Set(),
): WordAnalysis[] {
	const result: WordAnalysis[] = [];
	for (let cut = 2; cut <= word.length - 2; cut++) {
		const head = lower(word.slice(cut));
		if (word.length - cut < minHead && !shortHeads.has(head)) continue;
		// A suffix is no head: `suffixCuts` offers that cut.
		if (suffixSpellings.has(head)) continue;
		result.push(
			analysis([
				firstPiece(word.slice(0, cut)),
				{ role: "Word", letters: word.slice(cut) },
			]),
		);
	}
	return result;
}

/** A base with a derivational suffix: `Entspann + -ung`. */
function suffixCuts(word: string): WordAnalysis[] {
	const folded = lower(word);
	return suffixes
		.filter(
			({ spelled }) =>
				folded.endsWith(spelled) && word.length - spelled.length >= 2,
		)
		.map(({ spelled, canonicalForm, baseKind }) =>
			analysis([
				{ role: "Word", letters: word.slice(0, -spelled.length) },
				{
					role: "Suffix",
					letters: word.slice(-spelled.length),
					canonicalForm,
					...(baseKind === undefined ? {} : { baseKind }),
				},
			]),
		);
}

/** A prefix, a noun or adjective base and a verb's citation ending: `ver + arzt + en`. */
function prefixedVerbStems(word: string): WordAnalysis[] {
	const ending = citationEnding(word);
	if (ending === undefined) return [];
	const folded = lower(word);
	const result: WordAnalysis[] = [];
	for (const [spelled, canonicalForm] of prefixes) {
		const stem = word.slice(spelled.length, -ending.length);
		if (folded.startsWith(spelled) && stem.length >= 2)
			result.push(
				analysis([
					{
						role: "Prefix",
						letters: word.slice(0, spelled.length),
						canonicalForm,
					},
					{ role: "Word", letters: stem },
					{ role: "Ending", letters: word.slice(-ending.length) },
				]),
			);
	}
	return result;
}

/**
 * A hyphenated word, flat at its hyphens (`Mund-zu-Mund-Beatmung`), and,
 * when it is a hyphen-only prefix's letters, one hyphen and a word, that
 * prefix and the word (`E- + Book`). A word with more hyphens stays flat.
 */
function hyphenated(word: string): WordAnalysis[] {
	const pieces = word
		.split(/(-)/u)
		.filter((part) => part.length > 0)
		.map(
			(part): WordPiece =>
				part === "-"
					? { role: "Hyphen", letters: part }
					: { role: "Word", letters: part },
		);
	const [first, hyphen, rest, ...more] = pieces;
	const prefix = hyphenPrefixes.get(lower(first?.letters ?? ""));
	if (
		first === undefined ||
		prefix === undefined ||
		hyphen === undefined ||
		rest === undefined ||
		more.length > 0
	)
		return [analysis(pieces)];
	return [
		analysis(pieces),
		analysis([
			{ role: "Prefix", letters: first.letters, canonicalForm: prefix },
			hyphen,
			rest,
		]),
	];
}

/**
 * A flat hyphenated analysis with the words before its last hyphen as one
 * front phrase, a candidate Locution (`[Kopf an Kopf] + Rennen`, ADR 0050),
 * when there are at least two of them; else undefined.
 */
export function withFrontPhrase(
	flat: WordAnalysis,
): { readonly analysis: WordAnalysis; readonly reads: string } | undefined {
	const { pieces } = flat;
	const lastHyphen = pieces.findLastIndex(({ role }) => role === "Hyphen");
	const front = pieces.slice(0, Math.max(lastHyphen, 0));
	const words = front.filter(({ role }) => role === "Word");
	if (
		words.length < 2 ||
		front.some(({ role }) => role !== "Word" && role !== "Hyphen")
	)
		return undefined;
	const reads = words.map(({ letters }) => letters).join(" ");
	return {
		reads,
		analysis: analysis([
			{
				role: "Phrase",
				letters: front.map(({ letters }) => letters).join(""),
				reads,
			},
			...pieces.slice(lastHyphen),
		]),
	};
}

/**
 * The candidate analyses of `word`, a German Lexeme of Kind `kind`, without
 * repeats; none for a word too short to cut.
 */
export function wordAnalyses(word: string, kind: string): WordAnalysis[] {
	if (/\p{L}-\p{L}/u.test(word)) return hyphenated(word);
	const verb = kind === "VERB";
	const minHead = verb ? 4 : headedKinds.has(kind) ? 3 : 2;
	const candidates = [
		...binaryCuts(word, minHead, verb ? shortVerbHeads : undefined),
		...suffixCuts(word),
		...(verb ? prefixedVerbStems(word) : []),
	];
	const seen = new Set<string>();
	return candidates.filter(({ label }) => {
		if (seen.has(label)) return false;
		seen.add(label);
		return true;
	});
}
