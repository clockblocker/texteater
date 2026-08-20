import type { NoteBlockKindFor } from "../note-block-kind";
import { renderDefaultShadowNoteHeader } from "./renderers/default/header-renderer";
import { renderDefaultShadowNoteRelations } from "./renderers/default/relations-renderer";
import type { ShadowNoteDefaultRenderer } from "./shadow-note-render-context";

export const DEFAULT_SHADOW_NOTE_RENDERER_FOR = {
	Header: renderDefaultShadowNoteHeader,
	Relations: renderDefaultShadowNoteRelations,
} satisfies Record<NoteBlockKindFor<"ShadowNote">, ShadowNoteDefaultRenderer>;
