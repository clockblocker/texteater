import { NoteTitle } from "lego";

import {
	attestationCaption,
	attestationNextTitle,
} from "../../../../caption/caption";
import {
	CaptionedHeading,
	captionLanguages,
} from "../../../../caption/heading-caption";
import { UnitTitle, unitTitleParts } from "../../../../caption/unit-title";
import type { GrammaticalDefaultRenderer } from "../../../renderer";

type AttestationContext = Parameters<
	GrammaticalDefaultRenderer<"Attestation">
>[0];

/**
 * An Attestation is the form exactly as it was met in a Scroll. Its title is
 * the whole unit as written, the clicked piece emphasised when a click dealt
 * it; the caption says what the written words are to the next Card in front
 * of it. The caption names a Surface by its stored form unless the
 * language prints it otherwise (`surfaceTitle`).
 */
export function AttestationHeading({
	context: { noteData, PresentationCapabilities },
	surfaceTitle,
}: {
	readonly context: AttestationContext;
	readonly surfaceTitle?: string;
}) {
	const { presented, source } = noteData;
	const languages = captionLanguages(presented.surface.language);
	const caption =
		languages &&
		attestationCaption(
			{
				members: presented.members,
				valencyMembers: presented.valencyMembers,
				kind: presented.surface.lemma.kind,
				segments: source.segments,
				memberSegmentIndices: source.memberSegmentIndices,
			},
			attestationNextTitle(presented.surface, surfaceTitle),
			languages,
		);
	return (
		<CaptionedHeading
			presentation={PresentationCapabilities.presentation}
			title={
				<NoteTitle data-attestation-title="">
					<UnitTitle
						parts={unitTitleParts(
							source.segments,
							source.memberSegmentIndices,
							PresentationCapabilities.clickedSegmentIndex,
						)}
					/>
				</NoteTitle>
			}
			caption={caption}
		/>
	);
}
