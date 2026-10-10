import { NoteTitle } from "lego";

import {
	attestationCaption,
	attestationNextTitle,
} from "../../../../caption/caption";
import {
	CaptionedTitleRow,
	captionLanguages,
} from "../../../../caption/heading-caption";
import { UnitTitle, unitTitleParts } from "../../../../caption/unit-title";
import type { GrammaticalDefaultRenderer } from "../../../renderer";

/**
 * An Attestation is the form exactly as it was met in a Text. Its title is
 * the whole unit as written, the clicked piece emphasised when a click dealt
 * it; the caption says what the written words are to the next Card in front
 * of it.
 */
export const renderDefaultAttestationHeading = (({
	noteData,
	PresentationCapabilities,
}) => {
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
			attestationNextTitle({
				...presented.surface,
				canonicalForm: presented.surface.lemma.canonicalForm,
			}),
			languages,
		);
	return (
		<header>
			<CaptionedTitleRow
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
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
