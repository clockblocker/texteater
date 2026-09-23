import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompassModel } from "../deck-models/drag-deck";
import {
	DEFAULT_DECK_MOTION,
	type DeckMotionOverrides,
} from "../deck-models/runtime-config";
import type { Entry } from "./catalog";
import { KEEP, type Recording } from "./trace";
import { TraceView } from "./trace-view";
import { useTrace } from "./use-trace";
import {
	PARAMETERS,
	readVariants,
	saveVariants,
	type Variant,
} from "./variants";

type Kind = "baseline" | "candidate";
type Recordings = Readonly<Record<Kind, readonly Recording[]>>;
const NO_RECORDINGS: Recordings = { baseline: [], candidate: [] };

type Nav = {
	readonly onBack: () => void;
	readonly onGo: (step: number) => void;
};
const button =
	"rounded-md border border-line px-3 py-1.5 text-xs text-ink-muted hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:outline-link disabled:opacity-40";

function Specimen({
	entry,
	label,
	kind,
	motion,
	revision,
	onRecording,
}: {
	entry: Entry;
	label: string;
	kind: Kind;
	motion?: DeckMotionOverrides;
	revision: number;
	onRecording: (kind: Kind, recording: Recording) => void;
}) {
	const root = useRef<HTMLElement>(null);
	useTrace(root, (recording) => onRecording(kind, recording));
	return (
		<section
			ref={root}
			data-specimen={kind}
			aria-label={label}
			className="relative h-full min-h-0 min-w-0 overflow-hidden bg-paper"
		>
			<h2 className="pointer-events-none absolute start-4 top-4 z-10 font-mono text-xs tracking-wide text-ink-muted">
				{label}
			</h2>
			<div className="relative h-full min-h-0">
				<CompassModel
					key={`${entry.key}-${revision}`}
					embedded
					showReader={entry.initialScene === "empty"}
					showZones={entry.key === "drop-zones"}
					initialScene={entry.initialScene}
					interactions={entry.interactions}
					motion={motion}
				/>
			</div>
		</section>
	);
}

