import { ParsingError } from "common-utils/validation";
import { parseUnit, readingIdentityKey, sameLemma } from "dumling";
import type * as Dumling from "dumling/types";
import { compare } from "./fingerprint.js";
import {
	isMarker,
	paradigmDimensions,
	variantIdOf,
	variantValueIssue,
} from "./paradigm-policy.js";
import type {
	DimensionId,
	LemmaParadigm,
	LicenceGroup,
	ParadigmChange,
	ParadigmDimension,
	ParadigmParse,
	ParadigmProvenance,
	ReadingKey,
	VariantId,
} from "./types.js";
import {
	parseLemmaParadigmShape,
	parseParadigmChangeShape,
} from "./validation.js";

type Path = (number | string)[];

export const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

const dimensionsOf = <P>(paradigm: LemmaParadigm<P>) =>
	Object.entries(paradigm.dimensions) as [
		DimensionId,
		ParadigmDimension<P>,
	][];

/**
 * The variants one Reading's sense takes in one dimension:
 * `licensed(R, d) = licences[R] ?? variants(d)`. A Reading with no Licence is
 * Unstated and takes every variant; a dimension the Paradigm lacks has none.
 * A Reading's key is its Dumling `readingIdentityKey`.
 */
export function licensed<P>(
	paradigm: LemmaParadigm<P>,
	dimension: DimensionId,
	reading: ReadingKey,
): readonly VariantId[] {
	const stored = paradigm.dimensions[dimension];
	if (stored === undefined) return [];
	return Object.hasOwn(stored.licences, reading)
		? (stored.licences[reading] ?? [])
		: stored.variants.map((variant) => variant.id);
}

/**
 * Whether a dimension is Free: every one of the Lemma's Readings takes every
 * variant (`melken`: `molk`, `melkte`). Otherwise it is Conditioned (`Bank`:
 * 🪑 `Bänke`, 🏦 `Banken`). Without a dimension, whether the Lemma is Free:
 * every dimension is. Both are derived, never stored (ADR 0048).
 */
export function isFree<P>(
	paradigm: LemmaParadigm<P>,
	readings: readonly ReadingKey[],
	dimension?: DimensionId,
): boolean {
	if (dimension === undefined)
		return dimensionsOf(paradigm).every(([name]) =>
			isFree(paradigm, readings, name),
		);
	const all = paradigm.dimensions[dimension]?.variants.length ?? 0;
	return readings.every((reading) => {
		const taken = paradigm.dimensions[dimension]?.licences[reading];
		return taken === undefined || taken.length === all;
	});
}

/**
 * The Lemma's Readings partitioned by what they license in every dimension
 * (ADR 0048). The Readings of one Licence Group share one inflection table,
 * every Reading is in exactly one group, and a Free Lemma has exactly one.
 * Each group's `selection` names its licensed variants per dimension and its
 * `key` spells them canonically. Groups and their Readings are in code-unit
 * order of the Readings' keys.
 */
export function licenceGroups<P>(
	paradigm: LemmaParadigm<P>,
	readings: readonly ReadingKey[],
): readonly LicenceGroup[] {
	const groups = new Map<
		string,
		{
			readings: ReadingKey[];
			selection: Partial<Record<DimensionId, VariantId[]>>;
		}
	>();
	const dimensions = dimensionsOf(paradigm)
		.map(([name]) => name)
		.sort(compare);
	for (const reading of [...new Set(readings)].sort(compare)) {
		const selection: Partial<Record<DimensionId, VariantId[]>> = {};
		for (const dimension of dimensions)
			selection[dimension] = [
				...licensed(paradigm, dimension, reading),
			].sort(compare);
		const key = JSON.stringify(
			dimensions.map((dimension) => [dimension, selection[dimension]]),
		);
		const group = groups.get(key);
		if (group) group.readings.push(reading);
		else groups.set(key, { readings: [reading], selection });
	}
	return [...groups].map(([key, group]) => ({ ...group, key }));
}

/**
 * The Paradigm once some of its Readings are gone: the Licences of Readings
 * not listed go, then every variant no listed Reading licenses, then every
 * dimension left without variants (ADR 0043, ADR 0048). A Lemma whose last
 * Reading goes takes its whole Paradigm.
 */
export function pruneParadigm<P>(
	paradigm: LemmaParadigm<P>,
	readings: readonly ReadingKey[],
): LemmaParadigm<P> {
	const kept = new Set(readings);
	const dimensions: Partial<Record<DimensionId, ParadigmDimension<P>>> = {};
	for (const [name, dimension] of dimensionsOf(paradigm)) {
		const licences = Object.fromEntries(
			Object.entries(dimension.licences)
				.filter(([reading]) => kept.has(reading))
				.map(([reading, ids]) => [reading, [...ids]]),
		);
		const unstated = [...kept].some(
			(reading) => !Object.hasOwn(licences, reading),
		);
		const taken = new Set(Object.values(licences).flat());
		const variants = dimension.variants
			.filter((variant) => unstated || taken.has(variant.id))
			.map((variant) => structuredClone(variant));
		if (variants.length > 0) dimensions[name] = { variants, licences };
	}
	return { dimensions };
}

