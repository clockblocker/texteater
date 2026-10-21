import type { ReadingDefaultRenderer } from "../../universal/blocks/renderer";
import { ReadingHeading } from "../../universal/blocks/renderers/reading/heading/default";

/** Hebrew cites its bare Lemma, not a German gender article. */
export const renderHebrewReadingHeading = (({
	noteData,
	PresentationCapabilities,
}) => (
	<ReadingHeading
		note={noteData}
		capabilities={PresentationCapabilities}
		title={
			<bdi lang="he" dir="rtl">
				{noteData.reading.lemma.canonicalForm}
			</bdi>
		}
	/>
)) satisfies ReadingDefaultRenderer;
