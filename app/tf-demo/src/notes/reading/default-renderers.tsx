import type { NoteBlockKindFor } from "../note-block-kind";
import type { ReadingNoteDefaultRenderer } from "./reading-note-render-context";
import { renderDefaultReadingHeader } from "./renderers/default/header-renderer";
import { renderDefaultReadingRelations } from "./renderers/default/relations-renderer";
import { renderDefaultReadingSourceContexts } from "./renderers/default/source-contexts-renderer";
import { renderDefaultReadingTranslations } from "./renderers/default/translations-renderer";

const renderNothing: ReadingNoteDefaultRenderer = () => null;

export const DEFAULT_READING_NOTE_RENDERER_FOR = {
	Header: renderDefaultReadingHeader,
	SourceContexts: renderDefaultReadingSourceContexts,
	Definition: renderNothing,
	Translations: renderDefaultReadingTranslations,
	Relations: renderDefaultReadingRelations,
	MorphologicalTree: renderNothing,
	LexicalBreakdown: renderNothing,
} satisfies Record<
	NoteBlockKindFor<"UnitReadingNote">,
	ReadingNoteDefaultRenderer
>;
