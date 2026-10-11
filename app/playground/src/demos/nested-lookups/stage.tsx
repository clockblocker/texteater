import { cn } from "lego";
import { motion } from "motion/react";
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { type FixtureWord, germanText, rectWithin, WordText } from "@/fixtures";
import { useFrameSize, usePlaygroundEnv } from "@/shell";
import { type Box, boxStyle, placeUnder } from "./placement";

/**
 * The reading text, scrolling in its own box, with a positioned layer over
 * it for lookup surfaces. A click on a word opens a lookup; a click
 * elsewhere in the text calls `onDismiss`.
 */
export function ReaderStage({
	contentRef,
	selectedWordId,
	onWord,
	onDismiss,
	children,
}: {
	readonly contentRef: RefObject<HTMLDivElement | null>;
	readonly selectedWordId: string | null;
	readonly onWord: (word: FixtureWord) => void;
	readonly onDismiss: () => void;
	readonly children: ReactNode;
}) {
	const readerRef = useRef<HTMLDivElement>(null);
	const dismiss = useRef(onDismiss);
	dismiss.current = onDismiss;

	useEffect(() => {
		const reader = readerRef.current;
		if (!reader) return;
		const onClick = (event: MouseEvent) => {
			if (
				event.target instanceof Element &&
				event.target.closest("[data-word-id]")
			)
				return;
			dismiss.current();
		};
		reader.addEventListener("click", onClick);
		return () => reader.removeEventListener("click", onClick);
	}, []);

	return (
		<div className="min-h-0 flex-1 overflow-auto">
			<div ref={contentRef} className="relative min-h-full">
				<div
					ref={readerRef}
					className="mx-auto grid max-w-[38rem] gap-4 px-5 pt-6 pb-[60cqh] @min-[600px]/frame:px-8 @min-[600px]/frame:pt-10"
				>
					<h2 className="text-sm text-ink-muted">
						{germanText.title}
					</h2>
					<WordText
						text={germanText}
						selectedWordId={selectedWordId}
						onWordClick={(click) => onWord(click.word)}
					/>
				</div>
				{children}
			</div>
		</div>
	);
}

/**
 * A lookup surface: a header for its controls over a scrolling body,
 * absolutely placed in the stage's content at `box`.
 */
export function Surface({
	id,
	label,
	box,
	containerWidth,
	zIndex,
	header,
	footer,
	className,
	children,
}: {
	readonly id: string;
	readonly label: string;
	readonly box: Box;
	readonly containerWidth: number;
	readonly zIndex?: number;
	readonly header: ReactNode;
	readonly footer?: ReactNode;
	readonly className?: string;
	readonly children: ReactNode;
}) {
	const { dir } = usePlaygroundEnv();
	return (
		<motion.section
			data-surface-id={id}
			aria-label={label}
			initial={{ opacity: 0, scale: 0.97, y: -4 }}
			animate={{ opacity: 1, scale: 1, y: 0 }}
			exit={{ opacity: 0, scale: 0.97 }}
			transition={{ type: "spring", duration: 0.25, bounce: 0 }}
			style={{
				...boxStyle(box, containerWidth, dir),
				zIndex,
				transformOrigin: "top",
			}}
			className={cn(
				"absolute flex flex-col rounded-2xl border border-line-strong bg-canvas shadow-[0_18px_40px_-16px_oklch(0%_0_0/0.6)]",
				className,
			)}
		>
			<header className="flex min-h-10 items-center gap-1 border-b border-line px-2 py-1">
				{header}
			</header>
			<div className="max-h-[min(30rem,58cqh)] overflow-y-auto overscroll-contain p-2">
				{children}
			</div>
			{footer}
		</motion.section>
	);
}

/** A small square button with an icon and a label for assistive tech. */
export function IconButton({
	label,
	onClick,
	pressed,
	disabled,
	children,
}: {
	readonly label: string;
	readonly onClick: () => void;
	readonly pressed?: boolean;
	readonly disabled?: boolean;
	readonly children: ReactNode;
}) {
	return (
		<button
			type="button"
			title={label}
			aria-label={label}
			aria-pressed={pressed}
			disabled={disabled}
			onClick={(event) => {
				event.stopPropagation();
				onClick();
			}}
			className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-ink-soft hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent aria-pressed:bg-paper aria-pressed:text-link"
		>
			{children}
		</button>
	);
}

/** Calls `handler` on Escape while mounted. */
export function useEscape(handler: () => void) {
	const latest = useRef(handler);
	latest.current = handler;
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") latest.current();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);
}

/**
 * The box of a single surface under the reader word `anchorId`, measured
 * again whenever the frame's width changes, and scrolled into view when
 * the anchor changes. Null with no anchor.
 */
export function useAnchoredBox(
	contentRef: RefObject<HTMLDivElement | null>,
	anchorId: string | null,
): { readonly box: Box | null; readonly containerWidth: number } {
	const { dir, reducedMotion } = usePlaygroundEnv();
	const { inlineSize } = useFrameSize();
	const [placed, setPlaced] = useState<{
		box: Box | null;
		containerWidth: number;
	}>({ box: null, containerWidth: 0 });

	useLayoutEffect(() => {
		const content = contentRef.current;
		const anchor = anchorId
			? content?.querySelector(`[data-word-id="${CSS.escape(anchorId)}"]`)
			: null;
		if (!content || !anchor) {
			setPlaced({ box: null, containerWidth: 0 });
			return;
		}
		const containerWidth = content.clientWidth;
		setPlaced({
			box: placeUnder(
				rectWithin(anchor.getBoundingClientRect(), content),
				containerWidth,
				dir,
			),
			containerWidth,
		});
	}, [contentRef, anchorId, dir, inlineSize]);

	const revealed = useRef<string | null>(null);
	useEffect(() => {
		if (!placed.box || !anchorId || revealed.current === anchorId) return;
		revealed.current = anchorId;
		revealBox(contentRef.current, placed.box, reducedMotion);
	}, [contentRef, placed.box, anchorId, reducedMotion]);
	return placed;
}

/**
 * Scrolls the stage so the top of a surface just placed at `box` shows,
 * with room for its first Card.
 */
export function revealBox(
	content: HTMLElement | null,
	box: Box,
	reducedMotion: boolean,
) {
	const scroller = content?.parentElement;
	if (!scroller) return;
	const room = Math.min(320, scroller.clientHeight * 0.6);
	const above = box.top - 48 < scroller.scrollTop;
	const below = box.top + room > scroller.scrollTop + scroller.clientHeight;
	if (!above && !below) return;
	scroller.scrollTo({
		top: above
			? Math.max(0, box.top - 48)
			: box.top + room - scroller.clientHeight + 16,
		behavior: reducedMotion ? "auto" : "smooth",
	});
}
