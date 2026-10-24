/**
 * The candidate immediate-constituent analyses of one German word (system
 * ADR 0050), built by code so that jev only picks one or none: a compound's
 * two words (`Kohle + kraftwerk`), a prefix or particle with its base
 * (`ver + kaufen`, `ein + kaufen`), a base with a suffix (`Entspann +
 * ung`), and a prefix with a noun or adjective base and the citation ending
 * (`ver + arzt + en`). A hyphenated word splits at its hyphens only.
 *
 * A linking element is not cut here: once a part's Canonical Form is known,
 * the letters it shows past that form are an Interfix (`interfix.ts`). The
 * cuts come from dumcorpus's closed affix inventory and its true separable
 * particles; a part that is a word needs at least two letters, a head three
 * (a verb's four, its ending included).
 */
import {
	germanPrefixes,
	germanSeparableParticles,
	germanSuffixes,
} from "dumcorpus/inventories";

/**
 * One piece of an analysis: a word, whose route and Canonical Form jev
 * picks; a prefix, true separable particle or suffix with its Morpheme
 * Lemma's Canonical Form (`ein-` in einkaufen, ADR 0050: dumcorpus's closed
 * particle list decides, and a first part such as teil or fest is a word);
 * a verb's citation ending, shown as filler; or a hyphen.
 */
export type WordPiece =
	| { readonly role: "Word"; readonly letters: string }
	| {
			readonly role: "Prefix" | "Suffix";
			readonly letters: string;
			readonly canonicalForm: string;
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

function labelOf(pieces: readonly WordPiece[]): string {
	return pieces
		.map((piece) => {
			switch (piece.role) {
				case "Prefix":
					return `${piece.letters}- (prefix)`;
				case "Suffix":
					return `-${piece.letters} (suffix)`;
				case "Ending":
					return `-${piece.letters} (citation ending)`;
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

/** Every cut into a first part and a head, the head at least `minHead` letters. */
function binaryCuts(word: string, minHead: number): WordAnalysis[] {
	const result: WordAnalysis[] = [];
	for (let cut = 2; cut <= word.length - minHead; cut++) {
		// A suffix is no head: `suffixCuts` offers that cut.
		if (suffixSpellings.has(lower(word.slice(cut)))) continue;
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
		.map(({ spelled, canonicalForm }) =>
			analysis([
				{ role: "Word", letters: word.slice(0, -spelled.length) },
				{
					role: "Suffix",
					letters: word.slice(-spelled.length),
					canonicalForm,
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

/** A hyphenated word, flat at its hyphens: `E-Mail`, `Mund-zu-Mund-Beatmung`. */
function hyphenated(word: string): WordAnalysis {
	return analysis(
		word
			.split(/(-)/u)
			.filter((part) => part.length > 0)
			.map(
				(part): WordPiece =>
					part === "-"
						? { role: "Hyphen", letters: part }
						: { role: "Word", letters: part },
			),
	);
}

/**
 * The candidate analyses of `word`, a German Lexeme of Kind `kind`, without
 * repeats; none for a word too short to cut.
 */
export function wordAnalyses(word: string, kind: string): WordAnalysis[] {
	if (/\p{L}-\p{L}/u.test(word)) return [hyphenated(word)];
	const verb = kind === "VERB";
	const candidates = [
		...binaryCuts(word, verb ? 4 : 3),
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
