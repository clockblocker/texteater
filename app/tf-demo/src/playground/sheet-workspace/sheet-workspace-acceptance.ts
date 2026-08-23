import type { SheetWorkspaceVariant } from "./sheet-workspace-contract";

export type SheetWorkspaceAcceptanceScenario = {
	readonly id: string;
	readonly gate:
		| "algebra"
		| "input"
		| "focus"
		| "preview"
		| "motion"
		| "runtime";
	readonly instruction: string;
};

/** Engine-independent hands-on contract. Every adapter is run against this list. */
export const SHEET_WORKSPACE_ACCEPTANCE_SCENARIOS = [
	{
		id: "top-only-atomic-move",
		gate: "algebra",
		instruction:
			"Move the central top Sheet east; verify one pop/push and east becomes Active.",
	},
	{
		id: "cancel-is-no-op",
		gate: "algebra",
		instruction:
			"Start a drag, press Escape or release outside a Pane, and compare the full state before and after.",
	},
	{
		id: "destination-lock-wins",
		gate: "algebra",
		instruction:
			"Move the west Locked Sheet into central; central keeps its existing lock and no source lock is promoted.",
	},
	{
		id: "pointer-touch-keyboard",
		gate: "input",
		instruction:
			"Repeat a cross-Pane move with mouse and touch, then exercise each adapter's supported keyboard path.",
	},
	{
		id: "focus-follows-placement",
		gate: "focus",
		instruction:
			"After success and cancellation, verify a visible meaningful focus target and a correct live announcement.",
	},
	{
		id: "modifier-card",
		gate: "preview",
		instruction:
			"Hover or focus a Sheet while holding Alt/Option; dismiss the transient Card with Escape or modifier release.",
	},
	{
		id: "reduced-motion",
		gate: "motion",
		instruction:
			"Enable reduced motion; verify final state is identical and non-essential handoff motion is suppressed.",
	},
	{
		id: "strict-mode-cycles",
		gate: "runtime",
		instruction:
			"Repeat mount, drag, cancellation, and variant switches without leaked previews, listeners, or duplicate commits.",
	},
] as const satisfies readonly SheetWorkspaceAcceptanceScenario[];

export const SHEET_WORKSPACE_VARIANT_MECHANICS: Record<
	SheetWorkspaceVariant,
	{
		readonly dnd: string;
		readonly handoff: string;
		readonly accessibility: string;
	}
> = {
	motion: {
		dnd: "Motion drag controls plus Pane hit testing",
		handoff: "Shared layout identity and spring layout transition",
		accessibility: "Focusable drag handle and application live region",
	},
	"dnd-kit": {
		dnd: "dnd-kit pointer and keyboard sensors with Pane droppables",
		handoff: "DragOverlay Card with focused drop animation",
		accessibility: "dnd-kit pointer and keyboard sensors plus live region",
	},
	pragmatic: {
		dnd: "Native-platform drag with registered element drop targets",
		handoff: "Custom native Card preview and destination reveal",
		accessibility:
			"Native DnD handle; lack of a built-in keyboard path remains comparison evidence",
	},
	"react-aria": {
		dnd: "React Aria low-level useDrag/useDrop lifecycle",
		handoff: "DragPreview Card and application-owned destination reveal",
		accessibility: "Built-in keyboard and screen-reader drag interaction",
	},
};
