import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";

import {
	planReconcileAttestationLinks,
	planRecordOccurrence,
	planRekeySurfaces,
	planRemoveOccurrence,
} from "../core/plan-mutation";
import {
	validateOccurrenceSlice,
	validateRekeySurfacesSlice,
} from "../core/validate-occurrence-slice";
import { validateReadingEntryContext } from "../core/validate-slice";
import { makeSurfaceId } from "../dumling-id";
import type {
	ReconcileAttestationLinksRequest,
	RecordOccurrenceRequest,
	RekeySurfacesRequest,
	RemoveOccurrenceRequest,
} from "../public";
import type {
	OccurrenceSlice,
	OccurrenceSliceRequest,
	RecordOccurrenceContext,
	RekeySurfacesSlice,
	RekeySurfacesSliceRequest,
} from "../storage";
import { storageRequestFor } from "./context-request";
import {
	parseRecordOccurrenceRequest,
	parseRekeySurfacesRequest,
} from "./request-parsing";
import {
	invalidRequest,
	ok,
	planned,
	rejected,
	type Workflow,
} from "./workflow";

/** The storage read `removeOccurrence` and `reconcileAttestationLinks` need. */
export function occurrenceSliceRequest(
	request: RemoveOccurrenceRequest | ReconcileAttestationLinksRequest,
): OccurrenceSliceRequest {
	return {
		refs: "ref" in request ? [request.ref] : [...new Set(request.refs)],
	};
}

/** The storage read `rekeySurfaces` needs: every old and new Surface ID. */
export function rekeySurfacesSliceRequest<L extends Dumling.Language>(
	request: RekeySurfacesRequest<L>,
): RekeySurfacesSliceRequest<L> {
	return {
		surfaceIds: [
			...new Set(
				request.rekeys.flatMap(({ from, to }) => {
					const owner: Dumling.Lemma<L> = to.lemma;
					return [from, makeSurfaceId(owner.language as L, to)];
				}),
			),
		],
	};
}

const validRef = (ref: unknown) => typeof ref === "string" && ref.length > 0;

export function recordOccurrence<L extends Dumling.Language>(
	language: L,
): Workflow<L, RecordOccurrenceRequest<L>, RecordOccurrenceContext<L>> {
	return {
		check(request) {
			const { link, surface } = request;
			if (
				link.reading.lemma.language !== language ||
				surface.lemma.language !== language
			)
				return invalidRequest(
					"The occurrence's Reading and Surface must use the dictionary language.",
				);
			if (!sameLemma(surface.lemma, link.reading.lemma))
				return rejected(
					"invalidDraft",
					"The occurrence's Surface must realize its Reading's Lemma.",
				);
			if (
				!validRef(link.ref) ||
				link.surfaceId !== makeSurfaceId(language, surface)
			)
				return invalidRequest(
					"The occurrence's link must have a ref and name its Surface's id.",
				);
			return ok(parseRecordOccurrenceRequest(language, request));
		},
		plan(context, request) {
			validateReadingEntryContext(
				language,
				context,
				storageRequestFor({ intent: "recordOccurrence", request }),
			);
			return planned(planRecordOccurrence(context, request));
		},
	};
}

export function removeOccurrence<L extends Dumling.Language>(
	language: L,
): Workflow<L, RemoveOccurrenceRequest, OccurrenceSlice<L>> {
	return {
		check: (request) =>
			validRef(request.ref)
				? ok(request)
				: invalidRequest("An occurrence's ref is a non-empty string."),
		plan(slice, request) {
			validateOccurrenceSlice(
				language,
				slice,
				occurrenceSliceRequest(request),
			);
			return planned(planRemoveOccurrence(slice, request));
		},
	};
}

export function reconcileAttestationLinks<L extends Dumling.Language>(
	language: L,
): Workflow<L, ReconcileAttestationLinksRequest, OccurrenceSlice<L>> {
	return {
		check: (request) =>
			request.refs.every(validRef)
				? ok(request)
				: invalidRequest("Every ref is a non-empty string."),
		plan(slice, request) {
			validateOccurrenceSlice(
				language,
				slice,
				occurrenceSliceRequest(request),
			);
			return planned(planReconcileAttestationLinks(slice, request));
		},
	};
}

export function rekeySurfaces<L extends Dumling.Language>(
	language: L,
): Workflow<L, RekeySurfacesRequest<L>, RekeySurfacesSlice<L>> {
	return {
		check(request) {
			const froms = request.rekeys.map(({ from }) => from);
			if (!froms.every(validRef) || new Set(froms).size !== froms.length)
				return invalidRequest(
					"Each re-keyed Surface ID is a non-empty string, named once.",
				);
			if (request.rekeys.some(({ to }) => to.lemma.language !== language))
				return invalidRequest(
					"Re-keyed Surfaces must use the dictionary language.",
				);
			return ok(parseRekeySurfacesRequest(language, request));
		},
		plan(slice, request) {
			validateRekeySurfacesSlice(
				language,
				slice,
				rekeySurfacesSliceRequest(request),
			);
			return planned(planRekeySurfaces(slice, request));
		},
	};
}
