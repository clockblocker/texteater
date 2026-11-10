import { memo } from "react";
import { Inspector, InspectorChoice, InspectorSection } from "../inspector";
import { InspectorSlider, KNOB_BUTTON } from "../tabletop/knobs";
import {
	type Becoming,
	type DealFrom,
	type DealWhen,
	type FailureLook,
	type Feel,
	type Knobs,
	type LateJoin,
	type ReducedChoice,
	type SurfaceWhen,
	TIME_SCALES,
	type TurnUp,
	type Variant,
} from "./knobs";
import {
	type Outcome,
	PRESETS,
	type PresetKey,
	STAGES,
	type Stage,
	sessionTimeline,
} from "./session";
import { FEATURED_STORIES } from "./stories";

const TITLE = "Resolution";

const STAGE_LABEL: Readonly<Record<Stage, string>> = {
	selection: "Selection returns",
	firstResult: "First result",
	grammar: "Grammar",
	knowledge: "Knowledge",
	commit: "Commit",
};

const seconds = (ms: number) => `${(ms / 1000).toFixed(2)} s`;

type Props = {
	readonly variant: Variant;
	readonly knobs: Knobs;
	readonly onVariant: (variant: Variant) => void;
	readonly onKnobs: (knobs: Knobs) => void;
	readonly onReplay: () => void;
};

/**
 * The inspector: which variant plays, the word, the fake Session's
 * latencies, Proposed's open questions and the motion knobs. The surface
 * keeps only the text and the Deck (playground ADR 0001).
 */
export const ResolutionInspector = memo(function ResolutionInspector({
	variant,
	knobs,
	onVariant,
	onKnobs,
	onReplay,
}: Props) {
	const set = <Key extends keyof Knobs>(key: Key, value: Knobs[Key]) =>
		onKnobs({ ...knobs, [key]: value });
	const feel = <Key extends keyof Feel>(key: Key, value: Feel[Key]) =>
		onKnobs({ ...knobs, feel: { ...knobs.feel, [key]: value } });
	const timeline = sessionTimeline(knobs);
	return (
		<Inspector title={TITLE}>
			<InspectorSection>
				<p className="text-ink-soft">
					A click's Deck from the click to its commit, on a fake
					Resolution Session: no model is called. Click any word, or
					pick one below.
				</p>
				<InspectorChoice<Variant>
					label="Variant"
					value={variant}
					options={[
						{ value: "today", label: "Today" },
						{ value: "proposed", label: "Proposed" },
					]}
					onChange={onVariant}
				/>
				<p className="text-xs text-ink-muted">
					{variant === "today"
						? "The app's own renderer, selection and Notes, dealt when the app deals them. It follows your system's reduced-motion setting and the app's “Always play animations”."
						: "The same story on the tabletop battery, with the map's decisions applied to the whole Deck."}
				</p>
			</InspectorSection>
			<InspectorSection title="Try this">
				<ul className="grid list-disc gap-1 ps-4 text-ink-soft">
					<li>
						Play one word in Today, then in Proposed, on the same
						preset.
					</li>
					<li>
						Slow shows the wait; Stored and Fast answer inside the
						threshold; Failure ends with a Retry.
					</li>
					<li>Click another word while one is still resolving.</li>
					<li>
						Watch a late Card join: zum Bahnhof and zur Bank at
						commit, zu when Grammar lands.
					</li>
				</ul>
			</InspectorSection>
			<InspectorSection title="Word">
				<ul className="grid gap-1.5">
					{FEATURED_STORIES.map(({ key, label, hint }) => (
						<li key={key}>
							<button
								type="button"
								aria-current={
									knobs.story === key ? "true" : undefined
								}
								className="cursor-pointer rounded-sm text-start text-ink hover:text-primary aria-[current=true]:text-primary aria-[current=true]:underline aria-[current=true]:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
								onClick={() => set("story", key)}
							>
								{label}
							</button>
							<p className="text-xs text-ink-muted">{hint}</p>
						</li>
					))}
				</ul>
				<div className="flex flex-wrap gap-1">
					<button
						type="button"
						className={KNOB_BUTTON}
						onClick={onReplay}
					>
						Replay
					</button>
				</div>
			</InspectorSection>
			<InspectorSection title="Fake Session">
				<InspectorChoice<PresetKey | "custom">
					label="Preset"
					value={knobs.preset}
					options={[
						...(Object.keys(PRESETS) as PresetKey[]).map((key) => ({
							value: key,
							label: PRESETS[key].label,
						})),
						...(knobs.preset === "custom"
							? [{ value: "custom" as const, label: "Custom" }]
							: []),
					]}
					onChange={(preset) => {
						if (preset === "custom") return;
						onKnobs({
							...knobs,
							preset,
							latencies: PRESETS[preset].latencies,
							outcome: PRESETS[preset].outcome,
						});
					}}
				/>
				{STAGES.map((stage) => (
					<InspectorSlider
						key={stage}
						label={STAGE_LABEL[stage]}
						value={knobs.latencies[stage]}
						min={0}
						max={4000}
						step={20}
						format={(ms) => `${ms.toString()} ms`}
						onChange={(ms) =>
							onKnobs({
								...knobs,
								preset: "custom",
								latencies: { ...knobs.latencies, [stage]: ms },
							})
						}
					/>
				))}
				<InspectorChoice<Outcome>
					label="It ends"
					value={knobs.outcome}
					options={[
						{ value: "Complete", label: "committed" },
						{ value: "Stored", label: "stored route" },
						{ value: "Failure", label: "failed" },
					]}
					onChange={(outcome) =>
						onKnobs({ ...knobs, preset: "custom", outcome })
					}
				/>
				<p className="font-mono text-xs text-ink-muted">
					{timeline
						.slice(1)
						.map(({ at, phase }) => `${phase} ${seconds(at)}`)
						.join(" · ")}
				</p>
			</InspectorSection>
			{variant === "proposed" ? (
				<ProposedKnobs feel={knobs.feel} set={feel} />
			) : null}
			<InspectorSection title="Motion">
				{variant === "proposed" ? (
					<InspectorChoice<ReducedChoice>
						label="Reduced motion"
						value={knobs.reducedMotion}
						options={[
							{ value: "off", label: "off" },
							{ value: "system", label: "system" },
							{ value: "on", label: "on" },
						]}
						onChange={(value) => set("reducedMotion", value)}
					/>
				) : null}
				<InspectorChoice<`${(typeof TIME_SCALES)[number]}`>
					label="Slow-mo"
					value={
						`${knobs.timeScale}` as `${(typeof TIME_SCALES)[number]}`
					}
					options={TIME_SCALES.map((scale) => ({
						value: `${scale}`,
						label: `${scale.toString()}×`,
					}))}
					onChange={(scale) => set("timeScale", Number(scale))}
				/>
				<InspectorChoice<"ltr" | "rtl">
					label="Direction"
					value={knobs.rtl ? "rtl" : "ltr"}
					options={[
						{ value: "ltr", label: "LTR" },
						{ value: "rtl", label: "RTL" },
					]}
					onChange={(dir) => set("rtl", dir === "rtl")}
				/>
			</InspectorSection>
		</Inspector>
	);
});

