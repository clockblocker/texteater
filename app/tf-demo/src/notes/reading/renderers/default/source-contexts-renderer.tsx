import { LoaderCircleIcon } from "lucide-react";
import { Link } from "react-router-dom";

import type { ReadingNoteDefaultRenderer } from "../../reading-note-render-context";

export const renderDefaultReadingSourceContexts = (({ capabilities }) => {
	const { sourceContexts } = capabilities;
	if (
		sourceContexts.items.length === 0 &&
		!sourceContexts.hasMore &&
		sourceContexts.error === null
	) {
		return null;
	}

	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="source-contexts"
		>
			<h2 id="source-contexts" className="text-sm font-medium">
				Source Contexts
			</h2>
			{sourceContexts.items.length > 0 ? (
				<ul className="grid gap-2">
					{sourceContexts.items.map((sourceContext) => (
						<li key={sourceContext.attestationId}>
							<Link
								to={capabilities.hrefFor(sourceContext.target)}
								className="block rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
							>
								<p className="text-sm leading-relaxed">
									{sourceContext.sentenceSnippet}
								</p>
							</Link>
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
}) satisfies ReadingNoteDefaultRenderer;
