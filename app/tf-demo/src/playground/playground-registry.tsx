import type { ComponentType } from "react";

import { SheetWorkspacePlayground } from "@/playground/sheet-workspace/sheet-workspace-playground";

export type PlaygroundExperiment = {
	readonly id: string;
	readonly title: string;
	readonly description: string;
	readonly instructions: string;
	readonly component: ComponentType;
};

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
] as const satisfies readonly PlaygroundExperiment[];

export function findPlaygroundExperiment(
	experimentId: string,
): PlaygroundExperiment | undefined {
	return PLAYGROUND_EXPERIMENTS.find(
		(experiment) => experiment.id === experimentId,
	);
}
