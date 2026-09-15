import { NoteSection } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { SourceQuote } from "../../common/source-quote";

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
			<SourceQuote
				segments={source.segments}
				memberSegmentIndices={source.memberSegmentIndices}
				origin={source.origin}
				follow={() => PresentationCapabilities.follow(source.target)}
			/>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
