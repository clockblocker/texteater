import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import {
	DemoInspector,
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useInspectorAvoid,
} from "@/shell";
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
	useInspectorAvoid("inline-end");

	return (
		<div className="flex h-full flex-col">
			<DemoInspector>
				<InspectorSection title="Layout">
					<InspectorChoice
						label="Where the stack lives"
						options={[
							{
								value: "sidebar",
								label: "Sidebar stack · Logseq",
							},
							{ value: "panes", label: "Stacked panes · Quartz" },
						]}
						value={layout}
						onChange={(next) =>
							setLayout(next === "panes" ? "panes" : null)
						}
					/>
					<InspectorTry>
						{layout === "sidebar" ? (
							<p>
								Each lookup joins a stack beside the text,
								newest on top; older ones fold to one header
								line, like the Deck's Card Tails. At 390 the
								stack becomes a panel over the text.
							</p>
						) : (
							<p>
								Each lookup opens a pane to the inline end; when
								they overflow, covered panes shrink to title
								spines. Quartz turns this off below{" "}
								{quartzMinWidth}px.
							</p>
						)}
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						{layout === "sidebar" ? (
							<p>
								Click five words, then press the browser's Back.
								Drag a grip to reorder; ⋯ collapses or closes
								the others.
							</p>
						) : (
							<p>
								At 1440 open four words and click a spine;
								follow a lemma link in a Card; press Back; then
								switch to 390.
							</p>
						)}
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Knobs">
					{layout === "sidebar" ? (
						<InspectorCheck
							checked={foldOlder}
							onChange={setFoldOlder}
						>
							Fold older lookups when one opens
						</InspectorCheck>
					) : (
						<>
							<InspectorChoice
								label="Open from a pane"
								options={[
									{
										value: "append",
										label: "Add at the end",
									},
									{
										value: "trail",
										label: "Replace the panes after it (Quartz)",
									},
								]}
								value={openMode}
								onChange={setOpenMode}
							/>
							<InspectorChoice
								label="Pane width"
								options={paneWidths.map((width) => ({
									value: width,
									label: `${width}px`,
								}))}
								value={paneWidth}
								onChange={setPaneWidth}
							/>
							<InspectorCheck
								checked={stackWhenNarrow}
								onChange={setStackWhenNarrow}
							>
								Stack below {quartzMinWidth}px too
							</InspectorCheck>
						</>
					)}
				</InspectorSection>
				<InspectorSection title="Readout">
					<StackReadout stack={stack} />
				</InspectorSection>
			</DemoInspector>
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
		<span className="flex min-w-0 items-start gap-2 font-mono text-xs text-ink-muted">
			<button
				type="button"
				disabled={titles.length === 0}
				onClick={() => window.history.back()}
				className="flex shrink-0 cursor-pointer items-center gap-1 rounded border border-line bg-paper px-1.5 py-0.5 font-sans text-ink disabled:cursor-default disabled:opacity-40"
			>
				<ArrowLeft size={12} />
				Back
			</button>
			<span className="min-w-0 py-0.5 break-words">
				stack:{" "}
				{titles.length > 0
					? titles.map((title, index) => (
							<span key={`${index}:${title}`}>
								{index > 0 ? " › " : null}
								<bdi>{title}</bdi>
							</span>
						))
					: "empty"}
			</span>
		</span>
	);
}
