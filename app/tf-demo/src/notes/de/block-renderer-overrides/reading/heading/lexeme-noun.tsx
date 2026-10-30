import type { ReactNode } from "react";
import {
	coreGenders,
	type GrammaticalGender,
} from "../../../../../../shared/grammatical-gender";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { ValencyHeading } from "./valency";

const definiteArticle: Readonly<Record<GrammaticalGender, string>> = {
	Masc: "der",
	Fem: "die",
	Neut: "das",
};

/** A noun's heading: its articles, then its Valency Line or its Canonical Form. */
export const renderHeadingDeLexemeNoun = ((context) => {
	const { lemma } = context.noteData.reading;
	const lead = articles(lemma);
	return (
		<ValencyHeading
			context={context}
			lead={lead}
			fallback={() => (
				<>
					{lead}
					{lemma.canonicalForm}
				</>
			)}
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
