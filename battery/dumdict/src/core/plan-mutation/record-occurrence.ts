import type * as Dumling from "dumling/types";

import type { PlannedChangeOp } from "../../domain-types";
import { makeSurfaceId } from "../../dumling-id";
import type { RecordOccurrenceRequest } from "../../public";
import type { RecordOccurrenceContext } from "../../storage";
import { lemmaLanguage, readingLemma } from "../identity";
import { sameAttestationLink } from "../occurrence/links";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

/**
 * Plans one occurrence (system ADR 0049): the Lemma comes to own its Surface
 * if it does not yet, and the Reading gains its link. A ref the dictionary
 * already holds with this Surface and Reading plans nothing; with anything
 * else the occurrence is attested elsewhere, and moving it is explicit.
 */
export function planRecordOccurrence<L extends Dumling.Language>(
	context: RecordOccurrenceContext<L>,
	request: RecordOccurrenceRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	const { link, surface } = request;
	if (!context.existingLemma || !context.existingReading)
		return {
			status: "rejected",
			code: "readingMissing",
			message: "The Reading must exist before it records an occurrence.",
		};
	const [stored, ...others] = context.attestationLinksWithRefs;
	if (stored !== undefined) {
		if (others.length > 0 || !sameAttestationLink(stored, link))
			return {
				status: "rejected",
				code: "occurrenceAttestedElsewhere",
				message:
					"The occurrence is already attested with another Surface or Reading.",
			};
		return {
			status: "planned",
			baseRevision: context.revision,
			changes: [],
			affected: {},
			summary: { message: "The occurrence is already recorded." },
		};
	}

	const lemma = readingLemma(link.reading);
	const surfaceId = makeSurfaceId(lemmaLanguage(lemma), surface);
	const owned = context.existingOwnedSurfaces.some(
		(entry) => entry.id === surfaceId,
	);
	const changes: PlannedChangeOp<L>[] = [];
	if (!owned)
		changes.push({
			type: "createOwnedSurface",
			entry: {
				id: surfaceId,
				surface,
				ownerLemma: lemma,
				attestedTranslations: [],
				attestations: [],
				notes: "",
			},
			preconditions: [
				{ kind: "revisionMatches", revision: context.revision },
				{ kind: "lemmaExists", lemma },
				{ kind: "surfaceMissing", surfaceId },
			],
		});
	changes.push({
		type: "patchReading",
		reading: link.reading,
		ops: [{ kind: "addAttestationLink", link }],
		preconditions: [
			{ kind: "revisionMatches", revision: context.revision },
			{ kind: "readingExists", reading: link.reading },
			{ kind: "attestationMissing", ref: link.ref },
			...(owned ? [{ kind: "surfaceExists" as const, surfaceId }] : []),
		],
	});
	return {
		status: "planned",
		baseRevision: context.revision,
		changes,
		affected: {
			readings: [link.reading],
			...(owned ? {} : { surfaceIds: [surfaceId] }),
		},
		summary: { message: "Recorded the occurrence." },
	};
}
