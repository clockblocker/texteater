import { Fragment } from "react";
import {
	type CitationPart,
	citationPartText,
} from "../../../../universal/blocks/citation";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { AttachedPrefix } from "../../../block-renderers/reading/valency/default";
import { ValencyHeading } from "./valency";

/**
 * A verb's heading is its Valency Line in citation order, `sich (an jN)
 * erinnern`, or its Citation (`sich erinnern`) while the frame shows
 * nothing. Either way a separable prefix is split off its base:
 * `sich (Dat) jN vor|stellen`.
 */
export const renderHeadingDeLexemeVerb = ((context) => {
	const { hasSepPrefix } = context.noteData.reading.lemma.coreFeatures;
	return (
		<ValencyHeading
			context={context}
			fallback={(citation) =>
				citation.map((part, index) => (
					<Fragment key={`${index}:${part.kind}`}>
						{index > 0 ? " " : null}
						{citedPart(part, hasSepPrefix)}
					</Fragment>
				))
			}
		/>
	);
}) satisfies NoteBlockRenderer<"de", "Reading", "Lexeme", "VERB">;

function citedPart(part: CitationPart, separablePrefix: string | null) {
	if (part.kind === "Reflexive") return citationPartText(part);
	const verb = part.text;
	return separablePrefix &&
		verb.startsWith(separablePrefix) &&
		verb.length > separablePrefix.length ? (
		<AttachedPrefix prefix={separablePrefix} verb={verb} />
	) : (
		verb
	);
}
