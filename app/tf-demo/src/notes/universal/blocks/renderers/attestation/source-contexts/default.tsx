import { NoteSection } from "lego";

import type { GrammaticalDefaultRenderer } from "../../../renderer";
import { citedOrigin, SourceQuote } from "../../common/source-quote";

/** The one Sentence this Attestation lives in, with its members lit. */
export const renderDefaultAttestationSource = (({
	noteData,
	PresentationCapabilities,
	Citation,
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
				origin={citedOrigin(source.origin, Citation)}
				follow={() => PresentationCapabilities.follow(source.target)}
			/>
		</NoteSection>
	);
}) satisfies GrammaticalDefaultRenderer<"Attestation">;
