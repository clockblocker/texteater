import { type ReactNode, useState } from "react";

import { LoadingGallery } from "./entries/loading-gallery";
import { NotesGallery } from "./entries/notes-gallery";

type PlaygroundEntry = {
	readonly key: string;
	readonly title: string;
	readonly description: string;
	readonly render: () => ReactNode;
};

/** Add an entry here to get a new page in the dev-only Playground. */
const PLAYGROUND_ENTRIES: readonly PlaygroundEntry[] = [
	{
		key: "notes",
		title: "Notes",
		description:
			"Every Note kind from the Notes Study fake db, as a Card and as a Sheet. Links navigate inside the gallery.",
		render: () => <NotesGallery />,
	},
	{
		key: "loading",
		title: "Loading",
		description:
			"Every Note kind while its data is still on the way, as a Card and as a Sheet.",
		render: () => <LoadingGallery />,
	},
];

/**
 * Development-only prototyping surface. It reads the Notes Study fake db
 * (`bun run load:notes-study`) and never touches Visitor history.
 */
export function PlaygroundView() {
	const [activeKey, setActiveKey] = useState(PLAYGROUND_ENTRIES[0]?.key);
	const active =
		PLAYGROUND_ENTRIES.find((entry) => entry.key === activeKey) ??
		PLAYGROUND_ENTRIES[0];
	return (
		<div className="flex h-svh min-h-0 flex-col bg-canvas text-ink max-md:h-[calc(100svh-3rem)]">
			<header className="flex shrink-0 flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-line px-5 py-3">
				<h1 className="font-mono text-[0.68rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					Playground
				</h1>
				<nav aria-label="Playground entries" className="flex gap-1">
					{PLAYGROUND_ENTRIES.map((entry) => (
						<button
							key={entry.key}
							type="button"
							aria-current={entry === active ? "page" : undefined}
							onClick={() => setActiveKey(entry.key)}
							className="rounded-md px-2.5 py-1 text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=page]:bg-raised aria-[current=page]:text-ink"
						>
							{entry.title}
						</button>
					))}
				</nav>
				{active ? (
					<p className="text-sm text-ink-muted">
						{active.description}
					</p>
				) : null}
			</header>
			<div className="min-h-0 flex-1 overflow-auto">
				{active ? active.render() : null}
			</div>
		</div>
	);
}
