import { clampMorph, NOTE_SECTION_CHROMES, type NoteSectionChrome } from "lego";
import {
	type AnimationPlaybackControls,
	animate,
	type MotionStyle,
	motion,
	useMotionValue,
	useMotionValueEvent,
	useTransform,
} from "motion/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cardBoxRem } from "@/presentation/deck-geometry";
import { headingHeightRemAt } from "@/presentation/morph";
import { PresentationBox } from "@/presentation/presentation-box";
import {
	type ContentDrawing,
	PresentationContent,
} from "@/presentation/presentation-content";
import { tween } from "@/workspace/motion/motion-spec";
import { useDeckReducedMotion } from "@/workspace/motion/reduced-motion";
import { useDeckMotion } from "@/workspace/motion/runtime-config";

type MorphForm = "card" | "cover";

/** Slow-motion tween (~0.25×) for frame-by-frame feel inspection of the morph. */
const SLOW_MORPH = tween(1200);
/** Height of the Sheet endpoint in the Morph Studio preview, in rem. */
const SHEET_HEIGHT_REM = 34;

function formatMorphPercent(progress: number): string {
	return `${Math.round(clampMorph(progress) * 100).toString()}%`;
}

/**
 * Interactive Card ↔ Sheet morph stage for comparing section label & divider
 * strategies directly in motion (via the real `MORPH` spring, slow-motion
 * playback, or manual scrubbing) on one unified Note tree.
 *
 * Drives `--note-morph`, box geometry, rising-sheet corners, paper surface,
 * and Heading row height through `MotionValue`s so playback and scrubbing
 * stay 60–120fps without React state re-renders or a `t = 0.5` midpoint snap.
 */
