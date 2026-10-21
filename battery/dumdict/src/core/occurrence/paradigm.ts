import { canonicalJson } from "common-utils";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	parseLemmaParadigm,
	pruneParadigm,
} from "dumrel";
import type * as Dumrel from "dumrel/types";

import type { PlannedChangeOp, StoreRevision } from "../../domain-types";

type Paradigm = Dumrel.LemmaParadigm;

/** A record's Paradigm, if any, is one its Lemma's route takes (Dumrel). */
export function paradigmFitsLemma(value: {
	readonly lemma: Dumling.Lemma;
	readonly paradigm?: Paradigm;
}): boolean {
	return (
		value.paradigm === undefined ||
		parseLemmaParadigm({ lemma: value.lemma, paradigm: value.paradigm })
			.success
	);
}

/** The Paradigm as Dumdict stores it: none when it holds no variants. */
export function storedParadigm(
	paradigm: Paradigm | undefined,
): Paradigm | undefined {
	return paradigm === undefined ||
		Object.keys(paradigm.dimensions).length === 0
		? undefined
		: paradigm;
}

function sameParadigm(
	left: Paradigm | undefined,
	right: Paradigm | undefined,
): boolean {
	const a = storedParadigm(left);
	const b = storedParadigm(right);
	return a === undefined || b === undefined
		? a === b
		: canonicalJson(a) === canonicalJson(b);
}

/**
 * The `setLemmaParadigm` change that takes a Lemma from one Paradigm to
 * another, or none when they are the same.
 */
export function paradigmChange<L extends Dumling.Language>(
	revision: StoreRevision,
	lemma: Dumling.Lemma<L>,
	before: Paradigm | undefined,
	after: Paradigm | undefined,
): PlannedChangeOp<L>[] {
	if (sameParadigm(before, after)) return [];
	const paradigm = storedParadigm(after);
	return [
		{
			type: "setLemmaParadigm",
			lemma,
			...(paradigm && { paradigm }),
			preconditions: [
				{ kind: "revisionMatches", revision },
				{ kind: "lemmaExists", lemma },
			],
		},
	];
}

/**
 * Applies Paradigm Changes with the Lemma's Readings (Dumrel), answering the
 * Paradigm Dumdict stores, or why the changes fail.
 */
export function applyParadigm<L extends Dumling.Language>(input: {
	readonly lemma: Dumling.Lemma<L>;
	readonly readings: readonly Dumling.Reading<L>[];
	readonly paradigm: Paradigm | undefined;
	readonly changes: readonly Dumrel.ParadigmChange[];
}):
	| { readonly ok: true; readonly paradigm: Paradigm | undefined }
	| { readonly ok: false; readonly message: string } {
	if (input.changes.length === 0)
		return { ok: true, paradigm: input.paradigm };
	const applied = applyParadigmChanges({
		lemma: input.lemma,
		readings: input.readings,
		paradigm: input.paradigm ?? { dimensions: {} },
		changes: input.changes,
	});
	return applied.success
		? { ok: true, paradigm: storedParadigm(applied.value) }
		: { ok: false, message: applied.error.message };
}

/** The Paradigm once only `readings` remain (ADR 0043, ADR 0048). */
export function prunedParadigm<L extends Dumling.Language>(
	paradigm: Paradigm | undefined,
	readings: readonly Dumling.Reading<L>[],
): Paradigm | undefined {
	return paradigm === undefined
		? undefined
		: storedParadigm(
				pruneParadigm(paradigm, readings.map(readingIdentityKey)),
			);
}

function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Merges concurrent writers' copies of one Lemma's Paradigm (system ADR
 * 0048): variants by content id, and each Reading's Licence as the union of
 * the Licences the copies state for it. A Reading no copy states a Licence
 * for stays Unstated. Of two copies of one variant, the one whose canonical
 * JSON is code-unit-smaller is kept, so the answer never depends on the
 * order of `paradigms`. The merge then drops what no listed Reading
 * licenses, and fails, with Dumrel's reason, when it breaks an invariant,
 * such as a Licence holding a marker beside a form.
 */
export function reconcileLemmaParadigms(input: {
	readonly lemma: Dumling.Lemma;
	readonly readings: readonly Dumling.Reading[];
	readonly paradigms: readonly Paradigm[];
}): Dumrel.ParadigmParse {
	const dimensions: Record<
		string,
		{
			variants: Map<string, Dumrel.ParadigmVariant>;
			licences: Map<string, Set<string>>;
		}
	> = {};
	for (const paradigm of input.paradigms)
		for (const [name, dimension] of Object.entries(paradigm.dimensions)) {
			if (dimension === undefined) continue;
			const merged = dimensions[name] ?? {
				variants: new Map(),
				licences: new Map(),
			};
			dimensions[name] = merged;
			for (const variant of dimension.variants) {
				const stored = merged.variants.get(variant.id);
				if (
					stored === undefined ||
					compare(canonicalJson(variant), canonicalJson(stored)) < 0
				)
					merged.variants.set(variant.id, variant);
			}
			for (const [reading, ids] of Object.entries(dimension.licences)) {
				const licence = merged.licences.get(reading) ?? new Set();
				for (const id of ids) licence.add(id);
				merged.licences.set(reading, licence);
			}
		}
	const union: Paradigm = {
		dimensions: Object.fromEntries(
			Object.entries(dimensions).map(([name, merged]) => [
				name,
				{
					variants: [...merged.variants.values()],
					licences: Object.fromEntries(
						[...merged.licences].map(([reading, ids]) => [
							reading,
							[...ids],
						]),
					),
				},
			]),
		),
	};
	return parseLemmaParadigm({
		lemma: input.lemma,
		readings: input.readings,
		paradigm: pruneParadigm(union, input.readings.map(readingIdentityKey)),
	});
}
