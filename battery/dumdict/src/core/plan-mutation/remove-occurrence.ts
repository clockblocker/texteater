import type * as Dumling from "dumling/types";

import type {
	ReconcileAttestationLinksRequest,
	RemoveOccurrenceRequest,
} from "../../public";
import type { OccurrenceSlice } from "../../storage";
import {
	reconcileAttestationLinks,
	sameAttestationLink,
} from "../occurrence/links";
import { planLinkRemoval } from "./remove-links";
import type { PlanMutationResult } from "./result";

/**
 * Plans removing one occurrence: every stored link with its ref, and what
 * that leaves behind. A ref no link holds plans nothing.
 */
export function planRemoveOccurrence<L extends Dumling.Language>(
	slice: OccurrenceSlice<L>,
	request: RemoveOccurrenceRequest,
): PlanMutationResult<L> {
	return planLinkRemoval(
		slice,
		(link) => link.ref === request.ref,
		"Removed the occurrence.",
	);
}

/**
 * Plans merging the stored links of each requested ref as a set
 * (`reconcileAttestationLinks`): one stays, and each other is removed as
 * `removeOccurrence` removes it and reported under `removed`.
 */
export function planReconcileAttestationLinks<L extends Dumling.Language>(
	slice: OccurrenceSlice<L>,
	request: ReconcileAttestationLinksRequest,
): PlanMutationResult<L> {
	const refs = new Set(request.refs);
	const { dropped } = reconcileAttestationLinks(
		slice.lemmas.flatMap(({ readingEntries }) =>
			readingEntries.flatMap(({ attestationLinks }) =>
				attestationLinks.filter(({ ref }) => refs.has(ref)),
			),
		),
	);
	return planLinkRemoval(
		slice,
		(link) => dropped.some((other) => sameAttestationLink(other, link)),
		"Reconciled the Attestation Links.",
	);
}