/**
 * The Paradigm Changes that give one Reading the forms a writer listed for
 * one dimension: a Contribute per distinct variant, in the order listed, then
 * one License naming them all, so the Reading's Licence is explicit (ADR
 * 0048). Two spellings of one variant (`Banken`, `banken`) contribute the
 * first. An empty list gives no change.
 */
export function paradigmChangesFor(input: {
	readonly reading: Dumling.Reading;
	readonly dimension: DimensionId;
	readonly values: readonly string[];
	readonly provenance: ParadigmProvenance;
}): ParadigmChange[] {
	const { reading, dimension, provenance } = input;
	const contributions = new Map<VariantId, string>();
	for (const value of input.values) {
		const id = variantIdOf(reading.lemma, dimension, value);
		if (!contributions.has(id)) contributions.set(id, value);
	}
	if (contributions.size === 0) return [];
	return [
		...[...contributions.values()].map(
			(value): ParadigmChange => ({
				kind: "Contribute",
				dimension,
				value,
				provenance,
			}),
		),
		{
			kind: "License",
			dimension,
			reading: structuredClone(reading),
			variants: [...contributions.keys()],
		},
	];
}

/**
 * Checks a Lemma Paradigm against its Lemma and answers it fresh and in
 * canonical order, or why it is not one (ADR 0048):
 *
 * - every dimension is one its route's Paradigm Policy names, with at least
 *   one variant;
 * - every variant's value is a form or marker its dimension takes, and its id
 *   is the content key of its value, once per dimension;
 * - every Licence names existing variants, each once, and one holding a
 *   marker (`NoPlural`) holds nothing else.
 *
 * Given the Lemma's Readings, it also checks that every Licence is a listed
 * Reading's and that some listed Reading licenses every variant. Variants
 * come back sorted by id, Licences by key and each Licence's ids sorted.
 */
export function parseLemmaParadigm(input: {
	readonly lemma: Dumling.Lemma;
	readonly paradigm: unknown;
	readonly readings?: readonly Dumling.Reading[];
}): ParadigmParse {
	const context = contextOf(input.lemma, input.readings);
	if (context instanceof ParsingError) return failed(context);
	const parsed = parseIn(context, input.paradigm);
	return parsed instanceof ParsingError
		? failed(parsed)
		: { success: true, value: parsed };
}

/** A Lemma and the keys of its Readings, each parsed by Dumling. */
type ParadigmContext = {
	readonly lemma: Dumling.Lemma;
	readonly readings: readonly ReadingKey[] | undefined;
};

export function contextOf(
	lemma: Dumling.Lemma,
	readings: readonly Dumling.Reading[] | undefined,
): ParadigmContext | ParsingError {
	const parsed = parseLemma(lemma);
	if (parsed instanceof ParsingError) return parsed;
	const keys =
		readings === undefined ? undefined : readingKeysOf(parsed, readings);
	return keys instanceof ParsingError
		? keys
		: { lemma: parsed, readings: keys };
}

export function parseIn(
	context: ParadigmContext,
	paradigm: unknown,
): LemmaParadigm | ParsingError {
	const shape = parseLemmaParadigmShape(paradigm);
	return shape instanceof ParsingError
		? shape
		: paradigmIssue(context.lemma, shape, context.readings);
}

/**
 * Checks one Paradigm Change against its Lemma, and answers the change
 * Dumrel accepts, fresh, or why it fails: its dimension is one the route
 * names, a value is a form or marker the dimension takes, and a License's
 * Reading is a Reading of the Lemma. It checks no Paradigm.
 */
export function parseParadigmChange(input: {
	readonly lemma: Dumling.Lemma;
	readonly change: unknown;
}):
	| { readonly success: true; readonly value: ParadigmChange }
	| { readonly success: false; readonly error: ParsingError } {
	const lemma = parseLemma(input.lemma);
	if (lemma instanceof ParsingError) return failed(lemma);
	const change = checkChange(lemma, input.change);
	return change instanceof ParsingError
		? failed(change)
		: { success: true, value: change };
}

/**
 * The Paradigm in canonical order, or why it breaks an invariant. With the
 * Lemma's Reading keys, every Licence is one of theirs and every variant is
 * licensed by one of them.
 */
export function paradigmIssue(
	lemma: Dumling.Lemma,
	paradigm: LemmaParadigm,
	readings: readonly ReadingKey[] | undefined,
): LemmaParadigm | ParsingError {
	const policy = paradigmDimensions(lemma);
	const dimensions: Partial<Record<DimensionId, ParadigmDimension>> = {};
	const present = new Map(dimensionsOf(paradigm));
	for (const name of present.keys())
		if (!policy.includes(name))
			return issue(
				["paradigm", "dimensions", name],
				`A ${lemma.language} ${lemma.family} ${lemma.kind} Lemma has no ${name} dimension`,
			);
	for (const name of policy) {
		const dimension = present.get(name);
		if (dimension === undefined) continue;
		const path = ["paradigm", "dimensions", name];
		const checked = dimensionIssue(lemma, name, dimension, readings, path);
		if (checked instanceof ParsingError) return checked;
		dimensions[name] = checked;
	}
	return { dimensions };
}

