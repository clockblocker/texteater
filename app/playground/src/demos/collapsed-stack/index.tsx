import { cn } from "lego";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useDemoParam } from "@/shell";
import { SidebarStack } from "./sidebar-stack";
import { type Stack, useStack } from "./stack";
import { type OpenMode, quartzMinWidth, StackedPanes } from "./stacked-panes";

type Layout = "sidebar" | "panes";

const paneWidths: readonly number[] = [320, 380, 480];

/**
 * Collapsed stacks: lookups pile up instead of replacing each other, and
 * older ones collapse to a header line (Logseq's sidebar) or a title
 * spine (Quartz's stacked pages). The stack lives in the URL, so the
 * browser's back button walks it. Both layouts share the one stack.
 */
export default function CollapsedStackDemo() {
	const [layoutParam, setLayout] = useDemoParam("layout");
	const layout: Layout = layoutParam === "panes" ? "panes" : "sidebar";
	const stack = useStack();
	const [foldOlder, setFoldOlder] = useState(true);
	const [openMode, setOpenMode] = useState<OpenMode>("append");
	const [paneWidth, setPaneWidth] = useState(380);
	const [stackWhenNarrow, setStackWhenNarrow] = useState(false);

	return (
		<div className="flex h-full flex-col">
			<header className="grid gap-1.5 border-b border-line bg-canvas px-4 py-3 text-xs text-ink-soft">
				<div className="flex flex-wrap items-center gap-x-3 gap-y-2">
					<h1 className="text-sm font-semibold text-ink">
						Collapsed stack
					</h1>
					<span className="text-ink-muted">Logseq · Quartz</span>
					<div className="flex rounded-lg border border-line bg-paper p-0.5">
						<Segment
							pressed={layout === "sidebar"}
							onClick={() => setLayout(null)}
						>
							Sidebar stack · Logseq
						</Segment>
						<Segment
							pressed={layout === "panes"}
							onClick={() => setLayout("panes")}
						>
							Stacked panes · Quartz
						</Segment>
					</div>
				</div>
				{layout === "sidebar" ? (
					<p>
						Each lookup joins a stack beside the text, newest on
						top; older ones fold to one header line, like the Deck's
						Card Tails. <b className="text-ink">Try:</b> click five
						words, then press the browser's Back. Drag a grip to
						reorder; ⋯ collapses or closes the others. At 390 the
						stack becomes a panel over the text.
					</p>
				) : (
					<p>
						Each lookup opens a pane to the inline end; when they
						overflow, covered panes shrink to title spines. Quartz
						turns this off below {quartzMinWidth}px.{" "}
						<b className="text-ink">Try:</b> at 1440 open four words
						and click a spine; follow a lemma link in a Card; press
						Back; then switch to 390.
					</p>
				)}
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
					{layout === "sidebar" ? (
						<Check checked={foldOlder} onChange={setFoldOlder}>
							Fold older lookups when one opens
						</Check>
					) : (
						<>
							<label className="flex items-center gap-1.5">
								Open from a pane:
								<select
									value={openMode}
									onChange={(event) =>
										setOpenMode(
											event.target.value === "trail"
												? "trail"
												: "append",
										)
									}
									className="rounded border border-line bg-paper px-1 py-0.5 text-ink"
								>
									<option value="append">
										add at the end
									</option>
									<option value="trail">
										replace the panes after it (Quartz)
									</option>
								</select>
							</label>
							<label className="flex items-center gap-1.5">
								Pane
								<select
									value={paneWidth}
									onChange={(event) =>
										setPaneWidth(Number(event.target.value))
									}
									className="rounded border border-line bg-paper px-1 py-0.5 text-ink"
								>
									{paneWidths.map((width) => (
										<option key={width} value={width}>
											{width}px
										</option>
									))}
								</select>
							</label>
							<Check
								checked={stackWhenNarrow}
								onChange={setStackWhenNarrow}
							>
								Stack below {quartzMinWidth}px too
							</Check>
						</>
					)}
					<StackReadout stack={stack} />
				</div>
			</header>
			<div className="min-h-0 flex-1">
				{layout === "sidebar" ? (
					<SidebarStack stack={stack} foldOlder={foldOlder} />
				) : (
					<StackedPanes
						stack={stack}
						openMode={openMode}
						paneWidth={paneWidth}
						stackWhenNarrow={stackWhenNarrow}
					/>
				)}
			</div>
		</div>
	);
}

/** The stack the URL holds, oldest first, with a Back that walks it. */
function StackReadout({ stack }: { readonly stack: Stack }) {
	const titles = stack.entries.map((entry) => entry.title);
	return (
		<span className="flex min-w-0 items-center gap-2 font-mono text-ink-muted">
			<button
				type="button"
				disabled={titles.length === 0}
				onClick={() => window.history.back()}
				className="flex shrink-0 cursor-pointer items-center gap-1 rounded border border-line bg-paper px-1.5 py-0.5 font-sans text-ink disabled:cursor-default disabled:opacity-40"
			>
				<ArrowLeft size={12} className="rtl:-scale-x-100" />
				Back
			</button>
			<span dir="auto" className="truncate">
				stack: {titles.length > 0 ? titles.join(" › ") : "empty"}
			</span>
		</span>
	);
}

function Segment({
	pressed,
	onClick,
	children,
}: {
	readonly pressed: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onClick}
			className={cn(
				"cursor-pointer rounded-md px-2.5 py-1 text-xs",
				pressed ? "bg-canvas font-medium text-ink" : "text-ink-muted",
			)}
		>
			{children}
		</button>
	);
}

function Check({
	checked,
	onChange,
	children,
}: {
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
	readonly children: ReactNode;
}) {
	return (
		<label className="flex cursor-pointer items-center gap-1.5">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
			/>
			{children}
		</label>
	);
}
