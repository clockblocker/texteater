import type { ComponentType } from "react";

import { NotesStudyPlayground } from "@/playground/notes-study/notes-study-playground";
import { SegmentTextPlayground } from "@/playground/segment-text/segment-text-playground";
import { SheetWorkspacePlayground } from "@/playground/sheet-workspace/sheet-workspace-playground";

/** A deterministic, application-independent UI fixture with a stable route ID. */
export type PlaygroundExperiment = {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly instructions: string;
	readonly component: ComponentType;
};

/** Registry for `/playground/:id`; experiments must not require Convex state. */
export const PLAYGROUND_EXPERIMENTS = [
	{
		id: "sheet-workspace",
		title: "Card and Sheet workspace",
		description:
			"Exercise pane-local card decks, sheet placement, locking, collapsing, removal, and drag handoffs with deterministic data.",
		instructions:
			"Select a word in either text sheet to open its card deck. Drag cards and sheets between panes; reload or reset to restore the fixture.",
		component: SheetWorkspacePlayground,
	},
	{
		id: "segment-text",
		title: "Segments in continuous text",
		description:
			"Assess quiet hover and focus styling across fully segmented prose, including split members of German separable verbs.",
		instructions:
			"Hover or focus any word. Grouped units illuminate together; click a segment to keep its complete resolved unit visible.",
		component: SegmentTextPlayground,
	},
	{
		id: "notes-study",
		title: "Reading note cards",
		description:
			"Compare three visual systems for a German reading note as a full Sheet and a purpose-built Card.",
		instructions:
			"Pull from the top or bottom edge of any Sheet to lift its Card and inspect the transformation.",
		component: NotesStudyPlayground,
	},
] as const satisfies readonly PlaygroundExperiment[];

export function findPlaygroundExperiment(
	experimentId: string,
): PlaygroundExperiment | undefined {
	return PLAYGROUND_EXPERIMENTS.find(
		(experiment) => experiment.id === experimentId,
	);
}
