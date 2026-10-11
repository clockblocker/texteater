import { cn } from "lego";
import {
	DemoInspector,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
} from "@/shell";
import type { Level, PromoteState } from "./state";

export const docks = ["auto", "side", "bottom"] as const;
export type Dock = (typeof docks)[number];

const levels: readonly Level[] = ["peek", "pane", "sheet"];

/**
 * What the pattern is, where it comes from, what to try, its controls and
 * which levels are open, all in the inspector.
 */
export function Caption({
	state,
	dock,
	side,
	onDock,
}: {
	readonly state: PromoteState;
	readonly dock: Dock;
	/** Where the pane sits now, which `auto` decides by the frame's width. */
	readonly side: boolean;
	readonly onDock: (dock: Dock) => void;
}) {
	const open: Record<Level, boolean> = {
		peek: state.peek !== null,
		pane: state.pane !== null,
		sheet: state.sheet !== null,
	};
	return (
		<DemoInspector>
			<InspectorSection>
				<InspectorTry>
					<p>
						A click opens a peek by the word; a click elsewhere, a
						scroll or Esc lets it go. Pin it to keep it as a pane,
						expand it to a sheet, and step back the same way. Also
						seen in calibre and VS Code.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Try">
				<InspectorTry>
					<p>
						Click <i>ging</i>, pin, expand, ←, unpin. In the pane,
						switch Following to Frozen and click <i>Bank</i>. At
						width 390 the pane docks at the bottom.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Knobs">
				<InspectorChoice
					label="Where the pane docks"
					options={docks.map((name) => ({
						value: name,
						label:
							name === "auto"
								? `auto (${side ? "side" : "bottom"})`
								: name,
					}))}
					value={dock}
					onChange={onDock}
				/>
			</InspectorSection>
			<InspectorSection title="Open levels">
				<ol className="flex items-center gap-1">
					{levels.map((level, index) => (
						<li key={level} className="flex items-center gap-1">
							{index > 0 ? (
								<span
									aria-hidden="true"
									className="text-ink-faint"
								>
									→
								</span>
							) : null}
							<span
								className={cn(
									"rounded-full border px-2 py-0.5 font-mono text-[0.7rem] tracking-wide uppercase",
									open[level]
										? "border-link/50 bg-link/12 text-link"
										: "border-line text-ink-faint",
								)}
							>
								{level}
								<span className="sr-only">
									{open[level] ? " open" : " closed"}
								</span>
							</span>
						</li>
					))}
				</ol>
			</InspectorSection>
		</DemoInspector>
	);
}
