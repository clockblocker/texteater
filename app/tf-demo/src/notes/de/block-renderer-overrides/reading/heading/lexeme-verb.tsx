import type { ReactNode } from "react";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeading } from "../../../../universal/blocks/renderers/reading/heading/default";

export const renderHeadingDeLexemeVerb = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { hasSepPrefix } = noteData.reading.lemma.coreFeatures;

	return (
		<ReadingHeading
			note={noteData}
			capabilities={PresentationCapabilities}
			title={verbCanonicalForm(
				noteData.reading.lemma.canonicalForm,
				hasSepPrefix,
			)}
		/>
	);
}) satisfies NoteBlockRenderer<"de", "Reading", "Lexeme", "VERB">;

function verbCanonicalForm(
	canonicalForm: string,
	separablePrefix: string | null,
): ReactNode {
	if (
		separablePrefix &&
		canonicalForm.startsWith(separablePrefix) &&
		canonicalForm.length > separablePrefix.length
	) {
		return (
			<>
				{separablePrefix}
				<span className="text-ink-muted">|</span>
				{canonicalForm.slice(separablePrefix.length)}
			</>
		);
	}
	return canonicalForm;
}
