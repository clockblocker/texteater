import type * as Dumrel from "dumrel/types";

/**
 * Read-time Breakdown logic (ADR 0050, ADR 0051) with no database access:
 * the stored parts Dumrel's `propagateMorphemes` walks, gathered up front
 * because its lookup is synchronous and the database is not, and the group
 * a formation joins in its base's Formations.
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

/**
 * Loads the Breakdown and Source of every stored Reading a part resolves to
 * that has either: none while the part is a pending Unit Shadow, or when its
 * Lemma is stored with neither yet. The walk keeps a split only where the
 * Readings agree (ADR 0051).
 */
export type LoadMorphemeSources = (
	target: Dumrel.LinkTarget,
) => Promise<readonly Dumrel.MorphemeSources[]>;

/** Matches `propagateMorphemes`' own depth guard; real chains are short. */
const MAX_WALK_DEPTH = 8;

const keyOf = ({ language, family, kind, canonicalForm }: Dumrel.LinkTarget) =>
	`${language}/${family}/${kind}/${canonicalForm}`;

/** The parts the walk descends into from one word: word parts and its Source. */
function walkedTargets(sources: Dumrel.MorphemeSources): Dumrel.LinkTarget[] {
	if (sources.breakdown?.morphemes) return [];
	const parts = (sources.breakdown?.constituents ?? []).flatMap(
		({ target }) =>
			target && target.family !== "Morpheme" ? [target] : [],
	);
	return sources.source ? [...parts, sources.source.target] : parts;
}

/**
 * Every stored part a word's morpheme walk can reach, loaded level by level,
 * as the synchronous lookup `propagateMorphemes` takes.
 */
export async function prefetchMorphemeSources(
	owner: Dumrel.MorphemeSources,
	load: LoadMorphemeSources,
): Promise<Dumrel.LookupMorphemeSources> {
	const loaded = new Map<string, readonly Dumrel.MorphemeSources[]>();
	let level = walkedTargets(owner);
	for (let depth = 0; depth < MAX_WALK_DEPTH && level.length > 0; depth++) {
		const fresh = [
			...new Map(
				level
					.filter((target) => !loaded.has(keyOf(target)))
					.map((target) => [keyOf(target), target]),
			).values(),
		];
		const sources = await Promise.all(fresh.map(load));
		for (const [index, target] of fresh.entries())
			loaded.set(keyOf(target), sources[index] ?? []);
		level = sources.flat().flatMap(walkedTargets);
	}
	return (target) => loaded.get(keyOf(target)) ?? [];
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
