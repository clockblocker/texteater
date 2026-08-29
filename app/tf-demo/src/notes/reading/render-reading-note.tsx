import type { ReactElement } from "react";

import type { TargetLanguage } from "../target-language";
import { ReadingNoteBlockErrorBoundary, renderErrorBlock } from "./error-block";
import type { ReadingBlockPlan } from "./reading-block-plan";
import type { ReadingNoteRenderContext } from "./reading-note-render-context";
import type {
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";

export function renderReadingNoteComposition<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	context: ReadingNoteRenderContext<L, F, K>,
	plan: ReadingBlockPlan<L, F, K>,
): ReactElement {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<article
					className="flex flex-col gap-5"
					aria-label="Reading note"
				>
					{renderReadingBlockPlan(context, plan)}
				</article>
			</div>
		</div>
	);
}

export function renderReadingBlockPlan<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	context: ReadingNoteRenderContext<L, F, K>,
	plan: ReadingBlockPlan<L, F, K>,
): readonly ReactElement[] {
	return plan.flatMap(({ blockKind, renderer }) => {
		let rendered: ReactElement | null;
		try {
			rendered = renderer(context);
		} catch (cause) {
			rendered = renderErrorBlock(blockKind, cause);
		}
		if (rendered === null) return [];

		return [
			<ReadingNoteBlockErrorBoundary
				key={`${context.note.reading.ownerKey}:${blockKind}`}
				blockKind={blockKind}
				resetToken={context}
			>
				{rendered}
			</ReadingNoteBlockErrorBoundary>,
		];
	});
}
