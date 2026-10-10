import { NoteTitle } from "lego";

import {
	attestationCaption,
	attestationNextTitle,
} from "../../../../caption/caption";
import {
	CaptionedTitleRow,
	captionLanguages,
} from "../../../../caption/heading-caption";
import type { GrammaticalDefaultRenderer } from "../../../renderer";

/**
 * An Attestation is the form exactly as it was met in a Text. The headword
 * is the attested spelling; the caption says what that spelling is to the
 * next Card in front of it.
 */
export const renderDefaultAttestationHeading = (({ noteData }) => {
	const { presented, source } = noteData;
	const attested = presented.members
		.map(({ attested }) => attested)
		.join(" ");
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
						<bdi>{attested}</bdi>
					</NoteTitle>
				}
				caption={caption}
			/>
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
