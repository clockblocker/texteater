import type * as Dumling from "dumling/types";
import { sameValue } from "../../same-value.js";
import { authoredMembers } from "./inventory.js";

type NavigableLemma =
	| Dumling.Lemma<"de", "Lexeme", "PRON">
	| Dumling.Lemma<"de", "Lexeme", "DET">;
type NavigableFeature =
	| keyof Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"]
	| keyof Dumling.Lemma<"de", "Lexeme", "DET">["coreFeatures"];

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
): boolean {
	const core: Readonly<Record<string, unknown>> = candidate.coreFeatures;
	if ((core.gender ?? null) !== null || core.number !== "Sing") return false;
	if ((source.gender ?? null) === null) return false;
	const own = { ...core, gender: source.gender };
	return !authoredMembers.some(
		(member) =>
			member.lemma.kind === candidate.kind &&
			sameValue(member.lemma.coreFeatures, own),
	);
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
	if (
		!authoredMembers.some((member) => sameValue(member.lemma, input.source))
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
	return authoredMembers
		.filter((member) => {
			const core: Readonly<Record<string, unknown>> =
				member.lemma.coreFeatures;
			return (
				member.lemma.kind === input.source.kind &&
				isParadigmCell(member.lemma) &&
				!sameValue(member.lemma, input.source) &&
				input.vary.every((key) => marks(core, key)) &&
				Object.entries(sourceCore).every(
					([key, value]) =>
						varied.has(key) ||
						sameValue(value, core[key]) ||
						(key === "gender" &&
							servesGender(sourceCore, member.lemma)),
				)
			);
		})
		.map((member) => member.reading);
}
