import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import type { ReadingNoteBlockRenderer } from "../../../../../reading-note-render-context";

export const renderHeaderDeLexemeVerb = (({ note, capabilities }) => {
	const { hasGovPrep, hasSepPrefix, lexicallyReflexive } =
		note.reading.lemma.coreFeatures;

	return (
		<section aria-labelledby="reading-note-title">
			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
				<h1
					id="reading-note-title"
					className="flex flex-wrap items-baseline gap-x-2 text-2xl font-semibold tracking-tight sm:text-3xl"
				>
					<span>{note.reading.emojiDescription}</span>
					<span>
						{verbCanonicalForm(
							note.reading.lemma.canonicalForm,
							lexicallyReflexive === "Yes",
							hasSepPrefix,
						)}
					</span>
				</h1>
				{hasGovPrep ? (
					<Badge variant="secondary">{hasGovPrep}</Badge>
				) : null}
				{capabilities.knowledgeSettings.transcription &&
				note.knowledge.transcription ? (
					<span className="text-lg text-muted-foreground">
						/{note.knowledge.transcription}/
					</span>
				) : null}
			</div>
		</section>
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
