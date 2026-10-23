import { foldCase, zeroEndingCanonicalForm } from "dumling";
import type * as Dumling from "dumling/types";
import type {
	BreakdownPiece,
	LinkTarget,
	ReadingKnowledge,
} from "./generated/types.js";

/**
 * What a language says about its Morphemic Breakdowns beyond the mechanism
 * (ADR 0051), authored in dumcorpus: the Kinds whose citation form ends in
 * the zero ending when it shows no overt one. A language that picks no
 * Ending Kind lists none.
 */
export type MorphemePolicy = {
	readonly zeroEndingKinds: ReadonlySet<string>;
};

/** The Knowledge of a stored Reading the walk reads: its Breakdown and Source. */
export type MorphemeSources = Pick<ReadingKnowledge, "breakdown" | "source">;

/**
 * The stored Knowledge of the Reading a link target resolves to, or
 * undefined while the target is a pending Unit Shadow or its Reading has
 * neither a Breakdown nor a Source. A Lemma with several Readings is the
 * host's to settle: sense lives in the owner's split, not in the target
 * (ADR 0050).
 */
export type LookupMorphemeSources = (
	target: LinkTarget,
) => MorphemeSources | undefined;

/**
 * One piece of a Morphemic Breakdown as a Note shows it:
 *
 * - `Morpheme`: shown letters linked to a Morpheme, as stored.
 * - `Unsplit`: a part whose own morphemes aren't known yet, shown as one
 *   chunk (ADR 0051's partial walk), linked to the part it stands for; a
 *   Source's letters the walk could not place have no link.
 * - `Filler`: punctuation such as a compound's hyphen.
 */
export type ShownMorpheme =
	| {
			readonly kind: "Morpheme";
			readonly letters: string;
			readonly target: LinkTarget;
	  }
	| {
			readonly kind: "Unsplit";
			readonly letters: string;
			readonly target?: LinkTarget;
	  }
	| { readonly kind: "Filler"; readonly letters: string };

/** Real chains are short; a longer one is a cycle or bad data. */
const maxDepth = 8;

/** Letters as shown letters compare to a part's: case and umlaut aside (ADR 0050). */
const fold = (text: string, language: Dumling.Language) =>
	foldCase(text, language).normalize("NFD").replace(/\p{M}/gu, "");

const isEnding = (piece: ShownMorpheme) =>
	piece.kind === "Morpheme" &&
	piece.target.family === "Morpheme" &&
	piece.target.kind === "Ending";

const isZeroEnding = (piece: ShownMorpheme) =>
	isEnding(piece) && piece.letters.length === 0;

/** A link target's identity for the cycle guard. */
const keyOf = (target: LinkTarget) =>
	`${target.family}/${target.kind}/${target.canonicalForm}`;

/** The stored morphemes as shown pieces: a filler is punctuation. */
const storedPieces = (pieces: readonly BreakdownPiece[]): ShownMorpheme[] =>
	pieces.map((piece) =>
		piece.target === undefined
			? { kind: "Filler", letters: piece.letters }
			: {
					kind: "Morpheme",
					letters: piece.letters,
					target: piece.target,
				},
	);

/**
 * The part's inherited pieces kept under its shown letters, read from the
 * start: each piece keeps the shown letters it covers, so case, umlaut and
 * truncation follow the owner (`Gäst` of `gast`, `Gesell` of `gesell · e`,
 * `Lauf` of `lauf · en`). A part's zero ending is dropped, and so is a
 * piece past the shown letters. Undefined when the letters don't line up.
 */
function alignFromStart(
	inherited: readonly ShownMorpheme[],
	shown: string,
	language: Dumling.Language,
): ShownMorpheme[] | undefined {
	const result: ShownMorpheme[] = [];
	let position = 0;
	for (const piece of inherited) {
		if (piece.letters.length === 0) continue;
		if (position >= shown.length) break;
		const take = Math.min(piece.letters.length, shown.length - position);
		const letters = shown.slice(position, position + take);
		if (
			fold(letters, language) !==
			fold(piece.letters.slice(0, take), language)
		)
			return undefined;
		result.push({ ...piece, letters });
		position += take;
	}
	return position === shown.length ? result : undefined;
}

/** Vowels a stem may alternate (`sing`, `sang`, `sung`). */
const vowels = "aeiouäöüy";

/**
 * A Source's base found inside the word by its Root alone, its vowels
 * free to alternate (ADR 0051: `gesungen` inherits the Root `sing` through
 * its Surface `sung`). The letters around it stay unsplit and unlinked.
 * Undefined unless exactly one Root is found exactly once.
 */
function alignByRoot(
	inherited: readonly ShownMorpheme[],
	shown: string,
	language: Dumling.Language,
): ShownMorpheme[] | undefined {
	const roots = inherited.filter(
		(piece) =>
			piece.kind === "Morpheme" &&
			piece.target.family === "Morpheme" &&
			piece.target.kind === "Root",
	);
	const [root] = roots;
	if (roots.length !== 1 || root === undefined) return undefined;
	const pattern = [...fold(root.letters, language)]
		.map((letter) =>
			vowels.includes(letter)
				? `[${vowels}]+`
				: letter.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"),
		)
		.join("");
	const folded = fold(shown, language);
	const matches = [...folded.matchAll(new RegExp(pattern, "gu"))];
	const [match] = matches;
	if (matches.length !== 1 || match?.index === undefined) return undefined;
	const start = match.index;
	const end = start + match[0].length;
	const around = (letters: string): ShownMorpheme[] =>
		letters.length > 0 ? [{ kind: "Unsplit", letters }] : [];
	return [
		...around(shown.slice(0, start)),
		{ ...root, letters: shown.slice(start, end) },
		...around(shown.slice(end)),
	];
}

