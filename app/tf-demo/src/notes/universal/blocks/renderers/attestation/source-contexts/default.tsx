import { NoteSection, Quote } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { linkMembers } from "../../common/link-members";

/** The one Sentence this Attestation lives in, with its members lit. */
export const renderDefaultAttestationSource = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { source } = noteData;
	if (!source.sentenceSnippet) return null;
	return (
		<NoteSection
			aria-label="Source"
			label="Source"
			className="compact:before:hidden"
		>
			<Quote>
				{linkMembers(
					source.sentenceSnippet,
					noteData.presented.members.map(({ attested }) => attested),
					() => PresentationCapabilities.follow(source.target),
				)}
			</Quote>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
