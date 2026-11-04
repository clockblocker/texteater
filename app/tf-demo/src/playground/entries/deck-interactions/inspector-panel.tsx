import { InspectorChoice, InspectorSection } from "../inspector";
import { type AnyKnob, KNOBS, type VariantKey } from "./knobs";
import { type Readouts, useReadout } from "./readouts";
import {
	type ReducedMotion,
	type Settings,
	TIME_SCALES,
	type TimeScale,
} from "./settings-atoms";
import { VARIANTS, variantEntry } from "./variants";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function KnobControl({
	knob,
	value,
	onChange,
}: {
	readonly knob: AnyKnob;
	readonly value: number | boolean | string;
	readonly onChange: (value: number | boolean | string) => void;
}) {
	if (knob.kind === "toggle")
		return (
			<label className="flex items-center justify-between gap-3 text-ink-soft">
				{knob.label}
				<input
					type="checkbox"
					checked={value === true}
					onChange={(event) => onChange(event.target.checked)}
				/>
			</label>
		);
	if (knob.kind === "choice")
		return (
			<InspectorChoice
				label={knob.label}
				value={String(value)}
				options={knob.options.map((option) => ({
					value: option,
					label: option,
				}))}
				onChange={onChange}
			/>
		);
	return (
		<label className="grid gap-1 text-ink-soft">
			<span className="flex justify-between gap-3">
				{knob.label}
				<output className="font-mono text-xs text-ink">
					{String(value)}
					{knob.unit ? ` ${knob.unit}` : ""}
				</output>
			</span>
			<input
				type="range"
				aria-label={knob.label}
				min={knob.min}
				max={knob.max}
				step={knob.step}
				value={Number(value)}
				onChange={(event) => onChange(Number(event.target.value))}
			/>
		</label>
	);
}

function ReadoutList({ readouts }: { readonly readouts: Readouts }) {
	const readout = useReadout(readouts);
	const rows: readonly (readonly [string, string])[] = [
		["Phase", readout.phase],
		["Zone", readout.zone ?? "–"],
		[
			"Velocity",
			`${readout.velocity.x.toFixed(2)}, ${readout.velocity.y.toFixed(2)} px/ms`,
		],
		["Tilt", `${readout.tilt.toFixed(1)}°`],
		["Last release", readout.outcome ?? "–"],
	];
	return (
		<dl
			aria-label="Readouts"
			className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs"
		>
			{rows.map(([label, value]) => (
				<div key={label} className="contents">
					<dt className="text-ink-muted">{label}</dt>
					<dd
						data-readout={label.toLowerCase()}
						className="font-mono text-ink"
					>
						{value}
					</dd>
				</div>
			))}
		</dl>
	);
}

/** Everything the page says and every control it has, off the surface. */
export function InspectorPanel({
	settings,
	knobs,
	readouts,
	onSettings,
	onKnob,
	onResetKnobs,
	onRedeal,
}: {
	readonly settings: Settings;
	readonly knobs: Readonly<Record<string, number | boolean | string>>;
	readonly readouts: Readouts;
	readonly onSettings: (patch: Partial<Settings>) => void;
	readonly onKnob: (key: string, value: number | boolean | string) => void;
	readonly onResetKnobs: () => void;
	readonly onRedeal: () => void;
}) {
	const entry = variantEntry(settings.variant);
	return (
		<>
			<InspectorSection>
				<p className="text-ink-soft">
					One Deck, several ways to handle it. Every variant does the
					same things: carry a Card, put it back on the Deck, drop it
					to close the Deck or to open the Card, flick the Deck away,
					and double-tap a Card to open it.
				</p>
			</InspectorSection>
			<InspectorSection title="Variant">
				<InspectorChoice<VariantKey>
					label="Variant"
					value={entry.key}
					options={VARIANTS.map((variant) => ({
						value: variant.key,
						label: variant.name,
					}))}
					onChange={(variant) => onSettings({ variant })}
				/>
				<p className="text-ink-soft">{entry.summary}</p>
				<button
					type="button"
					className={`${button} justify-self-start`}
					onClick={onRedeal}
				>
					Re-deal
				</button>
			</InspectorSection>
			<InspectorSection title="Readouts">
				<ReadoutList readouts={readouts} />
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
					onChange={(reducedMotion) => onSettings({ reducedMotion })}
				/>
				<InspectorChoice<`${TimeScale}`>
					label="Slow-mo"
					value={`${settings.timeScale}`}
					options={TIME_SCALES.map((scale) => ({
						value: `${scale}`,
						label: `${scale.toString()}×`,
					}))}
					onChange={(scale) =>
						onSettings({ timeScale: Number(scale) as TimeScale })
					}
				/>
				<InspectorChoice<"ltr" | "rtl">
					label="Direction"
					value={settings.rtl ? "rtl" : "ltr"}
					options={[
						{ value: "ltr", label: "LTR" },
						{ value: "rtl", label: "RTL" },
					]}
					onChange={(direction) =>
						onSettings({ rtl: direction === "rtl" })
					}
				/>
				<label className="flex items-center justify-between gap-3 text-ink-soft">
					Projected endpoint dot
					<input
						type="checkbox"
						checked={settings.showProjection}
						onChange={(event) =>
							onSettings({ showProjection: event.target.checked })
						}
					/>
				</label>
			</InspectorSection>
			<InspectorSection title={`Knobs · ${entry.name}`}>
				{KNOBS[entry.key].map((knob) => (
					<KnobControl
						key={knob.key}
						knob={knob}
						value={knobs[knob.key] ?? ""}
						onChange={(value) => onKnob(knob.key, value)}
					/>
				))}
				<button
					type="button"
					className={`${button} justify-self-start`}
					onClick={onResetKnobs}
				>
					Reset knobs
				</button>
			</InspectorSection>
		</>
	);
}
