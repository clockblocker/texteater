import { Button, IconSwap, NoteSection } from "lego";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { NoteDataFor } from "../../../../note/data";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { SourceQuote } from "../../common/source-quote";

type SourceContext = NoteDataFor<"Reading">["sourceContexts"]["page"][number];

/** A line under one quoted Source Context, such as its realized case. */
export type SourceContextCaption = (
	sourceContext: SourceContext,
	lemma: {
		readonly language: string;
		readonly canonicalForm: string;
		readonly coreFeatures: unknown;
	},
) => ReactNode;

/**
 * The Reading's Source Contexts, each quoted with its members lit. A route
 * may add a caption under each quote.
 */
export function readingSourceContextsRenderer(
	caption?: SourceContextCaption,
): ReadingDefaultRenderer {
	return (({ noteData, PresentationCapabilities }) => {
		const { sourceContexts } = PresentationCapabilities;
		if (
			sourceContexts.items.length === 0 &&
			!sourceContexts.hasMore &&
			sourceContexts.error === null
		) {
			return null;
		}

		return (
			<NoteSection
				aria-label="Source Contexts"
				label="Source Contexts"
				className="compact:before:hidden"
			>
				{sourceContexts.items.length > 0 ? (
					<ul className="grid gap-3">
						{sourceContexts.items.map((sourceContext) => (
							<li key={sourceContext.attestationId}>
								<SourceQuote
									segments={sourceContext.segments}
									memberSegmentIndices={
										sourceContext.memberSegmentIndices
									}
									origin={sourceContext.origin}
									follow={() =>
										PresentationCapabilities.follow(
											sourceContext.target,
										)
									}
								/>
								{caption?.(
									sourceContext,
									noteData.reading.lemma,
								)}
							</li>
						))}
					</ul>
				) : null}
				{sourceContexts.hasMore ? (
					<Button
						variant="outline"
						size="sm"
						className="mt-4 w-fit"
						disabled={
							sourceContexts.isLoading ||
							sourceContexts.loadMore === null
						}
						onClick={() => void sourceContexts.loadMore?.()}
					>
						<IconSwap
							data-icon="inline-start"
							active={sourceContexts.isLoading}
							idle={<ChevronDownIcon />}
							busy={<LoaderCircleIcon className="animate-spin" />}
						/>
						{sourceContexts.isLoading
							? "Loading…"
							: "Load more Source Contexts"}
					</Button>
				) : null}
				{sourceContexts.error ? (
					<p className="mt-2 text-sm text-destructive" role="alert">
						{sourceContexts.error}
					</p>
				) : null}
			</NoteSection>
		);
	}) satisfies ReadingDefaultRenderer;
}

export const renderDefaultReadingSourceContexts =
	readingSourceContextsRenderer();
