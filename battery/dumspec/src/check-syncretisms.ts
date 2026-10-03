import { isSyncreticUnit, isSyncretism } from "dumling";
import type * as Dumling from "dumling/types";
import { stemSyncretismFor } from "./inventories/de/surface-syncretisms.js";
import { syncretismFor } from "./inventories/de/syncretisms.js";
import { sameValue } from "./same-value.js";

/** A Syncretism the inventory does not generate, at a path inside the checked Attestation. */
export type SyncretismIssue = {
	readonly path: string;
	readonly message: string;
};

/**
 * A Syncretism is generated, never authored (system ADR 0046). An
 * Attestation whose Lemma lists the features it leaves open must store the
 * whole Syncretism, with its units, exactly as the inventory generates it
 * with that identity. Its view, without units, is what a classifier answers,
 * not what gold stores. A hand-built Syncretism would otherwise pass, because
 * the authored-Reading check lets through any Lemma no member is. A stem's
 * Surface Syncretism is checked against the stem cells the inventory
 * generates it from.
 */
export function attestationSyncretismIssues(
	attestation: Dumling.Attestation,
): SyncretismIssue[] {
	const { surface } = attestation;
	if (isSyncreticUnit(surface)) return surfaceSyncretismIssues(surface);
	const { lemma } = surface;
	if (!isSyncreticUnit(lemma)) return [];
	const issue = (message: string) => [{ path: "surface.lemma", message }];
	if (!isSyncretism(lemma))
		return issue(
			"A Spec Record stores the whole Syncretism, with its units (ADR 0046)",
		);
	const generated = syncretismFor(lemma);
	if (!generated)
		return issue(
			"A Syncretism is generated, never authored; the inventory has none with this identity (ADR 0046)",
		);
	if (!sameValue(lemma, generated.lemma))
		return issue(
			"Store the Syncretism as the inventory generates it (ADR 0046)",
		);
	return [];
}

type Bag = Readonly<Record<string, unknown>>;
const bagOf = (surface: Dumling.Surface): Bag =>
	((surface as { inflectionalFeatures?: unknown }).inflectionalFeatures ??
		{}) as Bag;

/**
 * A stem's Surface Syncretism (system ADR 0046) is stored whole, and its
 * units are exactly the cells the inventory generates for its Lemma,
 * spelling, case and number: they differ in gender alone. Dumling has
 * already checked that its features are the units' projection.
 */
function surfaceSyncretismIssues(surface: Dumling.Surface): SyncretismIssue[] {
	const issue = (message: string) => [{ path: "surface", message }];
	if (!isSyncretism(surface))
		return issue(
			"A Spec Record stores the whole Syncretism, with its units (ADR 0046)",
		);
	const generated = stemSyncretismFor(surface);
	if (!generated)
		return issue(
			"A Syncretism is generated, never authored; the inventory has no stem Surface Syncretism with this Lemma, spelling, case and number (ADR 0046)",
		);
	const cellOf = (bag: Bag) =>
		JSON.stringify([
			bag.case ?? null,
			bag.number ?? null,
			bag.gender ?? null,
		]);
	const units = (surface.syncretized as readonly Dumling.Surface[])
		.map((unit) => cellOf(bagOf(unit)))
		.toSorted();
	const cells = generated.cells.map((cell) => cellOf(cell)).toSorted();
	if (!sameValue(units, cells) || !sameValue(surface.syncretic, ["gender"]))
		return issue(
			"Store the stem Surface Syncretism with the cells the inventory generates, open in gender alone (ADR 0046)",
		);
	return [];
}
