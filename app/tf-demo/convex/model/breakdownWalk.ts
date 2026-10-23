import { zeroEndingCanonicalForm } from "dumling";
import type * as Dumrel from "dumrel/types";

/**
 * Read-time Breakdown logic (ADR 0050, ADR 0051) with no database access: the
 * Morphemic Breakdown a Reading shows, walked up its Constituents or Source,
 * and the group a formation joins in its base's Formations. The walk is the
 * Breakdowns prototype's stand-in (#1241 build step 4); once Dumrel's
 * propagation lands, tf-demo calls that instead and this walk goes.
 */

/** One stored piece of a Breakdown: shown letters and, unless filler, a link. */
export type BreakdownPiece = NonNullable<
	NonNullable<Dumrel.ReadingKnowledge["breakdown"]>["constituents"]
>[number];

/** A route as a Lemma or a Unit Shadow names it. */
export type BreakdownRoute = {
	readonly family: string;
	readonly kind: string;
};

/** The stored Knowledge of a part's Reading that the walk descends into. */
export type WalkedPart = {
	readonly route: BreakdownRoute;
	readonly canonicalForm: string;
	readonly knowledge: Pick<Dumrel.ReadingKnowledge, "breakdown" | "source">;
};

/**
 * Loads a resolved part's stored Reading. Null while the part is a pending
 * Unit Shadow, or when its Lemma is stored with no Breakdown yet.
 */
export type LoadWalkedPart = (
	target: Dumrel.LinkTarget,
) => Promise<WalkedPart | null>;

/**
 * One piece of the shown Morphemic Breakdown. `Chunk` is a part whose own
 * morphemes are not known yet: its shown letters stay unsplit (ADR 0051).
 */
export type WalkedMorpheme = {
	readonly letters: string;
	readonly kind: string;
	readonly target: Dumrel.LinkTarget | null;
};

/** How far a walk follows Constituents before it stops; real chains are short. */
const MAX_WALK_DEPTH = 8;

/** Lexeme Kinds with an inflectional paradigm, so a zero ending marks an empty slot. */
const inflectingKinds = new Set([
	"NOUN",
	"PROPN",
	"VERB",
	"AUX",
	"ADJ",
	"DET",
	"PRON",
]);

function endingTarget(language: string, letters: string): Dumrel.UnitShadow {
	return {
		language,
		family: "Morpheme",
		kind: "Ending",
		canonicalForm: letters === "" ? zeroEndingCanonicalForm : `-${letters}`,
	} as Dumrel.UnitShadow;
}

function isEnding(piece: WalkedMorpheme): boolean {
	return piece.kind === "Ending";
}

/** Case- and umlaut-insensitive, as a piece's shown letters may be (ADR 0050). */
function fold(letters: string): string {
	return letters
		.toLocaleLowerCase("de")
		.normalize("NFD")
		.replace(/\p{M}/gu, "");
}

/**
 * A part's morphemes re-lettered under the letters the owning word shows for
 * it: `entspannen`'s `ent · spann · en` under `Entspann` is `Ent · spann`, and
 * `Gast`'s `gast · ∅` under `Gäst` is `Gäst · ∅`. What the letters don't
 * reach is dropped. Null when the letters don't spell the part's morphemes,
 * so the caller shows the part as one chunk.
 */
export function inheritUnderLetters(
	pieces: readonly WalkedMorpheme[],
	letters: string,
): WalkedMorpheme[] | null {
	const inherited: WalkedMorpheme[] = [];
	let position = 0;
	for (const piece of pieces) {
		const rest = letters.length - position;
		if (rest === 0) {
			if (piece.letters === "") inherited.push(piece);
			continue;
		}
		const taken = Math.min(piece.letters.length, rest);
		const shown = letters.slice(position, position + taken);
		if (fold(piece.letters.slice(0, taken)) !== fold(shown)) return null;
		inherited.push({ ...piece, letters: shown });
		position += taken;
	}
	return position === letters.length ? inherited : null;
}

function storedMorphemes(pieces: readonly BreakdownPiece[]): WalkedMorpheme[] {
	return pieces.map(({ letters, target }) => ({
		letters,
		kind: target?.kind ?? "Ending",
		target: target ?? null,
	}));
}

/**
 * The step's own Ending: a trailing citation ending shown as filler
 * (`verarzt|en`), an Ending inherited from the last part (`ein|kaufen`),
 * nothing after a chunk, which keeps its own, else a zero ending when the
 * word inflects (`Entspann|ung` → `∅`).
 */
function withOwnEnding(
	pieces: WalkedMorpheme[],
	owner: BreakdownRoute,
	language: string,
): WalkedMorpheme[] {
	const last = pieces.at(-1);
	if (!last || last.kind === "Chunk" || isEnding(last)) return pieces;
	if (owner.family !== "Lexeme" || !inflectingKinds.has(owner.kind))
		return pieces;
	return [
		...pieces,
		{ letters: "", kind: "Ending", target: endingTarget(language, "") },
	];
}