type Walk = {
	readonly language: Dumling.Language;
	readonly lookup: LookupMorphemeSources;
	readonly seen: ReadonlySet<string>;
};

/**
 * The pieces a part contributes under its shown letters: its own walked
 * morphemes, kept under those letters, or one unsplit chunk while they
 * aren't known or don't line up.
 */
function partPieces(
	target: LinkTarget,
	shown: string,
	walk: Walk,
	byRoot: boolean,
): ShownMorpheme[] {
	const chunk: ShownMorpheme[] = [
		{ kind: "Unsplit", letters: shown, target },
	];
	const key = keyOf(target);
	if (walk.seen.has(key) || walk.seen.size >= maxDepth) return chunk;
	const sources = walk.lookup(target);
	if (sources === undefined) return chunk;
	const inherited = walked(sources, target.canonicalForm, {
		...walk,
		seen: new Set([...walk.seen, key]),
	});
	if (inherited === undefined) return chunk;
	return (
		alignFromStart(inherited, shown, walk.language) ??
		(byRoot ? alignByRoot(inherited, shown, walk.language) : undefined) ??
		chunk
	);
}

/**
 * A word's Morphemic Breakdown before its own Ending is settled: stored
 * morphemes as they are, else the walk up its Constituents, else through its
 * Source. Undefined when it has none of them.
 */
function walked(
	sources: MorphemeSources,
	canonicalForm: string,
	walk: Walk,
): ShownMorpheme[] | undefined {
	const stored = sources.breakdown?.morphemes;
	if (stored !== undefined) return storedPieces(stored);
	const constituents = sources.breakdown?.constituents;
	if (constituents !== undefined)
		return constituents.flatMap((piece, index): ShownMorpheme[] => {
			const { letters, target } = piece;
			if (target === undefined)
				// Only a word's citation ending, last, is filler with letters
				// (ADR 0050); the walk labels it the Ending it is.
				return index === constituents.length - 1 &&
					/\p{L}/u.test(letters)
					? [
							{
								kind: "Morpheme",
								letters,
								target: endingOf(walk.language, `-${letters}`),
							},
						]
					: [{ kind: "Filler", letters }];
			if (target.family === "Morpheme")
				return [{ kind: "Morpheme", letters, target }];
			return partPieces(target, letters, walk, false);
		});
	const source = sources.source;
	if (source !== undefined)
		return partPieces(source.target, canonicalForm, walk, true);
	return undefined;
}

/** The Unit Shadow of an Ending Morpheme of `language`. */
function endingOf(language: Dumling.Language, canonicalForm: string) {
	// Sound: every language's Morpheme route has the Ending Kind's Shadow
	// shape; a language that picks no Ending never stores a filler ending.
	return {
		language,
		family: "Morpheme",
		kind: "Ending",
		canonicalForm,
	} as LinkTarget;
}

/**
 * A Reading's Morphemic Breakdown as its Note shows it (ADR 0051): its
 * stored morphemes, else the ones propagated up its Constituents or through
 * its Source. Each step keeps the morphemes it inherits under that part's
 * shown letters and adds its own formant pieces and its own Ending:
 * `spannen` = `spann · en`, `entspannen` = `ent · spann · en`, `Entspannung`
 * = `ent · spann · ung · ∅`, and `Lauf` ← `laufen` = `lauf · ∅`. A part
 * whose morphemes aren't known yet, a pending Shadow included, shows as one
 * unsplit chunk that fills in once the part is stored and broken down.
 *
 * The word's own Ending is the citation ending its Constituents show as
 * filler (`verarzten`), else the Ending its last part brings to the word's
 * end (`einkaufen`), else the zero ending when `policy` gives the word's
 * Kind one. An unsplit chunk that closes the word keeps the word's ending
 * inside it, as `ent · spannen` keeps its `-en`: `Kohle · kraftwerk` while
 * both parts are pending, and `ge · sung · en` with the letters a Source
 * left around the Root `sing` unsplit. Undefined for a phraseme or
 * Morpheme Reading, which has no Morphemic Breakdown, and for a word with
 * no Breakdown and no Source. Nothing is stored, generated or mutated.
 */
export function propagateMorphemes(
	owner: {
		readonly reading: Dumling.Reading;
		readonly knowledge: MorphemeSources;
	},
	lookup: LookupMorphemeSources,
	policy: MorphemePolicy,
): readonly ShownMorpheme[] | undefined {
	const { language, family, kind, canonicalForm } = owner.reading.lemma;
	if (family !== "Lexeme") return undefined;
	const stored = owner.knowledge.breakdown?.morphemes;
	if (stored !== undefined) return storedPieces(stored);
	const pieces = walked(owner.knowledge, canonicalForm, {
		language,
		lookup,
		seen: new Set(),
	});
	if (pieces === undefined) return undefined;
	// A zero ending inherited at the end is the part's, never the word's.
	const shown = pieces.filter((piece) => !isZeroEnding(piece));
	const last = shown.at(-1);
	if (last !== undefined && (isEnding(last) || last.kind === "Unsplit"))
		return shown;
	return policy.zeroEndingKinds.has(kind)
		? [
				...shown,
				{
					kind: "Morpheme",
					letters: "",
					target: endingOf(language, zeroEndingCanonicalForm),
				},
			]
		: shown;
}
