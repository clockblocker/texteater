import { DemoInspector, InspectorSection, InspectorTry } from "@/shell";
import { HistorySurface } from "./history-surface";

/**
 * Lookups inside a lookup: every word of a Card's definition, quote and
 * lemma link looks itself up in the same surface, which keeps the trail
 * as history.
 */
export default function NestedLookupsDemo() {
	return (
		<div className="flex h-full flex-col bg-background text-ink">
			<DemoInspector>
				<InspectorSection>
					<InspectorTry>
						<p>
							One surface whose content is replaced, stacking the
							trail like tf-demo's Covers: back pops it, a crumb
							pops back to its level, and there is no forward.
							Seen in Readest and Yomitan.
						</p>
					</InspectorTry>
				</InspectorSection>
				<InspectorSection title="Try">
					<InspectorTry>
						<p>
							Click ging, then Fuß, then Beins. Then back, or the
							ging crumb. Every word in a Card is clickable.
						</p>
					</InspectorTry>
				</InspectorSection>
			</DemoInspector>
			<HistorySurface />
		</div>
	);
}
