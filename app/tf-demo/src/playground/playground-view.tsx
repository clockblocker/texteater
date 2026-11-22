import { useAtom } from "@effect/atom-react";
import { type ReactNode, useEffect } from "react";
import { BreakdownsPrototype } from "./entries/breakdowns/breakdowns";
import { CardToCover } from "./entries/card-to-cover/card-to-cover";
import { DeckInteractions } from "./entries/deck-interactions/deck-interactions";
import { DeckModelsGallery } from "./entries/deck-models-gallery";
import { DeckTricks } from "./entries/deck-tricks/deck-tricks";
import { LoadingGallery } from "./entries/loading-gallery";
import { NotesGallery } from "./entries/notes-gallery";
import { PaletteGallery } from "./entries/palette-gallery";
import { ReflexivesPrototype } from "./entries/reflexives/reflexives";
import { TabletopEntry } from "./entries/tabletop/tabletop";
import { pathnameAtom } from "./pathname-atoms";
import {
	PLAYGROUND_ENTRIES,
	PLAYGROUND_GROUPS,
	type PlaygroundEntryKey,
	type PlaygroundEntryMeta,
	type PlaygroundGroupKey,
	type PlaygroundGroupMeta,
} from "./playground-registry";
import {
	type EntryRoute,
	playgroundPath,
	playgroundSegments,
} from "./playground-router";

export {
	PLAYGROUND_ENTRIES,
	PLAYGROUND_GROUPS,
	type PlaygroundEntryKey,
	type PlaygroundEntryMeta,
	type PlaygroundGroupKey,
	type PlaygroundGroupMeta,
};

const ENTRY_RENDERERS: Readonly<
	Record<PlaygroundEntryKey, (route: EntryRoute) => ReactNode>
> = {
	notes: (route) => <NotesGallery route={route} />,
	loading: () => <LoadingGallery />,
	palette: () => <PaletteGallery />,
	reflexives: (route) => <ReflexivesPrototype route={route} />,
	breakdowns: (route) => <BreakdownsPrototype route={route} />,
	"deck-models": () => <DeckModelsGallery />,
	"deck-interactions": () => <DeckInteractions />,
	"deck-tricks": () => <DeckTricks />,
	"card-to-cover": () => <CardToCover />,
	tabletop: () => <TabletopEntry />,
};

/**
 * Development-only prototyping surface. Notes fixtures live in a disposable
 * in-memory database and never touch the application deployment.
 *
 * The URL is the state: `/playground/<entry>/<entry's own segments>`, so
 * reload, Back/Forward and deep links all work. Entries are switched from the
 * app sidebar, which reads `PLAYGROUND_GROUPS`.
 */
export function PlaygroundView() {
	const [pathname, navigate] = useAtom(pathnameAtom);
	const segments = playgroundSegments(pathname);
	const [entryKey, ...rest] = segments;
	const active =
		PLAYGROUND_ENTRIES.find((entry) => entry.key === entryKey) ??
		PLAYGROUND_ENTRIES[0];

	// `/playground` and unknown entries canonicalise to the first entry.
	useEffect(() => {
		if (active && active.key !== entryKey) {
			navigate({ pathname: playgroundPath([active.key]), replace: true });
		}
	}, [active, entryKey, navigate]);

	if (!active) return null;
	const route: EntryRoute = {
		segments: active.key === entryKey ? rest : [],
		setSegments: (next, options) =>
			navigate({
				...options,
				pathname: playgroundPath([active.key, ...next]),
			}),
	};

	return (
		<div className="flex h-svh min-h-0 flex-col bg-canvas text-ink max-md:h-[calc(100svh-3rem)]">
			<div key={active.key} className="min-h-0 flex-1 overflow-auto">
				{ENTRY_RENDERERS[active.key](route)}
			</div>
		</div>
	);
}
