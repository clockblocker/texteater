import { type ReactNode, useEffect } from "react";

import { DeckModelsGallery } from "./entries/deck-models-gallery";
import { LoadingGallery } from "./entries/loading-gallery";
import { NotesGallery } from "./entries/notes-gallery";
import { PaletteGallery } from "./entries/palette-gallery";
import {
	type EntryRoute,
	navigatePlayground,
	playgroundSegments,
	usePathname,
} from "./playground-router";

type PlaygroundEntry = {
	readonly key: string;
	readonly title: string;
	readonly description: string;
	readonly render: (route: EntryRoute) => ReactNode;
};

/**
 * Add an entry here to get a new page in the dev-only Playground at
 * `/playground/<key>`. An entry may keep its own state in the segments after
 * its key, via the `route` it is rendered with.
 */
const PLAYGROUND_ENTRIES: readonly PlaygroundEntry[] = [
	{
		key: "notes",
		title: "Notes",
		description:
			"Every Note kind from the Notes Study fake db, as a Card and as a Sheet. Links navigate inside the gallery.",
		render: (route) => <NotesGallery route={route} />,
	},
	{
		key: "loading",
		title: "Loading",
		description:
			"Every Note kind while its data is still on the way, as a Card and as a Sheet.",
		render: () => <LoadingGallery />,
	},
	{
		key: "deck-models",
		title: "Deck models",
		description:
			"The Flick closing algebra for decks, Cards and Sheets on dummy subjects. Run the flow, read the log.",
		render: () => <DeckModelsGallery />,
	},
	{
		key: "palette",
		title: "Palette",
		description:
			"Every colour a word or link can wear: knowledge states by interaction states on each surface, and one meaning shown across reader, Quote, title and link.",
		render: () => <PaletteGallery />,
	},
];

/**
 * Development-only prototyping surface. It reads the Notes Study fake db
 * (`bun run load:notes-study`) and never touches Visitor history.
 *
 * The URL is the state: `/playground/<entry>/<entry's own segments>`, so
 * reload, Back/Forward and deep links all work.
 */
export function PlaygroundView() {
	const segments = playgroundSegments(usePathname());
	const [entryKey, ...rest] = segments;
	const active =
		PLAYGROUND_ENTRIES.find((entry) => entry.key === entryKey) ??
		PLAYGROUND_ENTRIES[0];

	// `/playground` and unknown entries canonicalise to the first entry.
	useEffect(() => {
		if (active && active.key !== entryKey) {
			navigatePlayground([active.key], { replace: true });
		}
	}, [active, entryKey]);

	if (!active) return null;
	const route: EntryRoute = {
		segments: active.key === entryKey ? rest : [],
		setSegments: (next, options) =>
			navigatePlayground([active.key, ...next], options),
	};

	return (
		<div className="flex h-svh min-h-0 flex-col bg-canvas text-ink max-md:h-[calc(100svh-3rem)]">
			<header className="flex shrink-0 flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-line px-5 py-3">
				<h1 className="font-mono text-[0.68rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					Playground
				</h1>
				<nav aria-label="Playground entries" className="flex gap-1">
					{PLAYGROUND_ENTRIES.map((entry) => (
						<a
							key={entry.key}
							href={`/playground/${entry.key}`}
							aria-current={entry === active ? "page" : undefined}
							onClick={(event) => {
								if (
									event.defaultPrevented ||
									event.button !== 0 ||
									event.metaKey ||
									event.ctrlKey ||
									event.shiftKey ||
									event.altKey
								) {
									return;
								}
								event.preventDefault();
								navigatePlayground([entry.key]);
							}}
							className="rounded-md px-2.5 py-1 text-sm text-ink-soft transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=page]:bg-raised aria-[current=page]:text-ink"
						>
							{entry.title}
						</a>
					))}
				</nav>
			</header>
			<div key={active.key} className="min-h-0 flex-1 overflow-auto">
				{active.render(route)}
			</div>
		</div>
	);
}
