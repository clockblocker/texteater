import { cn } from "lego";
import {
	ChevronLeft,
	ChevronRight,
	Pause,
	Play,
	RotateCcw,
} from "lucide-react";
import {
	AnimatePresence,
	LayoutGroup,
	MotionConfig,
	motion,
} from "motion/react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { langAttrs } from "@/fixtures";
import {
	type Beat,
	captionRuns,
	clustersOf,
	matchByWord,
	type Stage,
	type StageWord,
} from "./timeline";
import type { Playback } from "./use-playback";

/** The design's open choices that change how the stage plays. */
export type StageLook = {
	readonly match: "character" | "word";
	readonly captions: boolean;
	readonly tags: boolean;
	readonly context: boolean;
	/** Seconds for one move at this speed; 0 under reduced motion. */
	readonly moveS: number;
};

/** Keynote's default Magic Move curve: ease in and out. */
const easeInOut = [0.42, 0, 0.58, 1] as const;

/** The dashed box an open place in a lemma wears, here and in headers. */
export const slotClass =
	"rounded-[0.3em] border border-dashed border-current/50 px-[0.25em] text-[0.8em] font-normal italic";

/** The Card's quiet kind label: `SURFACE`, `LEMMA`. */
export const kindLabelClass =
	"font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase";

/**
 * The metamorphosis: the clicked words on a small stage, turning into the
 * Surface and then the lemma one frame at a time, Magic Move style. A word
 * travels to its new place, a piece it loses fades out where it stood and
 * a piece it gains fades in where it lands; the frame's caption says what
 * changed and why, and a tap on the words steps on. Each stage's result
 * wears its kind label. The controls under it play, pause, step and scrub,
 * with the dots grouped by stage.
 */
export function MorphStage({
	beats,
	stages,
	playback,
	look,
	size,
}: {
	readonly beats: readonly Beat[];
	readonly stages: readonly Stage[];
	readonly playback: Playback;
	readonly look: StageLook;
	readonly size: "card" | "sheet";
}) {
	const beat = beats[playback.at];
	const frame = beat?.frame;
	const groupId = useId();
	// Words that were on the stage last frame travel; only new ones fade in.
	const seen = useRef<ReadonlySet<string>>(new Set());
	const words = (frame?.words ?? [])
		.filter((word) => look.context || word.kind !== "ghost")
		.map((word) => (look.match === "word" ? matchByWord(word) : word));
	useEffect(() => {
		seen.current = new Set(words.map((word) => word.id));
	});
	if (!beat || !frame) return null;
	const landed = playback.at === beats.length - 1;

	return (
		<MotionConfig
			transition={{ duration: look.moveS, ease: easeInOut }}
			reducedMotion={look.moveS === 0 ? "always" : "never"}
		>
			<div className="grid gap-2">
				{/* biome-ignore lint/a11y/useKeyWithClickEvents: a tap on the words is a shortcut; the Next button is the keyboard's step. */}
				<div
					{...langAttrs("de")}
					aria-label={frame.words
						.filter((word) => word.kind !== "ghost")
						.map((word) =>
							word.pieces.map((piece) => piece.text).join(""),
						)
						.join(" ")}
					role="img"
					onClick={playback.tap}
					className={cn(
						"relative flex cursor-pointer flex-wrap items-baseline gap-x-[0.3em] rounded-lg bg-canvas/60 select-none",
						size === "card"
							? "min-h-[6.25rem] gap-y-5 px-3 pt-7 pb-6 text-xl"
							: "min-h-[9rem] gap-y-7 px-5 pt-10 pb-9 text-2xl @min-[640px]/frame:text-3xl",
					)}
				>
					<AnimatePresence initial={false}>
						{beat.result ? (
							<motion.span
								key={beat.result}
								{...langAttrs("en")}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className={cn(
									kindLabelClass,
									"pointer-events-none absolute",
									size === "card"
										? "start-3 top-2.5"
										: "start-5 top-3.5",
								)}
							>
								{beat.result}
							</motion.span>
						) : null}
					</AnimatePresence>
					<LayoutGroup id={groupId}>
						<AnimatePresence mode="popLayout" initial={false}>
							{clustersOf(words).map((cluster) => (
								<motion.span
									key={cluster.key}
									exit={{ opacity: 0, y: "0.35em" }}
									className={cn(
										"inline-flex whitespace-nowrap",
										cluster.words[0]?.pieces[0]?.text.startsWith(
											",",
										) && "-ms-[0.3em]",
									)}
								>
									{cluster.words.map((word) => (
										<WordView
											key={word.id}
											word={word}
											isNew={!seen.current.has(word.id)}
											landed={landed}
											tags={look.tags}
										/>
									))}
								</motion.span>
							))}
						</AnimatePresence>
					</LayoutGroup>
				</div>
				{look.captions ? (
					<Caption
						key={playback.at}
						caption={frame.caption}
						size={size}
					/>
				) : null}
				<Controls beats={beats} stages={stages} playback={playback} />
			</div>
		</MotionConfig>
	);
}

