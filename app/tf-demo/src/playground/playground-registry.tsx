import type { ComponentType } from "react";
import { NotesStudyPlayground } from "@/playground/notes-study/notes-study-playground";
import { SegmentTextPlayground } from "@/playground/segment-text/segment-text-playground";
import { SheetWorkspacePlayground } from "@/playground/sheet-workspace/sheet-workspace-playground";
import { DynamicPanesPrototype } from "./dynamic-panes/dynamic-panes-prototype";

/** A focused UI experiment with a stable route ID. */
export type PlaygroundExperiment = {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly instructions: string;
	readonly component: ComponentType<{ readonly detailId?: string }>;
	readonly supportsDetails?: boolean;
};

/** Registry for `/playground/:id`; experiments may use the local demo deployment. */
export const PLAYGROUND_EXPERIMENTS = [
	{
		id: "dynamic-panes",
		title: "Dynamic Panes without tabs",
		description:
			"Explore retained Card Layers, Sheet expansion, gesture cancellation, and nested Pane splits.",
		instructions:
			"Select a word to open Cards. Lift into a Pane to expand, back into the Card Layer to return, or to an edge to split. Click outside Cards to dismiss. Escape cancels a lift or dismisses Cards at rest. Open the cog for the state machine and long-text fixture.",
		component: DynamicPanesPrototype,
	},
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
		title: "German Reading notes",
		description:
			"Browse one Midnight-index note for every German Unit Reading Family/Kind route, then inspect it as a full Sheet and purpose-built Card.",
		instructions:
			"Choose a Reading note, then pull from either Sheet edge to inspect its Card transformation.",
		component: NotesStudyPlayground,
		supportsDetails: true,
	},
] as const satisfies readonly PlaygroundExperiment[];

export function findPlaygroundExperiment(
	experimentId: string,
): PlaygroundExperiment | undefined {
	return PLAYGROUND_EXPERIMENTS.find(
		(experiment) => experiment.id === experimentId,
	);
}
