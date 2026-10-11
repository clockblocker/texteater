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
		slug: "dock-or-sheet",
		title: "Dock or sheet",
		description:
			"A docked side pane when wide, a bottom sheet when narrow, the same content in both.",
		inspiration: ["Lute", "LinguaCafe", "Readest"],
		Component: lazy(() => import("./dock-or-sheet")),
	},
	{
		slug: "push-or-overlay",
		title: "Push or overlay",
		description:
			"The lookup pane pushes the text aside while ~480px of text remains, otherwise overlays it.",
		inspiration: ["Hypothesis"],
		Component: lazy(() => import("./push-or-overlay")),
	},
	{
		slug: "never-cover-word",
		title: "Never cover the word",
		description:
			"Lookup placement that never covers the clicked word or its sentence.",
		inspiration: ["LWT", "KOReader"],
		Component: lazy(() => import("./never-cover-word")),
	},
	{
		slug: "nested-lookups",
		title: "Nested lookups",
		description:
			"Lookups inside a lookup: stacked child popovers, back/forward history, plain replacement.",
		inspiration: ["Yomitan", "SiYuan", "Readest", "Foliate"],
		Component: lazy(() => import("./nested-lookups")),
	},
	{
		slug: "collapsed-stack",
		title: "Collapsed stack",
		description:
			"Stacks collapse to header lines, with the stack in the URL so browser back walks it.",
		inspiration: ["Logseq", "Quartz"],
		Component: lazy(() => import("./collapsed-stack")),
	},
	{
		slug: "promote-peek",
		title: "Promote a peek",
		description:
			"Promote a transient peek into something persistent: Deck → Pane → Sheet.",
		inspiration: ["AFFiNE", "SiYuan"],
		Component: lazy(() => import("./promote-peek")),
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
];
