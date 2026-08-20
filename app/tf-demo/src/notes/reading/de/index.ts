import type { NoteBlockKindFor } from "../../note-block-kind";
import type { ReadingNoteRouteFor } from "../reading-note-route";
import { DE_READING_NOTE_BLOCK_MAP } from "./block-map";
import { DE_READING_NOTE_RENDERER_OVERRIDES } from "./de-renderer-overrides";

function blockKindsFor(
	route: ReadingNoteRouteFor<"de">,
): ReadonlySet<NoteBlockKindFor<"UnitReadingNote">> {
	const familyMap = DE_READING_NOTE_BLOCK_MAP[route.family] as Record<
		string,
		ReadonlySet<NoteBlockKindFor<"UnitReadingNote">>
	>;
	return familyMap[route.kind];
}

export const deReadingNoteModule = {
	blockKindsFor,
	rendererOverrides: DE_READING_NOTE_RENDERER_OVERRIDES,
};
