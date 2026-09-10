import { LoaderCircleIcon } from "lucide-react";

import type { ReadingDefaultRenderer } from "../../../renderer";

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
		<section
			className="reading-note__section reading-note__contexts"
			aria-label="Source Contexts"
		>
			<h2 className="reading-note__section-label">Source Contexts</h2>
			{sourceContexts.items.length > 0 ? (
				<ul className="reading-note__context-list">
					{sourceContexts.items.map((sourceContext) => (
						<li key={sourceContext.attestationId}>
							<button
								type="button"
								onClick={() =>
									PresentationCapabilities.follow(
										sourceContext.target,
									)
								}
								className="reading-note__context"
							>
								<span>{sourceContext.sentenceSnippet}</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
			{sourceContexts.hasMore ? (
				<button
					type="button"
					className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
					disabled={
						sourceContexts.isLoading ||
						sourceContexts.loadMore === null
					}
					onClick={() => void sourceContexts.loadMore?.()}
				>
					{sourceContexts.isLoading ? (
						<LoaderCircleIcon className="size-4 animate-spin" />
					) : null}
					{sourceContexts.isLoading
						? "Loading…"
						: "Load more Source Contexts"}
				</button>
			) : null}
			{sourceContexts.error ? (
				<p className="text-sm text-destructive" role="alert">
					{sourceContexts.error}
				</p>
			) : null}
		</section>
	);
}) satisfies ReadingDefaultRenderer;