function WordView({
	word,
	isNew,
	landed,
	tags,
}: {
	readonly word: StageWord;
	readonly isNew: boolean;
	readonly landed: boolean;
	readonly tags: boolean;
}) {
	const ghost = word.kind === "ghost";
	const slot = word.kind === "slot";
	return (
		<motion.span
			layoutId={word.id}
			layout="position"
			initial={isNew ? { opacity: 0, y: "-0.35em" } : false}
			animate={{ opacity: 1, y: 0 }}
			className={cn(
				"relative inline-flex font-[570] tracking-[-0.02em] transition-colors duration-300",
				ghost &&
					cn(
						"text-[0.7em] font-normal",
						word.lit ? "text-ink-soft" : "text-ink-faint",
					),
				!ghost && "text-ink",
				slot && cn(slotClass, "text-ink-soft"),
				landed && !ghost && "text-link",
				word.tone === "neuter" && "[--link:var(--gender-neuter)]",
			)}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				{word.pieces.map((piece) => (
					<motion.span
						key={piece.id}
						layout="position"
						initial={{ opacity: 0, y: "0.45em" }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: "-0.45em" }}
						className={cn(
							"inline-block transition-colors duration-300",
							piece.focus && !ghost && "text-link",
						)}
					>
						<AnimatePresence mode="popLayout" initial={false}>
							<motion.span
								key={piece.text}
								className="inline-block"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
							>
								{piece.text}
							</motion.span>
						</AnimatePresence>
					</motion.span>
				))}
			</AnimatePresence>
			{tags ? (
				<span className="pointer-events-none absolute inset-x-0 top-full flex justify-center">
					<AnimatePresence initial={false}>
						{word.tag ? (
							<motion.span
								key={word.tag}
								{...langAttrs("en")}
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0 }}
								className="absolute top-0.5 rounded-full bg-link/12 px-1.5 text-[0.62rem] leading-[1.6] font-medium not-italic tracking-normal whitespace-nowrap text-link"
							>
								{word.tag}
							</motion.span>
						) : null}
					</AnimatePresence>
				</span>
			) : null}
		</motion.span>
	);
}

/** The frame's one line; it fades in with the frame. */
function Caption({
	caption,
	size,
}: {
	readonly caption: string;
	readonly size: "card" | "sheet";
}) {
	return (
		<motion.p
			{...langAttrs("en")}
			aria-live="polite"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className={cn(
				"min-h-[2lh] text-pretty text-ink-soft",
				size === "card" ? "text-sm" : "text-base",
			)}
		>
			{captionRuns(caption).map((run, index) =>
				run.german ? (
					<i
						key={`${index}:${run.text}`}
						lang="de"
						className="text-ink"
					>
						{run.text}
					</i>
				) : (
					<span key={`${index}:${run.text}`}>{run.text}</span>
				),
			)}
		</motion.p>
	);
}

function Controls({
	beats,
	stages,
	playback,
}: {
	readonly beats: readonly Beat[];
	readonly stages: readonly Stage[];
	readonly playback: Playback;
}) {
	const { at, count, playing, ended } = playback;
	return (
		<div className="flex items-center gap-0.5">
			<ControlButton
				label="Previous step"
				disabled={at === 0}
				onClick={playback.previous}
			>
				<ChevronLeft className="size-4 rtl:-scale-x-100" />
			</ControlButton>
			<ControlButton
				label={playing ? "Pause" : ended ? "Replay" : "Play"}
				onClick={playback.toggle}
			>
				{playing ? (
					<Pause className="size-4" />
				) : ended ? (
					<RotateCcw className="size-4" />
				) : (
					<Play className="size-4 rtl:-scale-x-100" />
				)}
			</ControlButton>
			<ControlButton
				label="Next step"
				disabled={at === count - 1}
				onClick={playback.next}
			>
				<ChevronRight className="size-4 rtl:-scale-x-100" />
			</ControlButton>
			<Scrubber beats={beats} stages={stages} playback={playback} />
		</div>
	);
}

function ControlButton({
	label,
	disabled = false,
	onClick,
	children,
}: {
	readonly label: string;
	readonly disabled?: boolean;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-canvas hover:text-ink disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent"
		>
			{children}
		</button>
	);
}

/**
 * One dot per beat, the shown one stretched into a pill, grouped by stage
 * as a video's scrubber groups its chapters, each group named under it; a
 * native range lies over them, so a drag scrubs through the beats and the
 * arrow keys step.
 */
function Scrubber({
	beats,
	stages,
	playback,
}: {
	readonly beats: readonly Beat[];
	readonly stages: readonly Stage[];
	readonly playback: Playback;
}) {
	const { at, count } = playback;
	const current = beats[at]?.stage ?? 0;
	return (
		<div className="relative ms-2 flex h-8 min-w-0 flex-1 items-center">
			<div
				aria-hidden="true"
				className="flex w-full items-center gap-2.5"
			>
				{stages.map((stage, index) => {
					const members = beats.flatMap((beat, beatIndex) =>
						beat.stage === index ? [beatIndex] : [],
					);
					return (
						<div
							key={stage.name}
							className="relative flex min-w-0 items-center gap-1"
							style={{ flexGrow: members.length + 2 }}
						>
							{members.map((beatIndex) => (
								<span
									key={beatIndex}
									className={cn(
										"h-1.5 rounded-full transition-all duration-300",
										beatIndex === at
											? "flex-[3] bg-link"
											: beatIndex < at
												? "flex-1 bg-ink-muted"
												: "flex-1 bg-line",
									)}
								/>
							))}
							<span
								{...langAttrs("en")}
								className={cn(
									"absolute start-0 top-full mt-1 font-mono text-[0.58rem] leading-none font-bold tracking-[0.1em] whitespace-nowrap uppercase transition-colors duration-300",
									index === current
										? "text-ink-soft"
										: "text-ink-faint",
								)}
							>
								{stage.name}
							</span>
						</div>
					);
				})}
			</div>
			<input
				type="range"
				aria-label="Step"
				aria-valuetext={`Step ${at + 1} of ${count}, ${stages[current]?.name ?? ""}`}
				min={0}
				max={count - 1}
				step={1}
				value={at}
				onChange={(event) => playback.go(Number(event.target.value))}
				className="absolute inset-0 size-full cursor-pointer opacity-0"
			/>
		</div>
	);
}
