import { DEFAULT_TILT, SPRINGS, type TiltFeel } from "tabletop/core";
import { InspectorChoice, InspectorSection } from "../inspector";
import { InspectorSlider } from "./knobs";

/** #1312's start: 10° at the edge, 600 px, a 2% lift and a soft glare. */
export const NOTE_TILT: TiltFeel = DEFAULT_TILT;

/** The smoothing springs to compare: ours first, then springier and crisper. */
const SMOOTHING = {
	tilt: { label: "300/34 · ζ 0.98", spring: SPRINGS.tilt },
	lean: { label: "300/22 · ζ 0.64", spring: { stiffness: 300, damping: 22 } },
	settle: { label: "632/50 · ζ 1", spring: SPRINGS.settle },
	lazy: { label: "150/24 · ζ 0.98", spring: { stiffness: 150, damping: 24 } },
} as const;
type Smoothing = keyof typeof SMOOTHING;

function smoothingOf(feel: TiltFeel): Smoothing {
	return (
		(Object.keys(SMOOTHING) as Smoothing[]).find(
			(key) =>
				SMOOTHING[key].spring.stiffness === feel.spring.stiffness &&
				SMOOTHING[key].spring.damping === feel.spring.damping,
		) ?? "tilt"
	);
}

/** #1312's knobs: on or off, the angle, perspective, lift, glare and spring. */
export function TiltSection({
	on,
	feel,
	onToggle,
	onChange,
}: {
	readonly on: boolean;
	readonly feel: TiltFeel;
	readonly onToggle: (on: boolean) => void;
	readonly onChange: (feel: TiltFeel) => void;
}) {
	return (
		<InspectorSection title="Tilt">
			<InspectorChoice<"on" | "off">
				label="Tilt and glare"
				value={on ? "on" : "off"}
				options={[
					{ value: "on", label: "on" },
					{ value: "off", label: "off" },
				]}
				onChange={(value) => onToggle(value === "on")}
			/>
			<InspectorSlider
				label="Max angle"
				value={feel.maxDeg}
				min={0}
				max={20}
				step={1}
				format={(deg) => `${deg}°`}
				onChange={(maxDeg) => onChange({ ...feel, maxDeg })}
			/>
			<InspectorSlider
				label="Perspective"
				value={feel.perspective}
				min={300}
				max={1500}
				step={50}
				format={(px) => `${px} px`}
				onChange={(perspective) => onChange({ ...feel, perspective })}
			/>
			<InspectorSlider
				label="Scale on hover"
				value={feel.lift}
				min={0}
				max={0.1}
				step={0.01}
				format={(lift) => `${(1 + lift).toFixed(2)}×`}
				onChange={(lift) => onChange({ ...feel, lift })}
			/>
			<InspectorSlider
				label="Glare opacity"
				value={feel.glare}
				min={0}
				max={1}
				step={0.05}
				format={(glare) => glare.toFixed(2)}
				onChange={(glare) => onChange({ ...feel, glare })}
			/>
			<InspectorChoice<Smoothing>
				label="Smoothing spring"
				value={smoothingOf(feel)}
				options={(Object.keys(SMOOTHING) as Smoothing[]).map((key) => ({
					value: key,
					label: SMOOTHING[key].label,
				}))}
				onChange={(key) =>
					onChange({ ...feel, spring: SMOOTHING[key].spring })
				}
			/>
			<InspectorChoice<"lean" | "flat">
				label="Card in hand"
				value={feel.held ? "lean" : "flat"}
				options={[
					{ value: "lean", label: "leans to the grab" },
					{ value: "flat", label: "lies flat" },
				]}
				onChange={(held) =>
					onChange({ ...feel, held: held === "lean" })
				}
			/>
		</InspectorSection>
	);
}
