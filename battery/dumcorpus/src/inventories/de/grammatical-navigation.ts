import type * as Dumling from "dumling/types";
import { sameValue, sameValueKey } from "../../same-value.js";
import type { AuthoredMember } from "../member.js";
import { authoredMembers } from "./inventory.js";

type NavigableLemma =
	| Dumling.Lemma<"de", "Lexeme", "PRON">
	| Dumling.Lemma<"de", "Lexeme", "DET">;
type NavigableFeature = NavigableLemma extends infer Lemma extends Dumling.Lemma
	? keyof Lemma["coreFeatures"]
	: never;

type NavigationIndex = {
	readonly byLemmaKey: ReadonlyMap<string, readonly AuthoredMember[]>;
	readonly pillarCellsByKind: ReadonlyMap<string, readonly AuthoredMember[]>;
	readonly coreKeysByKind: ReadonlyMap<string, ReadonlySet<string>>;
};

let cachedIndex: NavigationIndex | undefined;

function navigationIndex(): NavigationIndex {
	if (cachedIndex !== undefined) return cachedIndex;
	const byLemmaKey = new Map<string, AuthoredMember[]>();
	const pillarCellsByKind = new Map<string, AuthoredMember[]>();
	const coreKeysByKind = new Map<string, Set<string>>();
	for (const member of authoredMembers) {
		const lemmaKey = sameValueKey(member.lemma);
		if (lemmaKey !== undefined) {
			let bucket = byLemmaKey.get(lemmaKey);
			if (bucket === undefined) {
				bucket = [];
				byLemmaKey.set(lemmaKey, bucket);
			}
			bucket.push(member);
		}
		const { kind } = member.lemma;
		if (kind !== "PRON" && kind !== "DET") continue;
		const coreKey = sameValueKey(member.lemma.coreFeatures);
		if (coreKey !== undefined) {
			let keys = coreKeysByKind.get(kind);
			if (keys === undefined) {
				keys = new Set<string>();
				coreKeysByKind.set(kind, keys);
			}
			keys.add(coreKey);
		}
		if (isParadigmCell(member.lemma)) {
			let cells = pillarCellsByKind.get(kind);
			if (cells === undefined) {
				cells = [];
				pillarCellsByKind.set(kind, cells);
			}
			cells.push(member);
		}
	}
	cachedIndex = { byLemmaKey, pillarCellsByKind, coreKeysByKind };
	return cachedIndex;
}

/** Whether a PRON or DET Lemma is a pillar's Paradigm Cell: it marks its cell in Core. */
function isParadigmCell(lemma: Dumling.Lemma): boolean {
	const core: Readonly<Record<string, unknown>> = lemma.coreFeatures;
	return ["case", "number", "gender"].some(
		(coordinate) => (core[coordinate] ?? null) !== null,
	);
}

/**
 * Whether a cell marks a coordinate. Plural agreement has no gender, so a
 * plural cell's unmarked gender still counts as its gender.
 */
function marks(core: Readonly<Record<string, unknown>>, key: string): boolean {
	return (
		(core[key] ?? null) !== null ||
		(key === "gender" && core.number === "Plur")
	);
}

/**
 * Whether a singular cell with gender null serves the source's gender: its
 * form serves two genders alike (ihm, dem), and the source's gender has no
 * cell of its own there (system ADR 0044). er and es reach ihm; die reaches
 * der Dat.Fem.Sg, never dem.
 */
function servesGender(
	source: Readonly<Record<string, unknown>>,
	candidate: Dumling.Lemma,
	coreKeys: ReadonlySet<string>,
): boolean {
	const core: Readonly<Record<string, unknown>> = candidate.coreFeatures;
	if ((core.gender ?? null) !== null || core.number !== "Sing") return false;
	if ((source.gender ?? null) === null) return false;
	const ownKey = sameValueKey({ ...core, gender: source.gender });
	return ownKey === undefined || !coreKeys.has(ownKey);
}

/**
 * Other Paradigm Cells of a reviewed pillar PRON or DET (system ADR 0019):
 * cells of the same Kind that differ only in the varied Core Features. Both
 * ends must mark every varied feature, so `man`, with case unmarked, is
 * never reached by varying case and reaches nothing that way. A gender-null
 * cell is reached from each gender it serves. A stem Lemma (dieser, mein)
 * has no other cells, since its forms are its own Surfaces, and a Lemma no
 * inventory authors has no reviewed ones, so both return none. Throws on a
 * coordinate the source's Core lacks.
 */
export function selectGrammaticalAlternatives(input: {
	readonly source: NavigableLemma;
	readonly vary: readonly NavigableFeature[];
}): readonly Dumling.Reading<"de">[] {
	const index = navigationIndex();
	const sourceKey = sameValueKey(input.source);
	if (
		sourceKey === undefined ||
		!(
			index.byLemmaKey
				.get(sourceKey)
				?.some((member) => sameValue(member.lemma, input.source)) ??
			false
		)
	)
		return [];
	if (
		input.vary.some((key) => !Object.hasOwn(input.source.coreFeatures, key))
	)
		throw new Error("Unknown feature coordinate.");
	const sourceCore: Readonly<Record<string, unknown>> =
		input.source.coreFeatures;
	if (
		!isParadigmCell(input.source) ||
		input.vary.some((key) => !marks(sourceCore, key))
	)
		return [];
	const varied = new Set<string>(input.vary);
	const cells = index.pillarCellsByKind.get(input.source.kind) ?? [];
	const coreKeys =
		index.coreKeysByKind.get(input.source.kind) ?? new Set<string>();
	const sourceEntries = Object.entries(sourceCore);
	return cells
		.filter((member) => {
			const core: Readonly<Record<string, unknown>> =
				member.lemma.coreFeatures;
			return (
				!sameValue(member.lemma, input.source) &&
				input.vary.every((key) => marks(core, key)) &&
				sourceEntries.every(
					([key, value]) =>
						varied.has(key) ||
						sameValue(value, core[key]) ||
						(key === "gender" &&
							servesGender(sourceCore, member.lemma, coreKeys)),
				)
			);
		})
		.map((member) => member.reading);
}
