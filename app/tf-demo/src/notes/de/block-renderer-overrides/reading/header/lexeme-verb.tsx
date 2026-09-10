import type { ReactNode } from "react";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeader } from "../../../../universal/blocks/renderers/reading/header/default";

export const renderHeaderDeLexemeVerb = (({
	noteData,
	PresentationCapabilities,
}) => {
	const { hasSepPrefix, lexicallyReflexive } =
		noteData.reading.lemma.coreFeatures;

	return (
		<ReadingHeader
			note={noteData}
			capabilities={PresentationCapabilities}
			title={verbCanonicalForm(
				noteData.reading.lemma.canonicalForm,
				lexicallyReflexive === "Yes",
				hasSepPrefix,
			)}
		/>
	);
}) satisfies NoteBlockRenderer<"de", "Reading", "Lexeme", "VERB">;

function verbCanonicalForm(
	canonicalForm: string,
	isLexicallyReflexive: boolean,
	separablePrefix: string | null,
): ReactNode {
	if (isLexicallyReflexive && canonicalForm.startsWith("sich ")) {
		return (
			<>
				<span className="text-muted-foreground">sich </span>
				{canonicalForm.slice("sich ".length)}
			</>
		);
	}
	if (
		separablePrefix &&
		canonicalForm.startsWith(separablePrefix) &&
		canonicalForm.length > separablePrefix.length
	) {
		return (
			<>
				{separablePrefix}
				<span className="text-muted-foreground">|</span>
				{canonicalForm.slice(separablePrefix.length)}
			</>
		);
	}
	return canonicalForm;
}
