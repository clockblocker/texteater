import { sameReading } from "dumling";
import type * as Dumling from "dumling/types";

import type {
	ReconcileAttestationLinksRequest,
	RemoveOccurrenceRequest,
	RemoveReadingRequest,
} from "../../public";
import type { OccurrenceSlice } from "../../storage";
import {
	reconcileAttestationLinks,
	sameAttestationLink,
} from "../occurrence/links";
import { planLinkRemoval } from "./remove-links";
import type { PlanMutationResult } from "./result";

const noLink = "No stored Attestation Link has the ref.";

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
		{
			dropped: (link) => link.ref === request.ref,
			keepsEmptyReadings: request.emptyReading === "Keep",
		},
		{ removed: "Removed the occurrence.", none: noLink },
	);
}

/** Plans removing one Reading; one the store doesn't hold plans nothing. */
export function planRemoveReading<L extends Dumling.Language>(
	slice: OccurrenceSlice<L>,
	request: RemoveReadingRequest<L>,
): PlanMutationResult<L> {
	const removesReading = (reading: Dumling.Reading<L>) =>
		sameReading(reading, request.reading);
	return planLinkRemoval(
		slice,
		{ dropped: (link) => removesReading(link.reading), removesReading },
		{
			removed: "Removed the Reading.",
			none: "No stored Reading is the requested one.",
		},
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
		{
			dropped: (link) =>
				dropped.some((other) => sameAttestationLink(other, link)),
		},
		{ removed: "Reconciled the Attestation Links.", none: noLink },
	);
}
