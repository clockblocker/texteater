import type { ReactNode } from "react";
import type { ReadingNoteBlockRenderer } from "../../../../../reading-note-render-context";
import { ReadingHeader } from "../../../../../renderers/default/header-renderer";

export const renderHeaderDeLexemeVerb = (({ note, capabilities }) => {
	const { hasSepPrefix, lexicallyReflexive } =
		note.reading.lemma.coreFeatures;

	return (
		<ReadingHeader
			note={note}
			capabilities={capabilities}
			title={verbCanonicalForm(
				note.reading.lemma.canonicalForm,
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
