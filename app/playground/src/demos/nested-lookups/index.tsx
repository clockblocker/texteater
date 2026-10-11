import { cn } from "lego";
import type { ComponentType } from "react";
import { useDemoParam } from "@/shell";
import { HistorySurface } from "./history-surface";
import { PlainReplacement } from "./plain-replacement";
import { StackedPopovers } from "./stacked-popovers";

type Variant = {
	readonly id: string;
	readonly tab: string;
	readonly pattern: string;
	readonly apps: string;
	readonly tryThis: string;
	readonly Component: ComponentType;
};

const variants: readonly Variant[] = [
	{
		id: "stacked",
		tab: "Stacked popovers",
		pattern:
			"A word inside a popover opens a child popover. Same level replaces, deeper nests, pinned survives.",
		apps: "KOReader, Yomitan, SiYuan",
		tryThis:
			"ging, then Fuß in its definition, then Beins. Pin L2, then click another word in L1. Compare “Beside its parent” at 1440 and 390.",
		Component: StackedPopovers,
	},
	{
		id: "history",
		tab: "History",
		pattern:
			"One surface whose content is replaced; back, forward and a breadcrumb walk the trail.",
		apps: "Readest, Yomitan",
		tryThis:
			"ging, then Fuß, then Beins. Back twice, then click another word: the forward trail is dropped.",
		Component: HistorySurface,
	},
	{
		id: "replace",
		tab: "Plain replacement",
		pattern:
			"The anti-pattern: a word inside the lookup replaces it, with no way back.",
		apps: "Foliate",
		tryThis: "ging, then Fuß, then Beins. Now get back to ging's Cards.",
		Component: PlainReplacement,
	},
];

/**
 * Lookups inside a lookup: every word of a Card's definition, quote and
 * lemma link looks itself up. Three tabs show three ways to nest them.
 */
export default function NestedLookupsDemo() {
	const [param, setParam] = useDemoParam("variant");
	const variant = variants.find((v) => v.id === param) ?? variants[0];
	if (!variant) return null;
	const { Component } = variant;

	return (
		<div className="flex h-full flex-col bg-background text-ink">
			<header className="grid gap-2 border-b border-line bg-canvas px-4 pt-3 pb-2">
				<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
					<h1 className="text-sm font-semibold">Nested lookups</h1>
					<div
						role="tablist"
						aria-label="Variant"
						className="flex rounded-lg border border-line bg-background p-0.5 text-xs"
					>
						{variants.map((v) => (
							<button
								key={v.id}
								type="button"
								role="tab"
								aria-selected={v.id === variant.id}
								aria-controls="nested-lookups-panel"
								onClick={() => setParam(v.id)}
								className={cn(
									"cursor-pointer rounded-md px-2.5 py-1 text-ink-soft hover:text-ink",
									v.id === variant.id &&
										"bg-paper text-ink shadow-sm",
								)}
							>
								{v.tab}
							</button>
						))}
					</div>
				</div>
				<p
					dir="auto"
					className="text-xs leading-relaxed text-ink-soft rtl:text-end"
				>
					{variant.pattern}{" "}
					<span className="text-ink-muted">
						Seen in {variant.apps}.
					</span>
				</p>
				<p
					dir="auto"
					className="text-xs leading-relaxed text-ink-muted rtl:text-end"
				>
					<b className="font-semibold text-ink-soft">Try:</b> click{" "}
					{variant.tryThis} Every word in a Card is clickable.
				</p>
			</header>
			<div
				id="nested-lookups-panel"
				role="tabpanel"
				aria-label={variant.tab}
				className="flex min-h-0 flex-1 flex-col"
			>
				<Component key={variant.id} />
			</div>
		</div>
	);
}