function ProposedKnobs({
	feel,
	set,
}: {
	readonly feel: Feel;
	readonly set: <Key extends keyof Feel>(key: Key, value: Feel[Key]) => void;
}) {
	return (
		<InspectorSection title="Proposed">
			<InspectorChoice<DealWhen>
				label="The Deck is dealt"
				value={feel.dealWhen}
				options={[
					{ value: "threshold", label: "after the threshold" },
					{ value: "selection", label: "when selection returns" },
					{ value: "click", label: "at the click" },
				]}
				onChange={(value) => set("dealWhen", value)}
			/>
			<InspectorSlider
				label="Face-up threshold"
				value={feel.thresholdMs}
				min={0}
				max={1000}
				step={50}
				format={(ms) => `${ms.toString()} ms`}
				onChange={(ms) => set("thresholdMs", ms)}
			/>
			<InspectorChoice<DealFrom>
				label="A Card is dealt from"
				value={feel.dealFrom}
				options={[
					{ value: "above", label: "above the Deck" },
					{ value: "word", label: "the clicked word" },
				]}
				onChange={(value) => set("dealFrom", value)}
			/>
			<InspectorChoice<LateJoin>
				label="A late Card"
				value={feel.lateJoin}
				options={[
					{ value: "uncovered", label: "is uncovered" },
					{ value: "dealt", label: "is dealt in behind" },
				]}
				onChange={(value) => set("lateJoin", value)}
			/>
			<InspectorChoice<SurfaceWhen>
				label="The Surface tail arrives"
				value={feel.surfaceWhen}
				options={[
					{ value: "commit", label: "at commit" },
					{ value: "grammar", label: "with Grammar" },
				]}
				onChange={(value) => set("surfaceWhen", value)}
			/>
			<p className="text-xs text-ink-muted">
				“With Grammar” needs the Session to project the Surface's
				inflection before commit; today it does not.
			</p>
			<InspectorChoice<TurnUp>
				label="The front Card turns face up"
				value={feel.turnUp}
				options={[
					{ value: "knowledge", label: "as its Knowledge lands" },
					{ value: "commit", label: "at commit" },
				]}
				onChange={(value) => set("turnUp", value)}
			/>
			<InspectorChoice<Becoming>
				label="The front Card becomes its Note"
				value={feel.becoming}
				options={[
					{ value: "together", label: "turning as it grows" },
					{ value: "turn-then-grow", label: "turn, then grow" },
				]}
				onChange={(value) => set("becoming", value)}
			/>
			<InspectorChoice<FailureLook>
				label="A failed Session shows"
				value={feel.failure}
				options={[
					{ value: "back", label: "on the Card's back" },
					{ value: "face", label: "turned face up" },
				]}
				onChange={(value) => set("failure", value)}
			/>
		</InspectorSection>
	);
}
