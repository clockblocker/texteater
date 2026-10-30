import { type ReactNode, useContext } from "react";
import {
	type CitationPart,
	citedNoteReading,
} from "../../../../universal/blocks/citation";
import type { ReadingDefaultRenderer } from "../../../../universal/blocks/renderer";
import { ReadingHeading } from "../../../../universal/blocks/renderers/reading/heading/default";
import {
	ValencyLineParts,
	ValencyLineStyleContext,
} from "../../../block-renderers/reading/valency/default";
import { germanValencyLine } from "../../../block-renderers/reading/valency/valency-line";

type ReadingContext = Parameters<ReadingDefaultRenderer>[0];

/**
 * A valent Reading's heading: its emoji and its German Valency Line in
 * citation order, `mit jM zu tun haben`. While the frame shows nothing it
 * falls back to `fallback`, or to the bare Citation.
 */
export const renderHeadingDeValent = ((context) => (
	<ValencyHeading context={context} />
)) satisfies ReadingDefaultRenderer;

export function ValencyHeading({
	context: { noteData, PresentationCapabilities, Citation },
	lead,
	fallback,
}: {
	readonly context: ReadingContext;
	/** Printed before the line, as a noun's articles are. */
	readonly lead?: ReactNode;
	readonly fallback?: (citation: readonly CitationPart[]) => ReactNode;
}) {
	const style = useContext(ValencyLineStyleContext);
	const citation = Citation(citedNoteReading(noteData));
	const parts = germanValencyLine(
		noteData.reading.lemma,
		noteData.knowledge.valency,
		style,
		"Citation",
	);
	return (
		<ReadingHeading
			note={noteData}
			capabilities={PresentationCapabilities}
			citation={citation}
			title={
				parts ? (
					<>
						{lead}
						<ValencyLineParts parts={parts} />
					</>
				) : (
					fallback?.(citation)
				)
			}
		/>
	);
}
