import { NoteSection } from "lego";

import type { ReadingDefaultRenderer } from "../../../renderer";

export const renderReadingDefinition = (({
	noteData,
	PresentationCapabilities,
}) => {
	if (!PresentationCapabilities.knowledgeSettings.definition) return null;
	if (!noteData.knowledge.definition) return null;
	return (
		<NoteSection aria-label="Definition" label="">
			<p className="px-2 py-1 leading-relaxed text-ink text-pretty">
				{noteData.knowledge.definition}
			</p>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
