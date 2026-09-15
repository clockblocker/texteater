import { Button, IconSwap, NoteSection } from "lego";
import { ChevronDownIcon, LoaderCircleIcon } from "lucide-react";

import type { ReadingDefaultRenderer } from "../../../renderer";
import { SourceQuote } from "../../common/source-quote";

export const renderDefaultReadingSourceContexts = (({
	PresentationCapabilities,
}) => {
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
				<ul className="grid gap-5 compact:gap-3">
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
