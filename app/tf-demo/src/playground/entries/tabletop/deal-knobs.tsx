import { InspectorChoice, InspectorSection } from "../inspector";
import { InspectorSlider, KNOB_BUTTON } from "./knobs";
import type { DealFeel } from "./use-deal-word";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

/**
 * #1316: "Deal a word" deals a Card face down while its fake Knowledge
 * loads, with the latency, the threshold below which it deals face up, and
 * whether a slow answer waits out the threshold before it deals.
 */
export function DealSection({
	feel,
	onChange,
	onDeal,
}: {
	readonly feel: DealFeel;
	readonly onChange: (feel: DealFeel) => void;
	readonly onDeal: () => void;
}) {
	return (
		<InspectorSection title="Deal a word">
			<p className="text-xs text-ink-muted">
				As if a word were clicked in a text: its Card lands in the Pane
				face down with the word on its back, and turns face up once its
				Knowledge lands. An answer faster than the threshold deals it
				face up.
			</p>
			<div className="flex flex-wrap gap-1">
				<button type="button" className={KNOB_BUTTON} onClick={onDeal}>
					Deal a word
				</button>
			</div>
			<InspectorSlider
				label="Knowledge latency"
				value={feel.latencyMs}
				min={0}
				max={4000}
				step={100}
				format={seconds}
				onChange={(latencyMs) => onChange({ ...feel, latencyMs })}
			/>
			<InspectorSlider
				label="Face-up threshold"
				value={feel.thresholdMs}
				min={0}
				max={1000}
				step={50}
				format={(ms) => `${ms} ms`}
				onChange={(thresholdMs) => onChange({ ...feel, thresholdMs })}
			/>
			<InspectorChoice<"now" | "wait">
				label="A slow answer deals"
				value={feel.wait ? "wait" : "now"}
				options={[
					{ value: "now", label: "at once" },
					{ value: "wait", label: "after the threshold" },
				]}
				onChange={(when) =>
					onChange({ ...feel, wait: when === "wait" })
				}
			/>
			<p className="text-xs text-ink-muted">
				A real click can't know its latency: only "after the threshold"
				can skip the turn for a fast answer without seeing the future.
			</p>
		</InspectorSection>
	);
}
