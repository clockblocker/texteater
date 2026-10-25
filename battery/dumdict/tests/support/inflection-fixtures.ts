import { readingIdentityKey, syncretize } from "dumling";
import type * as Dumling from "dumling/types";
import { variantIdOf } from "dumrel";
import type * as Dumrel from "dumrel/types";

import { type LemmaSlice, makeSurfaceId } from "../../src";

/** Lemmas, Readings and Surfaces of the toy pack's tests (system ADR 0048). */
export const lemmaOf = <K extends "NOUN" | "VERB">(
	kind: K,
	canonicalForm: string,
): Dumling.Lemma<"de", "Lexeme", K> =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind,
		canonicalForm,
		coreFeatures:
			kind === "NOUN" ? { gender: "Fem" } : { hasSepPrefix: null },
	}) as Dumling.Lemma<"de", "Lexeme", K>;

export const readingOf = (
	lemma: Dumling.Lemma<"de">,
	emojiDescription: string,
): Dumling.Reading<"de"> =>
	({ unitKind: "Reading", lemma, emojiDescription }) as Dumling.Reading<"de">;

export const key = (reading: Dumling.Reading<"de">) =>
	readingIdentityKey(reading);

export function nounSurface(
	lemma: Dumling.Lemma<"de">,
	normalizedSurface: string,
	grammaticalCase: "Nom" | "Acc" | "Dat" | "Gen" | null,
	number: "Sing" | "Plur" | null,
): Dumling.Surface<"de"> {
	return {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { case: grammaticalCase, gender: null, number },
	} as Dumling.Surface<"de">;
}

type Finite = {
	readonly tense?: "Pres" | "Past";
	readonly mood?: "Ind" | "Sub";
	readonly person: "1" | "2" | "3";
	readonly number: "Sing" | "Plur";
	readonly passive?: boolean;
};

export function verbSurface(
	lemma: Dumling.Lemma<"de">,
	normalizedSurface: string,
	finite: Finite | "Participle",
): Dumling.Surface<"de"> {
	const composition = { expletive: null, perfect: null, future: null };
	const inflectionalFeatures =
		finite === "Participle"
			? {
					mood: null,
					number: null,
					person: null,
					tense: null,
					verbForm: "Part",
					participleForm: "Past",
					...composition,
					voice: null,
					passive: null,
				}
			: {
					mood: finite.mood ?? "Ind",
					number: finite.number,
					person: finite.person,
					tense: finite.tense ?? "Past",
					verbForm: "Fin",
					...composition,
					voice: finite.passive ? "Pass" : null,
					passive: finite.passive ? "Process" : null,
				};
	return {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface,
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures,
	} as Dumling.Surface<"de">;
}

/**
 * A Lemma Paradigm from plain forms: `licences` maps a Reading to the forms
 * it takes; a Reading not listed is Unstated.
 */
export function paradigmOf(
	lemma: Dumling.Lemma<"de">,
	dimensions: Partial<
		Record<
			Dumrel.DimensionId,
			{
				readonly variants: readonly string[];
				readonly licences?: readonly [
					Dumling.Reading<"de">,
					readonly string[],
				][];
			}
		>
	>,
): Dumrel.LemmaParadigm {
	const id = (dimension: Dumrel.DimensionId, value: string) =>
		variantIdOf(lemma, dimension, value);
	return {
		dimensions: Object.fromEntries(
			Object.entries(dimensions).map(([name, spec]) => {
				const dimension = name as Dumrel.DimensionId;
				return [
					dimension,
					{
						variants: (spec?.variants ?? []).map((value) => ({
							id: id(dimension, value),
							value,
							provenance: "Produced" as const,
						})),
						licences: Object.fromEntries(
							(spec?.licences ?? []).map(([reading, values]) => [
								key(reading),
								values.map((value) => id(dimension, value)),
							]),
						),
					},
				];
			}),
		),
	};
}

/** One occurrence: its ref, the Reading it was judged to be and the Surface it realized. */
export type Occurrence = readonly [
	ref: string,
	reading: Dumling.Reading<"de">,
	surface: Dumling.Surface<"de">,
];

/**
 * A Lemma Slice: the Readings, the Surfaces of the occurrences and any kept
 * ones, and each Reading's links.
 */
export function sliceOf(input: {
	readonly lemma: Dumling.Lemma<"de">;
	readonly paradigm?: Dumrel.LemmaParadigm;
	readonly readings: readonly Dumling.Reading<"de">[];
	readonly occurrences?: readonly Occurrence[];
	readonly kept?: readonly Dumling.Surface<"de">[];
}): LemmaSlice<"de"> {
	const occurrences = input.occurrences ?? [];
	const surfaces = [
		...occurrences.map(([, , surface]) => surface),
		...(input.kept ?? []),
	];
	const ids = new Set<string>();
	return {
		lemmaRecord: {
			lemma: input.lemma,
			...(input.paradigm ? { paradigm: input.paradigm } : {}),
		},
		readingEntries: input.readings.map((reading) => ({
			reading,
			attestedTranslations: [],
			attestationLinks: occurrences
				.filter(([, judged]) => key(judged) === key(reading))
				.map(([ref, , surface]) => ({
					ref,
					surfaceId: makeSurfaceId("de", surface),
					reading,
				})),
			notes: "",
		})),
		ownedSurfaceEntries: surfaces.flatMap((surface) => {
			const id = makeSurfaceId("de", surface);
			if (ids.has(id)) return [];
			ids.add(id);
			return [
				{
					id,
					surface,
					ownerLemma: input.lemma,
					attestedTranslations: [],
					attestations: [],
					notes: "",
				},
			];
		}),
		pendingRelations: [],
	};
}

export const jeder: Dumling.Lemma<"de", "Lexeme", "PRON"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "jeder",
	coreFeatures: {
		case: null,
		number: null,
		person: null,
		polite: null,
		poss: null,
		pronType: "Tot",
		gender: null,
	},
};
const stem = (
	normalizedSurface: string,
	gender: "Masc" | "Neut" | null,
): Dumling.Surface<"de", "Lexeme", "PRON"> => ({
	unitKind: "Surface",
	language: "de",
	lemma: jeder,
	normalizedSurface,
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	inflectionalFeatures: {
		case: "Dat",
		gender,
		number: "Sing",
		"gender[psor]": null,
		"number[psor]": null,
	},
});
/** `jedem`, the dative of jeder in the Masc or the Neut (ADR 0046). */
export const jedem = syncretize([stem("jedem", "Masc"), stem("jedem", "Neut")]);
