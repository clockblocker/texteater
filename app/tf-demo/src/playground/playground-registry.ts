import {
	BlocksIcon,
	ClubIcon,
	FlipHorizontal2Icon,
	GalleryHorizontalEndIcon,
	LayersIcon,
	LoaderIcon,
	type LucideIcon,
	Maximize2Icon,
	PaletteIcon,
	StickyNoteIcon,
	TableIcon,
} from "lucide-react";

export type PlaygroundGroupKey = "live" | "experiments";

export type PlaygroundEntryKey =
	| "notes"
	| "loading"
	| "palette"
	| "reflexives"
	| "breakdowns"
	| "deck-models"
	| "deck-interactions"
	| "deck-tricks"
	| "card-to-cover"
	| "tabletop";

export type PlaygroundEntryMeta = {
	readonly key: PlaygroundEntryKey;
	readonly group: PlaygroundGroupKey;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly description: string;
};

export type PlaygroundGroupMeta = {
	readonly key: PlaygroundGroupKey;
	readonly label: string;
	readonly entries: readonly PlaygroundEntryMeta[];
};

/**
 * Metadata registry for every page in the dev-only Playground at
 * `/playground/<key>`, kept free of view imports so sidebar navigation and
 * tests do not eagerly load Vite-only entry modules.
 *
 * - `live`: views built directly from real `tf-demo` / `lego` components and
 *   tokens so changes reflect bidirectionally between the Playground and the
 *   live app.
 * - `experiments`: abstract prototypes detached from live app styles or
 *   engines.
 */
export const PLAYGROUND_GROUPS: readonly PlaygroundGroupMeta[] = [
	{
		key: "live",
		label: "Live App Views",
		entries: [
			{
				key: "notes",
				group: "live",
				title: "Notes",
				icon: StickyNoteIcon,
				description:
					"Every Note kind from the Notes Study fake db, as a Card, a Card Tail and a Cover, drawn by the components the app draws them with. Links in the Cover navigate inside the gallery.",
			},
			{
				key: "loading",
				group: "live",
				title: "Loading",
				icon: LoaderIcon,
				description:
					"Every Note kind, Scroll and Section while its data is still on the way, as a Card, a Card Tail and a Cover.",
			},
			{
				key: "palette",
				group: "live",
				title: "Palette",
				icon: PaletteIcon,
				description:
					"Every colour a word or link can wear: knowledge states by interaction states on each surface, and one meaning shown across reader, Quote, title and link.",
			},
			{
				key: "reflexives",
				group: "live",
				title: "Reflexives",
				icon: FlipHorizontal2Icon,
				description:
					"A Reading's Citation with its lexical reflexive, and whether its heading names the reflexive's case (#1285), from the Notes fake db. Knobs in the inspector.",
			},
			{
				key: "breakdowns",
				group: "live",
				title: "Breakdowns",
				icon: BlocksIcon,
				description:
					"A Reading's Breakdown on its Note and a base's Formations (#1241), from the Notes fake db. Knobs and notes in the inspector.",
			},
		],
	},
	{
		key: "experiments",
		label: "Experiments",
		entries: [
			{
				key: "deck-models",
				group: "experiments",
				title: "Deck models",
				icon: LayersIcon,
				description:
					"Compass: the Pane algebra. Every Pane has a Ground line (Menu › Library › Scroll) with ← stepping down it; Links push Covers, Segments deal Decks, a drag lifts either; a Note dropped on an edge is a Floating Pane closed by X.",
			},
			{
				key: "deck-interactions",
				group: "experiments",
				title: "Deck interactions",
				icon: GalleryHorizontalEndIcon,
				description:
					"D (Swipe actions), the way to put a Card back, close the Deck and open the Card, as iOS Mail's full swipe, on one click's Deck of real Notes from the fake db, with its knobs, slow-mo, reduced motion and RTL in the inspector.",
			},
			{
				key: "deck-tricks",
				group: "experiments",
				title: "Deck tricks",
				icon: ClubIcon,
				description:
					"deck-of-cards' tricks on the tabletop battery: 52 small Cards with the library's faces on its felt, each a Body resting in a CSS Slot, every trick a plan queued as the library queues them. Intro, Flip, Shuffle, By suit, Fan, Poker, Sort, the turn, slow-mo and reduced motion are in the inspector.",
			},
			{
				key: "card-to-cover",
				group: "experiments",
				title: "Card to Cover",
				icon: Maximize2Icon,
				description:
					"A Card growing into its Cover while its parts change places, after react-flip-toolkit's StaggeredList: one element whose box resizes on its own values, its title row, Source contexts and lines moving with Motion's layout=\"position\", and the Cover-only × and contexts fading in after the move. Spring or tween, part delay, stagger, contain, slow-mo, reduced motion, RTL and per-frame readouts in the inspector.",
			},
			{
				key: "tabletop",
				group: "experiments",
				title: "Tabletop",
				icon: TableIcon,
				description:
					"The tabletop battery end to end (#1317): Note Cards in a Deck on a Ground and a Pane beside it across a Split. Each Card is one Body resting in a CSS Slot and moved by Terms that decay to nothing. Tap one to grow it into a Cover, drag it home with your speed, drop it on the Pane, throw it away, or turn it over with F. Deal, Fan, Shuffle and Sort, the turn, slow-mo, reduced motion and RTL are in the inspector.",
			},
		],
	},
];

/** Flat view of all registered Playground entries, in group order. */
export const PLAYGROUND_ENTRIES: readonly PlaygroundEntryMeta[] =
	PLAYGROUND_GROUPS.flatMap((group) => group.entries);