export function MorphStudio({
	label,
	columnRem,
	unifiedHeading,
	unifiedBody,
	sectionChrome,
	onSectionChromeChange,
	onBack,
	onClear,
}: {
	readonly label: string;
	readonly columnRem: number;
	readonly unifiedHeading: ReactNode;
	readonly unifiedBody: ReactNode;
	readonly sectionChrome: NoteSectionChrome;
	readonly onSectionChromeChange: (next: NoteSectionChrome) => void;
	readonly onBack: () => void;
	readonly onClear: () => void;
}) {
	const { MORPH, transition } = useDeckMotion();
	const reduce = useDeckReducedMotion();
	const motionProgress = useMotionValue(0);
	const clampedMorph = useTransform(motionProgress, clampMorph);
	const running = useRef<AnimationPlaybackControls | null>(null);
	const runIdRef = useRef(0);
	const sliderRef = useRef<HTMLInputElement>(null);
	const readoutRef = useRef<HTMLSpanElement>(null);
	const [targetForm, setTargetForm] = useState<MorphForm>("card");
	const [morphing, setMorphing] = useState(false);
	const [slow, setSlow] = useState(false);

	const card = cardBoxRem();
	const boxWidth = useTransform(
		clampedMorph,
		(t) =>
			`calc(${card.width.toString()}rem + (min(100%, var(--container-note)) - ${card.width.toString()}rem) * ${t.toString()})`,
	);
	const boxHeight = useTransform(
		clampedMorph,
		(t) =>
			`${(card.height + (SHEET_HEIGHT_REM - card.height) * t).toFixed(3)}rem`,
	);
	const boxRadius = useTransform(clampedMorph, (t) => {
		const topRadius = `calc(var(--radius-xl) + (var(--radius-2xl) - var(--radius-xl)) * ${t.toString()})`;
		const bottomRadius = `calc(var(--radius-xl) * ${(1 - t).toString()})`;
		return `${topRadius} ${topRadius} ${bottomRadius} ${bottomRadius}`;
	});
	const boxSurface = useTransform(clampedMorph, (t) => {
		if (t <= 0) return "var(--paper-elevated)";
		if (t >= 1) return "var(--paper)";
		const cardPct = ((1 - t) * 100).toFixed(1);
		return `color-mix(in oklab, var(--paper-elevated) ${cardPct}%, var(--paper))`;
	});
	const headingHeight = useTransform(
		clampedMorph,
		(t) => `${headingHeightRemAt(t, false).toFixed(3)}rem`,
	);

	const syncControls = useCallback((value: number) => {
		const clamped = clampMorph(value);
		const labelText = formatMorphPercent(clamped);
		if (readoutRef.current) {
			readoutRef.current.textContent = labelText;
		}
		if (sliderRef.current) {
			const formatted = clamped.toFixed(2);
			if (sliderRef.current.value !== formatted) {
				sliderRef.current.value = formatted;
			}
			sliderRef.current.setAttribute("aria-valuetext", labelText);
		}
	}, []);

	useMotionValueEvent(clampedMorph, "change", syncControls);

	useEffect(() => {
		return () => {
			runIdRef.current += 1;
			running.current?.stop();
			running.current = null;
		};
	}, []);

	function stopRunning() {
		runIdRef.current += 1;
		running.current?.stop();
		running.current = null;
	}

	function morphTo(nextForm: MorphForm) {
		stopRunning();
		const nextProgress = nextForm === "cover" ? 1 : 0;
		setTargetForm(nextForm);
		if (reduce || Math.abs(motionProgress.get() - nextProgress) < 1e-4) {
			setMorphing(false);
			motionProgress.jump(nextProgress);
			syncControls(nextProgress);
			return;
		}
		setMorphing(true);
		const runId = runIdRef.current;
		const morphSpec = slow ? transition(SLOW_MORPH) : MORPH;
		const control = animate(motionProgress, nextProgress, morphSpec);
		running.current = control;
		void control.then(() => {
			if (runIdRef.current !== runId) return;
			running.current = null;
			motionProgress.jump(nextProgress);
			syncControls(nextProgress);
			setMorphing(false);
		});
	}

	function scrubTo(next: number) {
		stopRunning();
		const clamped = clampMorph(next);
		motionProgress.jump(clamped);
		syncControls(clamped);
		if (clamped <= 0) {
			setMorphing(false);
			setTargetForm("card");
			return;
		}
		if (clamped >= 1) {
			setMorphing(false);
			setTargetForm("cover");
			return;
		}
		setMorphing(true);
	}

	const draw = useMemo<ContentDrawing>(
		() => ({
			morphing,
			surface: (dom) => (
				<motion.div
					{...dom}
					style={
						{
							...dom.style,
							"--note-morph": clampedMorph,
						} as MotionStyle
					}
				/>
			),
			row: (dom, { face, heightRem }) => {
				const isFolded = Boolean(dom["data-folded"]);
				return (
					<motion.div
						{...dom}
						style={{
							...dom.style,
							height: isFolded
								? `${heightRem.toString()}rem`
								: headingHeight,
							opacity: face ? 1 : 0,
						}}
					/>
				);
			},
			scroller: (dom) => <div {...dom} />,
			fade: (dom) => <div {...dom} />,
		}),
		[clampedMorph, headingHeight, morphing],
	);

	const chrome = useMemo(
		() => ({
			back: {
				label: "Back",
				enabled: true,
				onPress: onBack,
			},
			clear: {
				label: "Put the Note away",
				enabled: true,
				onPress: onClear,
			},
		}),
		[onBack, onClear],
	);

	const activeChromeMeta =
		NOTE_SECTION_CHROMES.find((option) => option.id === sectionChrome) ??
		NOTE_SECTION_CHROMES[0];

	return (
		<section
			aria-label="Live Card to Sheet morph"
			data-morph-studio=""
			className="grid gap-4 rounded-xl border border-line bg-canvas/50 p-4"
		>
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="grid gap-1">
					<h2 className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
						Card ↔ Sheet Morph Studio
					</h2>
					<p className="text-xs text-ink-soft">
						{activeChromeMeta?.summary}
					</p>
				</div>
				<fieldset className="inline-flex flex-wrap items-center gap-1 rounded-lg border border-line bg-paper p-1">
					<legend className="sr-only">
						Section label and divider morph style
					</legend>
					{NOTE_SECTION_CHROMES.map((option) => {
						const active = option.id === sectionChrome;
						return (
							<button
								key={option.id}
								type="button"
								aria-pressed={active}
								data-section-chrome-option={option.id}
								onClick={() => onSectionChromeChange(option.id)}
								className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-[color,background-color,scale] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 active:scale-[0.96] motion-reduce:transition-none ${
									active
										? "bg-raised text-ink"
										: "text-ink-muted hover:text-ink"
								}`}
							>
								{option.label}
							</button>
						);
					})}
				</fieldset>
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<button
					type="button"
					data-morph-toggle=""
					onClick={() =>
						morphTo(targetForm === "cover" ? "card" : "cover")
					}
					className="cursor-pointer rounded-md border border-line-strong bg-paper px-3 py-1.5 text-xs font-medium text-ink transition-[color,background-color,border-color,scale] duration-150 ease-out hover:border-link/60 hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 active:scale-[0.96] motion-reduce:transition-none"
				>
					{targetForm === "cover"
						? "Morph to Card"
						: "Morph to Sheet"}
				</button>
				<button
					type="button"
					aria-pressed={slow}
					onClick={() => setSlow((current) => !current)}
					className={`cursor-pointer rounded-md border px-2.5 py-1.5 font-mono text-[0.7rem] transition-[color,background-color,border-color,scale] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/50 active:scale-[0.96] motion-reduce:transition-none ${
						slow
							? "border-link/60 bg-raised text-link"
							: "border-line bg-paper text-ink-muted hover:text-ink"
					}`}
				>
					{slow ? "0.25× Slow" : "1× Spring"}
				</button>
				<label className="flex min-w-52 flex-1 items-center gap-3 text-xs text-ink-muted">
					<span className="font-mono text-[0.68rem] uppercase">
						Card
					</span>
					<input
						ref={sliderRef}
						type="range"
						aria-label="Morph progress"
						aria-valuetext="0%"
						min={0}
						max={1}
						step={0.01}
						defaultValue={0}
						onInput={(event) =>
							scrubTo(
								Number.parseFloat(event.currentTarget.value),
							)
						}
						onChange={(event) =>
							scrubTo(
								Number.parseFloat(event.currentTarget.value),
							)
						}
						className="h-1.5 flex-1 cursor-pointer accent-primary"
					/>
					<span className="font-mono text-[0.68rem] uppercase">
						Sheet
					</span>
					<span
						ref={readoutRef}
						data-morph-readout=""
						className="w-11 text-end font-mono text-xs text-ink tabular-nums"
					>
						0%
					</span>
				</label>
			</div>

			<div className="min-w-0 py-2">
				<PresentationBox
					as={motion.article}
					form={targetForm}
					data-presentation="morph"
					data-morph-target={targetForm}
					liftable={false}
					aria-label={`${label} live morph preview`}
					className="relative max-w-full transition-shadow duration-200 ease-out"
					style={
						{
							width: boxWidth,
							height: boxHeight,
							borderRadius: boxRadius,
							backgroundColor: boxSurface,
							"--note-bg": boxSurface,
						} as MotionStyle
					}
				>
					<PresentationContent
						form={targetForm}
						columnRem={columnRem}
						heading={unifiedHeading}
						body={unifiedBody}
						sectionChrome={sectionChrome}
						chrome={chrome}
						draw={draw}
					/>
				</PresentationBox>
			</div>
		</section>
	);
}
