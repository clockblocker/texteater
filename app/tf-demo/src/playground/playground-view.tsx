import { useAtom } from "@effect/atom-react";
import {
	BlocksIcon,
	ClapperboardIcon,
	ClubIcon,
	FlipHorizontal2Icon,
	GalleryHorizontalEndIcon,
	LayersIcon,
	LoaderIcon,
	type LucideIcon,
	Maximize2Icon,
	PaletteIcon,
	SparklesIcon,
	StickyNoteIcon,
	TableIcon,
} from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { AnimationWorkbench } from "./entries/animation-workbench/workbench";
import { BreakdownsPrototype } from "./entries/breakdowns/breakdowns";
import { CardToCover } from "./entries/card-to-cover/card-to-cover";
import { DeckInteractions } from "./entries/deck-interactions/deck-interactions";
import { DeckModelsGallery } from "./entries/deck-models-gallery";
import { DeckTricks } from "./entries/deck-tricks/deck-tricks";
import { LoadingGallery } from "./entries/loading-gallery";
import { NotesGallery } from "./entries/notes-gallery";
import { PaletteGallery } from "./entries/palette-gallery";
import { PokemonCards } from "./entries/pokemon-cards/pokemon-cards";
import { ReflexivesPrototype } from "./entries/reflexives/reflexives";
import { TabletopEntry } from "./entries/tabletop/tabletop";
import { pathnameAtom } from "./pathname-atoms";
import {
	type EntryRoute,
	playgroundPath,
	playgroundSegments,
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
			"Every Note kind from the Notes Study fake db, as a Card, a Card Tail and a Cover, drawn by the components the app draws them with. Links in the Cover navigate inside the gallery.",
		render: (route) => <NotesGallery route={route} />,
	},
	{
		key: "breakdowns",
		title: "Breakdowns",
		icon: BlocksIcon,
		description:
			"A Reading's Breakdown on its Note and a base's Formations (#1241), from the Notes fake db. Knobs and notes in the inspector.",
		render: (route) => <BreakdownsPrototype route={route} />,
	},
	{
		key: "reflexives",
		title: "Reflexives",
		icon: FlipHorizontal2Icon,
		description:
			"A Reading's Citation with its lexical reflexive, and whether its heading names the reflexive's case (#1285), from the Notes fake db. Knobs in the inspector.",
		render: (route) => <ReflexivesPrototype route={route} />,
	},
	{
		key: "loading",
		title: "Loading",
		icon: LoaderIcon,
		description:
			"Every Note kind while its data is still on the way, as a Card, a Card Tail and a Cover.",
		render: () => <LoadingGallery />,
	},
	{
		key: "deck-models",
		title: "Deck models",
		icon: LayersIcon,
		description:
			"Compass: the Pane algebra. Every Pane has a Ground line (Menu › Library › Scroll) with ← stepping down it; Links push Covers, Segments deal Decks, a drag lifts either; a Note dropped on an edge is a Floating Pane closed by X.",
		render: () => <DeckModelsGallery />,
	},
	{
		key: "animation-workbench",
		title: "Animation workbench",
		icon: ClapperboardIcon,
		description:
			"The deck’s live animations and gestures, isolated in scenarios. Compare the baseline with named parameter variants.",
		render: (route) => <AnimationWorkbench route={route} />,
	},
	{
		key: "deck-interactions",
		title: "Deck interactions",
		icon: GalleryHorizontalEndIcon,
		description:
			"Two ways to carry a Card off its Deck, put it back, dismiss the Deck and open the Card, B (Table) and D (Swipe actions), behind one switch, on one click's Deck of real Notes from the fake db, with each variant's knobs, slow-mo, reduced motion and RTL in the inspector.",
		render: () => <DeckInteractions />,
	},
	{
		key: "deck-tricks",
		title: "Deck tricks",
		icon: ClubIcon,
		description:
			"deck-of-cards' tricks on the tabletop battery: 52 small Cards with the library's faces on its felt, each a Body resting in a CSS Slot, every trick a plan queued as the library queues them. Intro, Flip, Shuffle, By suit, Fan, Poker, Sort, the turn, slow-mo and reduced motion are in the inspector.",
		render: () => <DeckTricks />,
	},
	{
		key: "card-to-cover",
		title: "Card to Cover",
		icon: Maximize2Icon,
		description:
			"A Card growing into its Cover while its parts change places, after react-flip-toolkit's StaggeredList: one element whose box resizes on its own values, its title row, Source contexts and lines moving with Motion's layout=\"position\", and the Cover-only × and contexts fading in after the move. Spring or tween, part delay, stagger, contain, slow-mo, reduced motion, RTL and per-frame readouts in the inspector.",
		render: () => <CardToCover />,
	},
	{
		key: "tabletop",
		title: "Tabletop",
		icon: TableIcon,
		description:
			"The tabletop battery end to end (#1317): Note Cards in a Deck on a Ground and a Pane beside it across a Split. Each Card is one Body resting in a CSS Slot and moved by Terms that decay to nothing. Tap one to grow it into a Cover, drag it home with your speed, drop it on the Pane, throw it away, or turn it over with F. Deal, Fan, Shuffle and Sort, the turn, slow-mo, reduced motion and RTL are in the inspector.",
		render: () => <TabletopEntry />,
	},
	{
		key: "pokemon-cards",
		title: "Pokémon cards",
		icon: SparklesIcon,
		description:
			"simeydotme's pokemon-cards-css, vendored and its Svelte Card ported to React: its page of holofoil effects, one section per rarity, where a card tilts under the pointer and pops out to the centre on a click. The effects' explanations and a jump-to-effect filter sit in the inspector.",
		render: () => <PokemonCards />,
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
 * Development-only prototyping surface. Notes fixtures live in a disposable
 * in-memory database and never touch the application deployment.
 *
 * The URL is the state: `/playground/<entry>/<entry's own segments>`, so
 * reload, Back/Forward and deep links all work. Entries are switched from the
 * app sidebar, which reads `PLAYGROUND_ENTRIES`.
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
				{active.render(route)}
			</div>
		</div>
	);
}