export function Stage({ entry, nav }: { entry: Entry; nav: Nav }) {
	const [variants, setVariants] = useState<Variant[]>(readVariants);
	const [selected, setSelected] = useState("baseline");
	const [compare, setCompare] = useState(true);
	const [revision, setRevision] = useState(0);
	const [controlsOpen, setControlsOpen] = useState(false);
	const [recordings, setRecordings] = useState<Recordings>(NO_RECORDINGS);
	const record = useCallback(
		(kind: Kind, recording: Recording) =>
			setRecordings((current) => ({
				...current,
				[kind]: [...current[kind], recording].slice(-KEEP),
			})),
		[],
	);
	const controlsToggle = useRef<HTMLButtonElement>(null);
	const closeControls = () => {
		setControlsOpen(false);
		controlsToggle.current?.focus();
	};
	/**
	 * What the candidate pane renders: a saved variant, or one of the
	 * entry's presets. Only a variant has parameters to edit — a preset is
	 * a fixed position to compare against, and "Create variant" is how you
	 * start from one.
	 */
	const variant = variants.find((saved) => saved.id === selected);
	const preset = entry.presets?.find(
		(shipped) => `preset:${shipped.key}` === selected,
	);
	const candidate = variant ?? preset;
	useEffect(() => saveVariants(variants), [variants]);
	const patch = (motion: DeckMotionOverrides) =>
		setVariants((current) =>
			current.map((variant) =>
				variant.id === selected
					? { ...variant, motion: { ...variant.motion, ...motion } }
					: variant,
			),
		);
	const createVariant = () => {
		const next = {
			id: crypto.randomUUID(),
			name: `Variant ${variants.length + 1}`,
			motion: { ...candidate?.motion },
		};
		setVariants((current) => [...current, next]);
		setSelected(next.id);
		setCompare(true);
		setRevision((value) => value + 1);
	};
	return (
		<div
			data-stage={entry.key}
			className="relative h-full min-h-0 overflow-hidden"
		>
			<aside
				id="workbench-controls"
				aria-label="Workbench controls"
				aria-hidden={!controlsOpen}
				inert={!controlsOpen}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.stopPropagation();
						closeControls();
					}
				}}
				className={`absolute end-4 top-4 z-50 flex max-h-[calc(100%_-_6rem)] w-[30rem] max-w-[calc(100%-2rem)] flex-col overflow-hidden rounded-xl border border-line-strong bg-paper/95 shadow-2xl backdrop-blur-md transition-[opacity,transform] duration-150 motion-reduce:transition-none ${controlsOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`}
			>
				<div className="flex items-center justify-between border-b border-line px-4 py-3">
					<h1 className="text-sm text-ink">{entry.title}</h1>
					<button
						type="button"
						className={button}
						aria-label="Close controls"
						onClick={closeControls}
					>
						<XIcon size={16} />
					</button>
				</div>
				<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							className={button}
							onClick={nav.onBack}
						>
							← All interactions
						</button>
						<button
							type="button"
							className={button}
							aria-label="Previous interaction"
							onClick={() => nav.onGo(-1)}
						>
							←
						</button>
						<button
							type="button"
							className={button}
							aria-label="Next interaction"
							onClick={() => nav.onGo(1)}
						>
							→
						</button>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<label className="flex items-center gap-2 text-xs text-ink-muted">
							Version
							<select
								aria-label="Version"
								value={selected}
								onChange={(event) => {
									setSelected(event.target.value);
									setRevision((value) => value + 1);
								}}
								className="max-w-[15rem] rounded-md border border-line bg-paper px-2 py-1.5 text-ink"
							>
								<option value="baseline">Baseline</option>
								{entry.presets?.map((shipped) => (
									<option
										key={shipped.key}
										value={`preset:${shipped.key}`}
									>
										{shipped.name}
									</option>
								))}
								{variants.map((saved) => (
									<option key={saved.id} value={saved.id}>
										{saved.name}
									</option>
								))}
							</select>
						</label>
						<button
							type="button"
							className={button}
							onClick={createVariant}
						>
							Create variant
						</button>
						{candidate ? (
							<label className="flex items-center gap-2 px-2 text-xs text-ink-muted">
								<input
									type="checkbox"
									checked={compare}
									onChange={(event) => {
										setCompare(event.target.checked);
										setRevision((value) => value + 1);
									}}
								/>
								Compare with baseline
							</label>
						) : null}
						<button
							type="button"
							className={`${button} ms-auto`}
							onClick={() => setRevision((value) => value + 1)}
						>
							Reset scene
						</button>
					</div>
					{variant ? (
						<section
							aria-label="Variant parameters"
							className="space-y-4 border-t border-line pt-4"
						>
							<div className="flex flex-wrap items-center gap-3">
								<label className="flex items-center gap-2 text-xs text-ink-muted">
									Name
									<input
										aria-label="Variant name"
										value={variant.name}
										maxLength={80}
										className="w-36 rounded-md border border-line bg-paper px-2 py-1 text-ink"
										onChange={(event) =>
											setVariants((current) =>
												current.map((variant) =>
													variant.id === selected
														? {
																...variant,
																name: event
																	.target
																	.value,
															}
														: variant,
												),
											)
										}
									/>
								</label>
								<button
									type="button"
									className={button}
									onClick={() =>
										setVariants((current) =>
											current.map((variant) =>
												variant.id === selected
													? { ...variant, motion: {} }
													: variant,
											),
										)
									}
								>
									Reset parameters
								</button>
								<button
									type="button"
									className={button}
									onClick={() => {
										setVariants((current) =>
											current.filter(
												(variant) =>
													variant.id !== selected,
											),
										);
										setSelected("baseline");
									}}
								>
									Delete variant
								</button>
							</div>
							<div className="grid gap-4">
								{PARAMETERS.filter((parameter) =>
									entry.knobs.includes(parameter.key),
								).map((parameter) => {
									const value =
										variant.motion[parameter.key] ??
										DEFAULT_DECK_MOTION[parameter.key];
									if (parameter.choices)
										return (
											<label
												key={parameter.key}
												className="flex items-center justify-between gap-3 text-xs text-ink-muted"
											>
												{parameter.label}
												<select
													aria-label={parameter.label}
													value={value}
													className="rounded-md border border-line bg-paper px-2 py-1.5 text-ink"
													onChange={(event) =>
														patch({
															[parameter.key]:
																Number(
																	event.target
																		.value,
																),
														})
													}
												>
													{parameter.choices.map(
														(choice, index) => (
															<option
																key={choice}
																value={index}
															>
																{choice}
															</option>
														),
													)}
												</select>
											</label>
										);
									return (
										<div
											key={parameter.key}
											className="space-y-2"
										>
											<label className="flex items-center justify-between gap-3 text-xs text-ink-muted">
												{parameter.label}
												<span className="flex items-center gap-1">
													<input
														aria-label={
															parameter.label
														}
														type="number"
														min={parameter.min}
														max={parameter.max}
														step={parameter.step}
														value={value}
														className="w-20 rounded border border-line bg-paper px-2 py-1 text-ink"
														onChange={(event) => {
															const next =
																event.target
																	.valueAsNumber;
															if (
																Number.isFinite(
																	next,
																)
															)
																patch({
																	[parameter.key]:
																		Math.min(
																			parameter.max,
																			Math.max(
																				parameter.min,
																				next,
																			),
																		),
																});
														}}
													/>
													{parameter.unit}
												</span>
											</label>
											<input
												aria-label={`${parameter.label} slider`}
												type="range"
												className="w-full accent-current"
												min={parameter.min}
												max={parameter.max}
												step={parameter.step}
												value={value}
												onChange={(event) =>
													patch({
														[parameter.key]:
															event.target
																.valueAsNumber,
													})
												}
											/>
										</div>
									);
								})}
							</div>
						</section>
					) : null}
					<section
						aria-label="Frame trace"
						className="space-y-4 border-t border-line pt-4"
					>
						<h2 className="font-mono text-xs tracking-wide text-ink-muted">
							Frame trace
						</h2>
						{(["baseline", "candidate"] as const)
							.filter((kind) =>
								kind === "baseline"
									? !candidate || compare
									: Boolean(candidate),
							)
							.map((kind) => (
								<div
									key={kind}
									data-trace={kind}
									className="space-y-2"
								>
									{candidate && compare ? (
										<h3 className="font-mono text-[0.65rem] text-ink">
											{kind === "baseline"
												? "Baseline"
												: candidate.name || "Variant"}
										</h3>
									) : null}
									<TraceView
										recordings={recordings[kind]}
										onClear={() =>
											setRecordings((current) => ({
												...current,
												[kind]: [],
											}))
										}
									/>
								</div>
							))}
					</section>
				</div>
			</aside>
			<button
				ref={controlsToggle}
				type="button"
				aria-label={controlsOpen ? "Hide controls" : "Show controls"}
				aria-expanded={controlsOpen}
				aria-controls="workbench-controls"
				onClick={() => setControlsOpen((open) => !open)}
				className="absolute end-4 bottom-4 z-50 grid size-11 place-items-center rounded-xl border border-line-strong bg-paper/95 text-ink-muted shadow-lg backdrop-blur-md hover:text-ink focus-visible:outline-2 focus-visible:outline-link"
			>
				<SlidersHorizontalIcon size={18} />
			</button>
			<div
				className={`grid h-full auto-rows-[100%] overflow-auto ${candidate && compare ? "divide-y divide-line xl:grid-cols-2 xl:divide-x xl:divide-y-0" : ""}`}
			>
				{!candidate || compare ? (
					<Specimen
						entry={entry}
						kind="baseline"
						label="Baseline"
						revision={revision}
						onRecording={record}
					/>
				) : null}
				{candidate ? (
					<Specimen
						key={selected}
						entry={entry}
						kind="candidate"
						label={candidate.name || "Variant"}
						motion={candidate.motion}
						revision={revision}
						onRecording={record}
					/>
				) : null}
			</div>
		</div>
	);
}
