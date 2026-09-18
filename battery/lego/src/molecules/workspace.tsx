"use client";

import {
	type WorkspaceClassNames,
	Workspace as WorkspacePrimitive,
	type WorkspaceProps,
} from "react-resizable-panels/workspace";
import { cn } from "../utils";

const workspaceClasses: WorkspaceClassNames = {
	pane: "bg-paper",
	sheet: "bg-paper",
	separator:
		"bg-line transition-colors duration-150 ease-out hover:bg-primary focus-visible:bg-primary focus-visible:outline-none data-[separator=active]:bg-primary",
	lift: "lego-workspace-lift border-0 bg-transparent",
	"pane-actions": "text-ink-muted text-workspace-action",
	"pane-close":
		"lego-workspace-close cursor-pointer rounded-full border border-line-strong bg-canvas text-ink text-base/normal hover:bg-raised active:scale-[0.96]",
	cards: "group/workspace-cards",
	"return-zone":
		"rounded-[calc(var(--workspace-card-radius)+12px)] border-2 border-transparent transition-colors duration-150 ease-out group-data-[return-target=true]/workspace-cards:border-primary",
	card: "lego-workspace-card rounded-workspace bg-paper",
	"card-tail":
		"border-0 border-t border-line bg-paper text-ink-soft text-workspace-tail transition-colors duration-150 ease-out hover:bg-raised hover:text-accent-foreground focus-visible:bg-raised focus-visible:text-accent-foreground",
	drop: "border-2 border-primary bg-primary/28",
	"drop-label":
		"rounded-workspace-label bg-raised px-[0.7rem] py-[0.4rem] text-accent-foreground",
	"edge-hint": "border border-primary/31 bg-primary/6 text-ink-soft",
	drag: "lego-workspace-drag rounded-workspace bg-paper font-sans text-workspace text-ink",
};

/**
 * Workspace behavior with Lego's visual treatment. Import lego/styles.css once
 * in the application; it includes the primitive's structural stylesheet.
 * Part classes also reach the drag preview rendered outside the workspace root.
 */
export function Workspace<S>({
	className,
	classNames,
	...props
}: WorkspaceProps<S>) {
	const mergedClasses = { ...workspaceClasses };
	for (const part of Object.keys(
		classNames ?? {},
	) as (keyof WorkspaceClassNames)[]) {
		mergedClasses[part] = cn(mergedClasses[part], classNames?.[part]);
	}
	return (
		<WorkspacePrimitive
			{...props}
			className={cn(
				"lego-workspace bg-canvas font-sans text-workspace text-ink [--workspace-card-radius:var(--radius-workspace)]",
				className,
			)}
			classNames={mergedClasses}
		/>
	);
}
