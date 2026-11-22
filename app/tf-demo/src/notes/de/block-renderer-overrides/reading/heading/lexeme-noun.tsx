import type { ReactNode } from "react";
import {
	coreGenders,
	type GrammaticalGender,
} from "../../../../../../shared/grammatical-gender";
import { citedNoteReading } from "../../../../universal/blocks/citation";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeading } from "../../../../universal/blocks/renderers/reading/heading/default";

const definiteArticle: Readonly<Record<GrammaticalGender, string>> = {
	Masc: "der",
	Fem: "die",
	Neut: "das",
};

/**
 * A German noun Reading's heading: its mixed-gender articles (if any) and
 * its Canonical Form. Discovered Valency Patterns live in the dedicated
 * Valency Block (ADR 0034).
 */
export const renderHeadingDeLexemeNoun = ((context) => {
	const { noteData, PresentationCapabilities, Citation } = context;
	const { lemma } = noteData.reading;
	const lead = articles(lemma);
	const citation = Citation(citedNoteReading(noteData));
	return (
		<ReadingHeading
			note={noteData}
			capabilities={PresentationCapabilities}
			citation={citation}
			title={
				lead ? (
					<>
						{lead}
						{lemma.canonicalForm}
					</>
				) : undefined
			}
		/>
	);
}) satisfies NoteBlockRenderer<"de", "Reading", "Lexeme", "NOUN">;

/**
 * A noun in free gender variation shows both articles, der/das Balg, since
 * its genders have no one tone (system ADR 0032). A noun of one gender shows
 * it by tone alone until #683 derives every noun's article.
 */
function articles(lemma: {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
}): ReactNode {
	const genders = coreGenders(lemma);
	if (genders.length < 2) return null;
	return (
		<span className="text-ink-muted">
			{genders.map((gender) => definiteArticle[gender]).join("/")}{" "}
		</span>
	);
}
