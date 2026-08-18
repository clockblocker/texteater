import type { SupportedLanguage } from "../../dumling";
import { makeSurfaceId } from "../../dumling";
import type { EnsureOwnedSurfaceRequest } from "../../public";
import type { NewNoteSlice } from "../../storage";
import type { PlanMutationRejected, PlanMutationResult } from "./result";

export function planEnsureOwnedSurface<L extends SupportedLanguage>(
	slice: NewNoteSlice<L>,
	request: EnsureOwnedSurfaceRequest<L>,
): PlanMutationResult<L> | PlanMutationRejected {
	if (!slice.existingLemma || !slice.existingReading) {
		return {
			status: "rejected",
			code: "readingMissing",
			message: "The Reading must exist before adding an owned Surface.",
		};
	}

	const { surface, note } = request.ownedSurface;
	const surfaceId = makeSurfaceId(
		request.reading.lemma.language as L,
		surface,
	);
	const alreadyStored = slice.existingOwnedSurfaces.some(
		(entry) => entry.id === surfaceId,
	);

	return {
		status: "planned",
		baseRevision: slice.revision,
		changes: alreadyStored
			? []
			: [
					{
						type: "createOwnedSurface",
						entry: {
							id: surfaceId,
							surface,
							ownerLemma: request.reading.lemma,
							...note,
						},
						preconditions: [
							{
								kind: "revisionMatches",
								revision: slice.revision,
							},
							{ kind: "readingExists", reading: request.reading },
							{
								kind: "lemmaExists",
								lemma: request.reading.lemma,
							},
							{ kind: "surfaceMissing", surfaceId },
						],
					},
				],
		affected: alreadyStored ? {} : { surfaceIds: [surfaceId] },
		summary: {
			message: alreadyStored
				? "Owned Surface already exists."
				: "Added owned Surface for an existing Reading.",
		},
	};
}
