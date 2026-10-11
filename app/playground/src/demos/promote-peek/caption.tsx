import { cn } from "lego";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { useFrameSize } from "@/shell";
import type { Level, PromoteState } from "./state";

export const docks = ["auto", "side", "bottom"] as const;
export type Dock = (typeof docks)[number];

const levels: readonly Level[] = ["peek", "pane", "sheet"];

/** What the pattern is, where it comes from, what to try, and its controls. */
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
	// The notes start folded on a phone-width frame, where they would take
	// a third of it; the summary line and the controls stay.
	const { inlineSize } = useFrameSize();
	const [notesOpen, setNotesOpen] = useState<boolean | null>(null);
	const notesShown = notesOpen ?? inlineSize >= 600;
	const open: Record<Level, boolean> = {
		peek: state.peek !== null,
		pane: state.pane !== null,
		sheet: state.sheet !== null,
	};
	return (
		<header className="relative shrink-0 border-b border-line bg-paper px-4 py-2.5 text-sm">
			<button
				type="button"
				aria-expanded={notesShown}
				aria-controls="promote-peek-notes"
				onClick={() => setNotesOpen(!notesShown)}
				className="flex flex-wrap items-baseline gap-x-2 text-start focus-visible:outline-2 focus-visible:outline-ring"
			>
				<ChevronDownIcon
					aria-hidden="true"
					className={cn(
						"size-3.5 self-center text-ink-faint transition-transform",
						!notesShown && "ltr:-rotate-90 rtl:rotate-90",
					)}
				/>
				<span className="font-semibold">Promote a peek</span>
				<span className="text-ink-muted">
					AFFiNE · SiYuan · calibre · VS Code
				</span>
			</button>
			{notesShown ? (
				<div
					id="promote-peek-notes"
					className="grid gap-1 pt-1 ps-5.5 text-ink-soft"
				>
					<p>
						A click opens a peek by the word; a click elsewhere, a
						scroll or Esc lets it go. Pin it to keep it as a pane,
						expand it to a sheet, and step back the same way.
					</p>
					<p className="text-ink-muted">
						Try: click <i>ging</i>, pin, expand, ←, unpin. In the
						pane, switch Following to Frozen and click <i>Bank</i>.
						At width 390 the pane docks at the bottom.
					</p>
				</div>
			) : null}
			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 ps-5.5">
				<ol
					aria-label="Open levels"
					className="flex items-center gap-1"
				>
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
				<fieldset className="flex items-center gap-1.5">
					<legend className="sr-only">Where the pane docks</legend>
					<span aria-hidden="true" className="text-ink-muted">
						Pane
					</span>
					<div className="flex rounded-md border border-line p-0.5">
						{docks.map((name) => (
							<button
								key={name}
								type="button"
								aria-pressed={dock === name}
								onClick={() => onDock(name)}
								className={cn(
									"rounded px-2 py-0.5 text-xs capitalize focus-visible:outline-2 focus-visible:outline-ring",
									dock === name
										? "bg-raised text-ink"
										: "text-ink-muted hover:text-ink",
								)}
							>
								{name === "auto"
									? `auto (${side ? "side" : "bottom"})`
									: name}
							</button>
						))}
					</div>
				</fieldset>
			</div>
		</header>
	);
}
