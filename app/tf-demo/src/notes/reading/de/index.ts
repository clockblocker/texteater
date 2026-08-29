import type { ReactElement } from "react";

import { resolveReadingBlockPlan } from "../reading-block-plan";
import type { ReadingNoteRenderContext } from "../reading-note-render-context";
import type {
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "../reading-note-route";
import { renderReadingNoteComposition } from "../render-reading-note";

/** Deep German Unit Reading Note rendering seam. */
export function renderGermanReadingNote<
	F extends UnitReadingFamilyFor<"de">,
	K extends UnitReadingKindFor<"de", F>,
>(context: ReadingNoteRenderContext<"de", F, K>): ReactElement {
	const plan = resolveReadingBlockPlan(
		context.route,
		context.capabilities.blockLayout,
	);
	return renderReadingNoteComposition(context, plan);
}