async function fromConstituents(
	owner: BreakdownRoute,
	pieces: readonly BreakdownPiece[],
	load: LoadWalkedPart,
	depth: number,
): Promise<WalkedMorpheme[]> {
	const lastLinked = pieces.findLastIndex(({ target }) => target);
	const language =
		pieces.find(({ target }) => target)?.target?.language ?? "de";
	const walked: WalkedMorpheme[] = [];
	for (const [index, { letters, target }] of pieces.entries()) {
		if (!target) {
			// A trailing citation ending is the word's Ending; a hyphen or a
			// space inside the word is no morpheme.
			if (index > lastLinked && /\p{L}/u.test(letters))
				walked.push({
					letters,
					kind: "Ending",
					target: endingTarget(language, letters),
				});
			continue;
		}
		if (target.family === "Morpheme") {
			walked.push({ letters, kind: target.kind, target });
			continue;
		}
		const part = await load(target);
		const own = part ? await walk(part, load, depth + 1) : null;
		const inherited = own ? inheritUnderLetters(own, letters) : null;
		if (!inherited) {
			walked.push({ letters, kind: "Chunk", target });
			continue;
		}
		// A zero ending inside the word, before a part or a citation ending,
		// marks no slot of the whole word.
		walked.push(
			...(index === pieces.length - 1
				? inherited
				: inherited.filter(
						(piece) => !(isEnding(piece) && piece.letters === ""),
					)),
		);
	}
	return withOwnEnding(walked, owner, language);
}

/**
 * Through a Source (ADR 0051): `Lauf` keeps `lauf` from `laufen` under its
 * own letters and adds its own ∅.
 */
async function fromSource(
	owner: BreakdownRoute,
	canonicalForm: string,
	source: Dumrel.Source,
	load: LoadWalkedPart,
	depth: number,
): Promise<WalkedMorpheme[] | null> {
	const part = await load(source.target);
	const own = part ? await walk(part, load, depth + 1) : null;
	if (!own) return null;
	const stem = own.filter((piece) => !isEnding(piece));
	const reached: WalkedMorpheme[] = [];
	let position = 0;
	for (const piece of stem) {
		const end = position + piece.letters.length;
		const shown = canonicalForm.slice(position, end);
		if (shown.length < piece.letters.length) break;
		if (fold(shown) !== fold(piece.letters)) break;
		reached.push({ ...piece, letters: shown });
		position = end;
	}
	if (reached.length === 0) return null;
	const rest = canonicalForm.slice(position);
	const pieces: WalkedMorpheme[] =
		rest === ""
			? reached
			: [...reached, { letters: rest, kind: "Chunk", target: null }];
	return withOwnEnding(pieces, owner, source.target.language);
}

async function walk(
	part: WalkedPart,
	load: LoadWalkedPart,
	depth: number,
): Promise<WalkedMorpheme[] | null> {
	if (depth > MAX_WALK_DEPTH) return null;
	const { breakdown, source } = part.knowledge;
	if (breakdown?.morphemes) return storedMorphemes(breakdown.morphemes);
	if (breakdown?.constituents)
		return fromConstituents(
			part.route,
			breakdown.constituents,
			load,
			depth,
		);
	if (source)
		return fromSource(part.route, part.canonicalForm, source, load, depth);
	return null;
}

/**
 * The Morphemic Breakdown a Reading shows (ADR 0051): its stored morphemes
 * for a bottom word, else its Constituents or Source walked up, each pending
 * part shown as one chunk. Phrasemes and Morphemes have none.
 */
export function walkMorphemes(
	part: WalkedPart,
	load: LoadWalkedPart,
): Promise<WalkedMorpheme[] | null> {
	if (part.route.family !== "Lexeme") return Promise.resolve(null);
	return walk(part, load, 0);
}

export const formationGroupValues = [
	"Prefixed",
	"Compounds",
	"Derivations",
	"Phrases",
] as const;

export type FormationGroup = (typeof formationGroupValues)[number];

/**
 * Which group of its base's Formations a formation joins (ADR 0050), by the
 * Kind of its other pieces: a phraseme is a phrase, a Prefix makes a prefixed
 * word, a Suffix a derivation, and words alone a compound. An Interfix
 * changes nothing.
 */
export function formationGroupOf(
	owner: BreakdownRoute,
	constituents: readonly BreakdownPiece[],
): FormationGroup {
	if (owner.family === "Locution" || owner.family === "Saying")
		return "Phrases";
	const formants = constituents.flatMap(({ target }) =>
		target?.family === "Morpheme" ? [target.kind] : [],
	);
	if (formants.includes("Prefix")) return "Prefixed";
	if (formants.includes("Suffix") || formants.includes("Suffixoid"))
		return "Derivations";
	return "Compounds";
}
