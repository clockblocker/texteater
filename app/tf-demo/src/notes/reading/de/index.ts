import type { ReactElement } from "react";

import type { NoteBlockKindFor } from "../../note-block-kind";
import type { ReadingNoteRenderContext } from "../reading-note-render-context";
import type {
	ReadingNoteRouteFor,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "../reading-note-route";
import { renderReadingNoteComposition } from "../render-reading-note";
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

/** Deep German Unit Reading Note rendering seam. */
export function renderGermanReadingNote<
	F extends UnitReadingFamilyFor<"de">,
	K extends UnitReadingKindFor<"de", F>,
>(context: ReadingNoteRenderContext<"de", F, K>): ReactElement {
	return renderReadingNoteComposition(
		context,
		blockKindsFor(context.route),
		DE_READING_NOTE_RENDERER_OVERRIDES,
	);
}
