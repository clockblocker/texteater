import {
	LayersIcon,
	LoaderIcon,
	type LucideIcon,
	PaletteIcon,
	StickyNoteIcon,
} from "lucide-react";
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

export type PlaygroundEntry = {
	readonly key: string;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly description: string;
	readonly render: (route: EntryRoute) => ReactNode;
};

/**
 * Add an entry here to get a new page in the dev-only Playground at
 * `/playground/<key>`. An entry may keep its own state in the segments after
 * its key, via the `route` it is rendered with.
 */
export const PLAYGROUND_ENTRIES: readonly PlaygroundEntry[] = [
	{
		key: "notes",
		title: "Notes",
		icon: StickyNoteIcon,
		description:
			"Every Note kind from the Notes Study fake db, as a Card and as a Sheet. Links navigate inside the gallery.",
		render: (route) => <NotesGallery route={route} />,
	},
	{
		key: "loading",
		title: "Loading",
		icon: LoaderIcon,
		description:
			"Every Note kind while its data is still on the way, as a Card and as a Sheet.",
		render: () => <LoadingGallery />,
	},
	{
		key: "deck-models",
		title: "Deck models",
		icon: LayersIcon,
		description:
			"The Flick closing algebra for decks, Cards and Sheets on dummy subjects. Run the flow, read the log.",
		render: () => <DeckModelsGallery />,
	},
	{
		key: "palette",
		title: "Palette",
		icon: PaletteIcon,
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
 * reload, Back/Forward and deep links all work. Entries are switched from the
 * app sidebar, which reads `PLAYGROUND_ENTRIES`.
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
			<div key={active.key} className="min-h-0 flex-1 overflow-auto">
				{active.render(route)}
			</div>
		</div>
	);
}