function dimensionIssue(
	lemma: Dumling.Lemma,
	name: DimensionId,
	dimension: ParadigmDimension,
	readings: readonly ReadingKey[] | undefined,
	path: Path,
): ParadigmDimension | ParsingError {
	if (dimension.variants.length === 0)
		return issue(
			[...path, "variants"],
			"A dimension holds at least one variant",
		);
	const ids = new Set<VariantId>();
	for (const [index, variant] of dimension.variants.entries()) {
		const at = [...path, "variants", index];
		const problem = variantValueIssue(lemma, name, variant.value);
		if (problem) return issue([...at, "value"], problem);
		if (variant.id !== variantIdOf(lemma, name, variant.value))
			return issue(
				[...at, "id"],
				`A variant's id is the content key of its value: ${JSON.stringify(variantIdOf(lemma, name, variant.value))}`,
			);
		if (ids.has(variant.id))
			return issue(
				[...at, "id"],
				`The variant ${variant.id} is listed twice`,
			);
		ids.add(variant.id);
	}
	const licences: Record<ReadingKey, VariantId[]> = {};
	for (const reading of Object.keys(dimension.licences).sort(compare)) {
		const at = [...path, "licences", reading];
		const licence = dimension.licences[reading] ?? [];
		if (readings !== undefined && !readings.includes(reading))
			return issue(
				at,
				"A Licence belongs to one of the Lemma's Readings",
			);
		if (licence.length === 0)
			return issue(at, "A Licence names at least one variant");
		if (new Set(licence).size !== licence.length)
			return issue(at, "A Licence names each variant once");
		const unknown = licence.find((id) => !ids.has(id));
		if (unknown !== undefined)
			return issue(
				at,
				`A Licence names existing variants, not ${JSON.stringify(unknown)}`,
			);
		const markers = licence.filter((id) =>
			isMarker(
				lemma,
				name,
				dimension.variants.find((variant) => variant.id === id)
					?.value ?? "",
			),
		);
		if (markers.length > 0 && licence.length > 1)
			return issue(
				at,
				`A Licence holding the marker ${markers[0]} holds nothing else`,
			);
		licences[reading] = [...licence].sort(compare);
	}
	if (readings !== undefined) {
		const unstated = readings.some(
			(reading) => !Object.hasOwn(licences, reading),
		);
		const taken = new Set(Object.values(licences).flat());
		const loose = dimension.variants.find(
			(variant) => !unstated && !taken.has(variant.id),
		);
		if (loose !== undefined)
			return issue(
				[...path, "variants"],
				`No Reading licenses the variant ${loose.id}, so it is removed, not stored`,
			);
	}
	return {
		variants: [...dimension.variants]
			.sort((left, right) => compare(left.id, right.id))
			.map((variant) => ({ ...variant })),
		licences,
	};
}

/** One change's shape and its value against the Lemma, or why it fails. */
export function checkChange(
	lemma: Dumling.Lemma,
	input: unknown,
): ParadigmChange | ParsingError {
	const change = parseParadigmChangeShape(input);
	if (change instanceof ParsingError) return change;
	if (!paradigmDimensions(lemma).includes(change.dimension))
		return issue(
			["change", "dimension"],
			`A ${lemma.language} ${lemma.family} ${lemma.kind} Lemma has no ${change.dimension} dimension`,
		);
	if (change.kind === "Contribute" || change.kind === "Correct") {
		const problem = variantValueIssue(
			lemma,
			change.dimension,
			change.value,
		);
		if (problem) return issue(["change", "value"], problem);
	}
	if (
		(change.kind === "License" || change.kind === "Unlicense") &&
		!sameLemma(change.reading.lemma, lemma)
	)
		return issue(
			["change", "reading"],
			"The Reading is not one of the Lemma's",
		);
	return change;
}

function parseLemma(lemma: Dumling.Lemma): Dumling.Lemma | ParsingError {
	const parsed = parseUnit(lemma);
	if (!parsed.success) return parsed.error;
	return parsed.chain.unitKind === "Lemma"
		? parsed.chain.value
		: issue(["lemma", "unitKind"], "Expected a Dumling Lemma");
}

/** The keys of the Lemma's Readings, or why one is not a Reading of it. */
function readingKeysOf(
	lemma: Dumling.Lemma,
	readings: readonly Dumling.Reading[],
): ReadingKey[] | ParsingError {
	const keys: ReadingKey[] = [];
	for (const [index, reading] of readings.entries()) {
		const parsed = parseUnit(reading);
		if (
			!parsed.success ||
			parsed.chain.unitKind !== "Reading" ||
			!sameLemma(parsed.chain.value.lemma, lemma)
		)
			return issue(
				["readings", index],
				"Expected a Dumling Reading of the Paradigm's Lemma",
			);
		keys.push(readingIdentityKey(parsed.chain.value));
	}
	return keys;
}

export const failed = (error: ParsingError) =>
	({ success: false, error }) as const;
