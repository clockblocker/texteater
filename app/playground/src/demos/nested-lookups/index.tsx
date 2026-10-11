import type { ComponentType } from "react";
import {
	DemoInspector,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
} from "@/shell";
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
 * lemma link looks itself up. The inspector switches between three ways
 * to nest them.
 */
export default function NestedLookupsDemo() {
	const [param, setParam] = useDemoParam("variant");
	const variant = variants.find((v) => v.id === param) ?? variants[0];
	if (!variant) return null;
	const { Component } = variant;

	return (
		<div className="flex h-full flex-col bg-background text-ink">
			<DemoInspector>
				<InspectorSection title="Variant">
					<InspectorChoice
						label="How a lookup inside a lookup opens"
						options={variants.map((v) => ({
							value: v.id,
							label: v.tab,
						}))}
						value={variant.id}
						onChange={(id) => setParam(id)}
					/>
					<InspectorTry>
						<p>
							{variant.pattern} Seen in {variant.apps}.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click {variant.tryThis} Every word in a Card is
							clickable.
						</p>
					</InspectorTry>
				</InspectorSection>
			</DemoInspector>
			<Component key={variant.id} />
		</div>
	);
}
