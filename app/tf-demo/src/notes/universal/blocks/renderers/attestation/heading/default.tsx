import { NoteTitle, NoteTitleRow } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";

/**
 * An Attestation is the form exactly as it was met in a Text. The headword
 * is the attested spelling.
 */
export const renderDefaultAttestationHeading = (({ noteData }) => {
	const attested = noteData.presented.members
		.map(({ attested }) => attested)
		.join(" ");
	return (
		<header>
			<NoteTitleRow>
				<NoteTitle data-attestation-title="">{attested}</NoteTitle>
			</NoteTitleRow>
		</header>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
