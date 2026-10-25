import { Fragment, type ReactNode } from "react";
import {
	type CitationPart,
	citationPartText,
	citedNoteReading,
} from "../../../../universal/blocks/citation";
import type { NoteBlockRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeading } from "../../../../universal/blocks/renderers/reading/heading/default";

/**
 * A verb's heading is its Citation (`sich erinnern`), with a separable
 * prefix split off its base: `sich vor|stellen`.
 */
export const renderHeadingDeLexemeVerb = (({
	noteData,
	PresentationCapabilities,
	Citation,
}) => {
	const { hasSepPrefix } = noteData.reading.lemma.coreFeatures;
	const citation = Citation(citedNoteReading(noteData));

	return (
		<ReadingHeading
			note={noteData}
			capabilities={PresentationCapabilities}
			citation={citation}
			title={citation.map((part, index) => (
				<Fragment key={`${index}:${part.kind}`}>
					{index > 0 ? " " : null}
					{citedPart(part, hasSepPrefix)}
				</Fragment>
			))}
		/>
	);
}) satisfies NoteBlockRenderer<"de", "Reading", "Lexeme", "VERB">;

function citedPart(
	part: CitationPart,
	separablePrefix: string | null,
): ReactNode {
	if (part.kind === "Reflexive") return citationPartText(part);
	const verb = part.text;
	if (
		separablePrefix &&
		verb.startsWith(separablePrefix) &&
		verb.length > separablePrefix.length
	) {
		return (
			<>
				{separablePrefix}
				<span className="text-ink-muted">|</span>
				{verb.slice(separablePrefix.length)}
			</>
		);
	}
	return verb;
}
