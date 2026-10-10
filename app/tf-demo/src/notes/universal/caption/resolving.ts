import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../../convex/_generated/api";
import { attestationCaption, attestationNextTitle } from "./caption";
import { captionLanguages } from "./heading-caption";
import type { Caption } from "./wording";

type ResolutionNote = NonNullable<
	FunctionReturnType<typeof api.resolutionSessions.getResolutionNote>
>;

/**
 * The caption of a running Resolution's Attestation step, from what Grammar
 * read the clicked words as. None before Grammar has read them.
 */
export function resolvingAttestationCaption(
	note: ResolutionNote,
): Caption | null {
	const { grammar } = note;
	// A Resolution Session resolves German.
	const languages = captionLanguages("de");
	if (!grammar || !languages) return null;
	return attestationCaption(
		{
			members: grammar.members,
			valencyMembers: grammar.valencyMembers,
			kind: grammar.kind,
			segments: note.source.segments,
			memberSegmentIndices: note.source.memberSegmentIndices,
		},
		attestationNextTitle(grammar),
		languages,
	);
}
