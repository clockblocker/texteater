import type { ReactElement } from "react";

import { PageNavigation } from "@/components/page-navigation";
import type { NoteBlockKindFor } from "../note-block-kind";
import { orderNoteBlockKinds } from "../note-block-order";
import type { TargetLanguage } from "../target-language";
import { DEFAULT_READING_NOTE_RENDERER_FOR } from "./default-renderers";
import { ReadingNoteBlockErrorBoundary, renderErrorBlock } from "./error-block";
import type {
	ReadingNoteDefaultRenderer,
	ReadingNoteRenderContext,
} from "./reading-note-render-context";
import type {
	ReadingNoteRouteKey,
	UnitReadingFamilyFor,
	UnitReadingKindFor,
} from "./reading-note-route";
import {
	type ReadingNoteRendererOverrideRegistry,
	readingNoteRendererOverrideFor,
	selectReadingNoteRenderer,
} from "./renderer-overrides";

export function renderReadingNoteComposition<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	context: ReadingNoteRenderContext<L, F, K>,
	applicableBlockKinds: ReadonlySet<NoteBlockKindFor<"UnitReadingNote">>,
	rendererOverrides: ReadingNoteRendererOverrideRegistry<L>,
): ReactElement {
	return (
		<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header className="flex justify-end">
					<PageNavigation />
				</header>
				<article
					className="flex flex-col gap-5"
					aria-label="Reading note"
				>
					{renderReadingNoteBlocks(
						context,
						applicableBlockKinds,
						rendererOverrides,
					)}
				</article>
			</div>
		</main>
	);
}

export function renderReadingNoteBlocks<
	L extends TargetLanguage,
	F extends UnitReadingFamilyFor<L>,
	K extends UnitReadingKindFor<L, F>,
>(
	context: ReadingNoteRenderContext<L, F, K>,
	applicableBlockKinds: ReadonlySet<NoteBlockKindFor<"UnitReadingNote">>,
	rendererOverrides: ReadingNoteRendererOverrideRegistry<L>,
	defaultRenderers: Record<
		NoteBlockKindFor<"UnitReadingNote">,
		ReadingNoteDefaultRenderer
	> = DEFAULT_READING_NOTE_RENDERER_FOR,
): readonly ReactElement[] {
	const orderedBlockKinds = orderNoteBlockKinds(
		applicableBlockKinds,
	) as readonly NoteBlockKindFor<"UnitReadingNote">[];
	return orderedBlockKinds.flatMap((blockKind) => {
		const defaultRenderer = defaultRenderers[blockKind];
		const override = readingNoteRendererOverrideFor<L, F, K>(
			rendererOverrides,
			context.route as ReadingNoteRouteKey<L, F, K>,
			blockKind,
		);
		const renderer = selectReadingNoteRenderer(defaultRenderer, override);
		let rendered: ReactElement | null;
		try {
			// The route-indexed registry guarantees that this renderer and context
			// share one concrete L/F/K tuple. TypeScript represents a heterogeneous
			// lookup as a union of functions, whose safe call signature is `never`.
			rendered = renderer(context as never);
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
