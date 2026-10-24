import { ParsingError } from "common-utils/validation";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	checkChange,
	contextOf,
	failed,
	issue,
	paradigmIssue,
	parseIn,
	pruneParadigm,
} from "./paradigm.js";
import { variantIdOf } from "./paradigm-policy.js";
import type {
	DimensionId,
	LemmaParadigm,
	ParadigmChange,
	ParadigmParse,
	ParadigmVariant,
	ReadingKey,
	VariantId,
} from "./types.js";

type MutableDimension = {
	variants: ParadigmVariant[];
	licences: Record<ReadingKey, VariantId[]>;
};
type MutableParadigm = {
	dimensions: Partial<Record<DimensionId, MutableDimension>>;
};

/**
 * Applies Paradigm Changes in order, atomically, and answers the Paradigm, or
 * the first failure without a partial value (ADR 0048):
 *
 * - **Contribute** adds a variant, keyed by its content; a variant already
 *   stored keeps its value and provenance.
 * - **Correct** replaces a variant's value and re-keys it, rewriting every
 *   Licence that names it; a value whose key another variant has merges the
 *   two.
 * - **License** adds variants to a Reading's Licence. An Unstated Reading
 *   gets an explicit Licence of just these, which is how a produced Reading's
 *   Licence is stated: an Unstated Reading already takes every variant, so a
 *   caller that wants it to keep taking every one leaves it Unstated.
 * - **Unlicense** takes variants from a Reading's Licence, which must keep at
 *   least one.
 * - **Retract** removes a variant, from every Licence too; a dimension left
 *   with none goes, and a Licence it would leave empty is a failure.
 *
 * `readings` are the Lemma's Readings, every License's Reading among them.
 * After the last change, every variant no Reading licenses is removed, as
 * `pruneParadigm` removes it, so the invariants hold between change lists,
 * not between the changes of one list: Contribute then License keeps the
 * variant.
 */
export function applyParadigmChanges(input: {
	readonly lemma: Dumling.Lemma;
	readonly readings: readonly Dumling.Reading[];
	readonly paradigm: unknown;
	readonly changes: readonly unknown[];
}): ParadigmParse {
	const context = contextOf(input.lemma, input.readings);
	if (context instanceof ParsingError) return failed(context);
	const { lemma } = context;
	const keys = context.readings ?? [];
	const current = parseIn(context, input.paradigm);
	if (current instanceof ParsingError) return failed(current);
	const next = toMutable(current);
	for (const [index, raw] of input.changes.entries()) {
		const change = checkChange(lemma, raw);
		if (change instanceof ParsingError)
			return failed(atChange(change, index));
		const failure = apply(lemma, next, change, keys);
		if (failure) return failed(atChange(failure, index));
	}
	const checked = paradigmIssue(lemma, pruneParadigm(next, keys), keys);
	return checked instanceof ParsingError
		? failed(checked)
		: { success: true, value: checked };
}

function apply(
	lemma: Dumling.Lemma,
	paradigm: MutableParadigm,
	change: ParadigmChange,
	readings: readonly ReadingKey[],
): ParsingError | undefined {
	const { dimension } = change;
	const stored = paradigm.dimensions[dimension];
	switch (change.kind) {
		case "Contribute": {
			const id = variantIdOf(lemma, dimension, change.value);
			const target = stored ?? { variants: [], licences: {} };
			if (!target.variants.some((variant) => variant.id === id))
				target.variants.push({
					id,
					value: change.value,
					provenance: change.provenance,
				});
			paradigm.dimensions[dimension] = target;
			return undefined;
		}
		case "Correct":
			return correct(lemma, stored, change);
		case "License":
		case "Unlicense":
			return relicense(stored, change, readings);
		case "Retract": {
			if (
				stored === undefined ||
				!stored.variants.some(
					(variant) => variant.id === change.variant,
				)
			)
				return missingVariant(dimension, change.variant);
			stored.variants = stored.variants.filter(
				(variant) => variant.id !== change.variant,
			);
			if (stored.variants.length === 0) {
				delete paradigm.dimensions[dimension];
				return undefined;
			}
			for (const [reading, ids] of Object.entries(stored.licences)) {
				const kept = ids.filter((name) => name !== change.variant);
				if (kept.length === 0)
					return issue(
						["variant"],
						"Retract would leave a Reading's Licence empty; License another variant first",
					);
				stored.licences[reading] = kept;
			}
			return undefined;
		}
	}
}

/** Correct: the variant's new value and id, every Licence naming it rewritten. */
function correct(
	lemma: Dumling.Lemma,
	stored: MutableDimension | undefined,
	change: Extract<ParadigmChange, { kind: "Correct" }>,
): ParsingError | undefined {
	const corrected = stored?.variants.find(
		(variant) => variant.id === change.variant,
	);
	if (stored === undefined || corrected === undefined)
		return missingVariant(change.dimension, change.variant);
	const id = variantIdOf(lemma, change.dimension, change.value);
	const merged =
		id !== corrected.id &&
		stored.variants.some((variant) => variant.id === id);
	stored.variants = merged
		? stored.variants.filter((variant) => variant !== corrected)
		: stored.variants.map((variant) =>
				variant === corrected
					? { ...variant, id, value: change.value }
					: variant,
			);
	for (const [reading, ids] of Object.entries(stored.licences))
		stored.licences[reading] = [
			...new Set(
				ids.map((name) => (name === change.variant ? id : name)),
			),
		];
	return undefined;
}

/** License or Unlicense: one Reading's Licence gains or loses variants. */
function relicense(
	stored: MutableDimension | undefined,
	change: Extract<ParadigmChange, { kind: "License" | "Unlicense" }>,
	readings: readonly ReadingKey[],
): ParsingError | undefined {
	const reading = readingIdentityKey(change.reading);
	if (!readings.includes(reading))
		return issue(
			["reading"],
			"A License or Unlicense names one of the Lemma's Readings",
		);
	const ids = new Set(stored?.variants.map((variant) => variant.id));
	const unknown = change.variants.find((name) => !ids.has(name));
	if (stored === undefined || unknown !== undefined)
		return missingVariant(
			change.dimension,
			unknown ?? change.variants[0] ?? "",
		);
	if (change.kind === "License") {
		stored.licences[reading] = [
			...new Set([
				...(stored.licences[reading] ?? []),
				...change.variants,
			]),
		];
		return undefined;
	}
	const kept = (
		stored.licences[reading] ?? stored.variants.map((variant) => variant.id)
	).filter((name) => !change.variants.includes(name));
	if (kept.length === 0)
		return issue(
			["variants"],
			"Unlicense would leave the Reading's Licence empty; License another variant first",
		);
	stored.licences[reading] = kept;
	return undefined;
}

const missingVariant = (dimension: DimensionId, variant: VariantId) =>
	issue(
		["variant"],
		`The ${dimension} dimension has no variant ${JSON.stringify(variant)}`,
	);

function toMutable(paradigm: LemmaParadigm): MutableParadigm {
	return structuredClone(paradigm) as MutableParadigm;
}

function atChange(error: ParsingError, index: number): ParsingError {
	return new ParsingError(
		error.issues.map((entry) => ({
			...entry,
			path: [
				"changes",
				index,
				...entry.path.filter((part) => part !== "change"),
			],
		})),
	);
}
