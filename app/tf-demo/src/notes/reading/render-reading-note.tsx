import "./reading-note.css";
import type { ReactElement } from "react";
import type { SupportedTargetLanguage } from "../../../shared/supported-target-language";
import { ReadingNoteBlockErrorBoundary, renderErrorBlock } from "./error-block";
import type { ReadingBlockPlan } from "./reading-block-plan";
import type { ReadingNoteRenderContext } from "./reading-note-render-context";
import type {
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";
import { ReadingMetadata } from "./renderers/default/header-renderer";

export function renderReadingNoteComposition<
	L extends SupportedTargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	context: ReadingNoteRenderContext<L, F, K>,
	plan: ReadingBlockPlan<L, F, K>,
): ReactElement {
	return (
		<div
			className="reading-note"
			data-note-presentation={
				context.PresentationCapabilities.presentation ?? "Sheet"
			}
		>
			<article
				className="reading-note__article"
				aria-label="Reading Note"
			>
				{renderReadingBlockPlan(context, plan)}
				{plan.some(({ blockKind }) => blockKind === "Header") ? (
					<ReadingMetadata lemma={context.noteData.reading.lemma} />
				) : null}
			</article>
		</div>
	);
}

export function renderReadingBlockPlan<
	L extends SupportedTargetLanguage,
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
				key={`${context.noteData.reading.ownerKey}:${blockKind}`}
				blockKind={blockKind}
				resetToken={context}
			>
				{rendered}
			</ReadingNoteBlockErrorBoundary>,
		];
	});
}
