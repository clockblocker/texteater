import { type ComponentType, type LazyExoticComponent, lazy } from "react";

/**
 * Every demo, in index order. A demo lives in `./<slug>/index.tsx`, whose
 * default export is the component the frame renders; everything else it
 * needs stays in its folder.
 */
type Demo = {
	readonly slug: string;
	readonly title: string;
	/** One line for the index. */
	readonly description: string;
	/** The apps the concept comes from. */
	readonly inspiration: readonly string[];
	readonly Component: LazyExoticComponent<ComponentType>;
};

export const demos: readonly Demo[] = [
	{
		slug: "never-cover-word",
		title: "Never cover the word",
		description:
			"The Deck beside the sentence, never covering it; the text scrolls to make room.",
		inspiration: ["KOReader"],
		Component: lazy(() => import("./never-cover-word")),
	},
	{
		slug: "progressive-results",
		title: "Progressive results",
		description:
			"A placeholder Card per source, each filling in as its result arrives.",
		inspiration: ["Readest"],
		Component: lazy(() => import("./progressive-results")),
	},
	{
		slug: "lemma-hop",
		title: "Lemma hop",
		description: "Hop from the clicked form to its lemma.",
		inspiration: ["Lute"],
		Component: lazy(() => import("./lemma-hop")),
	},
	{
		slug: "hover-preview",
		title: "Hover preview",
		description:
			"⌘-hover a link in a Card for a fleeting preview that nests, pins and expands into a Sheet with history.",
		inspiration: ["Obsidian", "Hover Editor", "Quartz", "Path of Exile 2"],
		Component: lazy(() => import("./hover-preview")),
	},
];
