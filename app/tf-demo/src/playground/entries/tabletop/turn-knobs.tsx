import type { TurnFeel } from "tabletop/core";
import { InspectorChoice, InspectorSection } from "../inspector";
import { KNOB_BUTTON } from "./knobs";
import { TURN_GESTURES, type TurnGesture } from "./turn-gesture";
import type { SceneActions } from "./use-scene";

const TURN_KNOBS = {
	ms: [0, 300, 600],
	perspective: [300, 600, 1200],
	lift: [0, 0.06, 0.12],
} as const;

const GESTURE_HINT: Record<TurnGesture, string> = {
	control:
		"Hover a Card, or focus it: the control in its bottom corner turns it over, and the same one on the back turns it back. A tap still opens it.",
	flick: "Pick a Card up and flick it sideways as you let go.",
	press: "Press and hold a Card still for half a second.",
	key: "Only F, over a Card or on a focused one.",
};

/** #1315's gesture, then #1313's turn knobs: length, perspective, lift and axis. */
export function TurnSection({
	actions,
	top,
	gesture,
	onGesture,
	feel,
	onChange,
}: {
	readonly actions: SceneActions;
	/** The top Card of the Ground's Deck, which the first button turns. */
	readonly top: string | undefined;
	readonly gesture: TurnGesture;
	readonly onGesture: (gesture: TurnGesture) => void;
	readonly feel: TurnFeel;
	readonly onChange: (feel: TurnFeel) => void;
}) {
	return (
		<InspectorSection title="Turn">
			<InspectorChoice<TurnGesture>
				label="How a reader turns a Card"
				value={gesture}
				options={TURN_GESTURES}
				onChange={onGesture}
			/>
			<p className="text-xs text-ink-muted">
				{GESTURE_HINT[gesture]} F works with every choice.
			</p>
			<div className="flex flex-wrap gap-1">
				<button
					type="button"
					className={KNOB_BUTTON}
					disabled={!top}
					onClick={() => top && actions.turn(top)}
				>
					Turn the top Card
				</button>
				<button
					type="button"
					className={KNOB_BUTTON}
					onClick={() => actions.turnAll()}
				>
					Turn every Card
				</button>
			</div>
			<InspectorChoice
				label="Length"
				value={`${feel.ms}`}
				options={TURN_KNOBS.ms.map((ms) => ({
					value: `${ms}`,
					label: ms === 0 ? "instant" : `${ms} ms`,
				}))}
				onChange={(ms) => onChange({ ...feel, ms: Number(ms) })}
			/>
			<InspectorChoice
				label="Perspective"
				value={`${feel.perspective}`}
				options={TURN_KNOBS.perspective.map((px) => ({
					value: `${px}`,
					label: `${px} px`,
				}))}
				onChange={(px) =>
					onChange({ ...feel, perspective: Number(px) })
				}
			/>
			<InspectorChoice
				label="Lift edge on"
				value={`${feel.lift}`}
				options={TURN_KNOBS.lift.map((lift) => ({
					value: `${lift}`,
					label: lift === 0 ? "none" : `${Math.round(lift * 100)}%`,
				}))}
				onChange={(lift) => onChange({ ...feel, lift: Number(lift) })}
			/>
			<InspectorChoice<TurnFeel["axis"]>
				label="Axis"
				value={feel.axis}
				options={[
					{ value: "x", label: "long (X)" },
					{ value: "y", label: "short (Y)" },
				]}
				onChange={(axis) => onChange({ ...feel, axis })}
			/>
		</InspectorSection>
	);
}
