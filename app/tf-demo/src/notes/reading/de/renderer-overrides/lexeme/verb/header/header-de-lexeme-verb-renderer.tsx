import type { ReactNode } from "react";
import type { ReadingNoteBlockRenderer } from "../../../../../reading-note-render-context";
import { ReadingHeader } from "../../../../../renderers/default/header-renderer";

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
}) satisfies ReadingNoteBlockRenderer<"de", "Lexeme", "VERB">;

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
