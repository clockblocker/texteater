import type { ReactNode } from "react";
import {
	coreGenders,
	type GrammaticalGender,
} from "../../../../../../shared/grammatical-gender";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeading } from "../../../../universal/blocks/renderers/reading/heading/default";

const definiteArticle: Readonly<Record<GrammaticalGender, string>> = {
	Masc: "der",
	Fem: "die",
	Neut: "das",
};

export const renderHeadingDeLexemeNoun = (({
	noteData,
	PresentationCapabilities,
}) => (
	<ReadingHeading
		note={noteData}
		capabilities={PresentationCapabilities}
		title={nounHeadword(noteData.reading.lemma)}
	/>
)) satisfies NoteBlockRenderer<"de", "Reading", "Lexeme", "NOUN">;

/**
 * A noun in free gender variation shows both articles, der/das Balg, since
 * its genders have no one tone (system ADR 0032). A noun of one gender shows
 * it by tone alone until #683 derives every noun's article.
 */
function nounHeadword(lemma: {
	readonly family: string;
	readonly kind: string;
	readonly canonicalForm: string;
	readonly coreFeatures: unknown;
}): ReactNode {
	const genders = coreGenders(lemma);
	if (genders.length < 2) return lemma.canonicalForm;
	return (
		<>
			<span className="text-ink-muted">
				{genders
					.map((gender) => definiteArticle[gender])
					.join("/")}{" "}
			</span>
			{lemma.canonicalForm}
		</>
	);
}
