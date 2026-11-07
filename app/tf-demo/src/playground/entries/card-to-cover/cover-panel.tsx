import {
	type ReducedMotion,
	TIME_SCALES,
	type TimeScale,
} from "../deck-interactions/settings-atoms";
import { InspectorChoice, InspectorSection } from "../inspector";
import type { Recorder } from "./recorder";
import { DEFAULT_SETTINGS, type Settings, STEPS } from "./settings";
import { TrackReadout } from "./track-readout";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function steps(values: readonly number[], unit = "") {
	return values.map((value) => ({
		value: `${value}`,
		label: `${value.toString()}${unit}`,
	}));
}

/** The prototype's copy, knobs and readouts: everything but the Deck itself. */
export function CoverPanel({
	settings,
	recorder,
	onChange,
}: {
	readonly settings: Settings;
	readonly recorder: Recorder;
	readonly onChange: (next: Settings) => void;
}) {
	const set = (patch: Partial<Settings>) =>
		onChange({ ...settings, ...patch });
	return (
		<>
			<InspectorSection>
				<p className="text-ink-soft">
					Tap a Card: the same element grows into its Cover. The box
					resizes on its own values and never scales; the content
					column keeps its width, so no line rewraps. The lines and
					the Source contexts change places, and what only the Cover
					has, the × and the extra contexts, fades and rises in after
					the move. × or Escape puts it back.
				</p>
			</InspectorSection>
			<InspectorSection title="Open">
				<InspectorChoice<Settings["move"]>
					label="Move"
					value={settings.move}
					options={[
						{ value: "spring", label: "spring" },
						{ value: "tween", label: "deck-of-cards tween" },
					]}
					onChange={(move) => set({ move })}
				/>
				{settings.move === "spring" ? (
					<>
						<InspectorChoice
							label="Stiffness"
							value={`${settings.stiffness}`}
							options={steps(STEPS.stiffness)}
							onChange={(value) =>
								set({ stiffness: Number(value) })
							}
						/>
						<InspectorChoice
							label="Damping"
							value={`${settings.damping}`}
							options={steps(STEPS.damping)}
							onChange={(value) =>
								set({ damping: Number(value) })
							}
						/>
					</>
				) : (
					<InspectorChoice
						label="Length"
						value={`${settings.ms}`}
						options={steps(STEPS.ms, " ms")}
						onChange={(value) => set({ ms: Number(value) })}
					/>
				)}
				<InspectorChoice<Settings["parts"]>
					label="Parts start"
					value={settings.parts}
					options={[
						{ value: "with", label: "with the box" },
						{ value: "after", label: "after it lands" },
					]}
					onChange={(parts) => set({ parts })}
				/>
				<InspectorChoice
					label="Cover-only stagger"
					value={`${settings.stagger}`}
					options={steps(STEPS.stagger, " ms")}
					onChange={(value) => set({ stagger: Number(value) })}
				/>
			</InspectorSection>
			<InspectorSection title="Box">
				<InspectorChoice
					label="contain: layout paint"
					value={settings.contain ? "on" : "off"}
					options={[
						{ value: "on", label: "on" },
						{ value: "off", label: "off" },
					]}
					onChange={(value) => set({ contain: value === "on" })}
				/>
			</InspectorSection>
			<InspectorSection title="Motion">
				<InspectorChoice<ReducedMotion>
					label="Reduced motion"
					value={settings.reducedMotion}
					options={[
						{ value: "system", label: "system" },
						{ value: "on", label: "on" },
						{ value: "off", label: "off" },
					]}
					onChange={(reducedMotion) => set({ reducedMotion })}
				/>
				<InspectorChoice<`${TimeScale}`>
					label="Slow-mo"
					value={`${settings.timeScale}`}
					options={TIME_SCALES.map((scale) => ({
						value: `${scale}`,
						label: `${scale.toString()}×`,
					}))}
					onChange={(scale) =>
						set({ timeScale: Number(scale) as TimeScale })
					}
				/>
				<InspectorChoice
					label="Direction"
					value={settings.rtl ? "rtl" : "ltr"}
					options={[
						{ value: "ltr", label: "LTR" },
						{ value: "rtl", label: "RTL" },
					]}
					onChange={(value) => set({ rtl: value === "rtl" })}
				/>
				<div>
					<button
						type="button"
						className={button}
						onClick={() => onChange(DEFAULT_SETTINGS)}
					>
						Reset knobs
					</button>
				</div>
			</InspectorSection>
			<TrackReadout recorder={recorder} />
		</>
	);
}
