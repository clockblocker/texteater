import { isSyncreticUnit, isSyncretism } from "dumling";
import type * as Dumling from "dumling/types";
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
 * the authored-Reading check lets through any Lemma no member is.
 */
export function attestationSyncretismIssues(
	attestation: Dumling.Attestation,
): SyncretismIssue[] {
	const { lemma } = attestation.surface;
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
