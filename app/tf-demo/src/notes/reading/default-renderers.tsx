import type { ReadingNoteDefaultRenderer } from "./reading-note-render-context";
import { renderReadingDefinition } from "./renderers/default/definition-renderer";
import { renderDefaultReadingHeader } from "./renderers/default/header-renderer";
import { renderDefaultReadingRelations } from "./renderers/default/relations-renderer";
import { renderDefaultReadingSourceContexts } from "./renderers/default/source-contexts-renderer";
import { renderDefaultReadingTranslations } from "./renderers/default/translations-renderer";

export const renderEmptyReadingBlock: ReadingNoteDefaultRenderer = () => null;

export {
	renderDefaultReadingHeader,
	renderDefaultReadingRelations,
	renderDefaultReadingSourceContexts,
	renderDefaultReadingTranslations,
	renderReadingDefinition,
};
