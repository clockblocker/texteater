import {
	type CSSProperties,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import {
	type BreakdownDisplay,
	useBreakdownDisplay,
} from "../../common/breakdown-display";
import {
	AboveMark,
	FrameMark,
	framedKinds,
	type Morpheme,
	markMotionStyle,
	morphemeLabel,
	type RevealMotion,
} from "./morpheme-marks";
import { useMorphemePin } from "./morpheme-pins";

/** Reveal timings: a quick wipe in, a quicker fade out (emil-design-eng). */
const REVEAL_IN_MS = 170;
const REVEAL_OUT_MS = 110;
const REVEAL_COLOR_MS = 120;
const SLOW_MOTION = 5;

function lineTimings(display: BreakdownDisplay): CSSProperties {
	const scale = display.slowMotion ? SLOW_MOTION : 1;
	return {
		"--reveal-in": `${REVEAL_IN_MS * scale}ms`,
		"--reveal-out": `${REVEAL_OUT_MS * scale}ms`,
		"--reveal-color": `${REVEAL_COLOR_MS * scale}ms`,
		"--reveal-ease": "cubic-bezier(0.23, 1, 0.32, 1)",
	} as CSSProperties;
}

function lettersStyle(shown: boolean, motion: RevealMotion): CSSProperties {
	if (motion === "Instant") return { transition: "none" };
	return {
		transition: shown
			? "color var(--reveal-color) ease, text-decoration-color var(--reveal-color) ease"
			: "color var(--reveal-out) ease-out, text-decoration-color var(--reveal-out) ease-out",
	};
}

/** Hairlines at a revealed morpheme's edges, where a neighbour begins. */
function Boundary({
	side,
	shown,
	motion,
}: {
	readonly side: "start" | "end";
	readonly shown: boolean;
	readonly motion: RevealMotion;
}) {
	return (
		<span
			aria-hidden="true"
			className={`pointer-events-none absolute top-[0.7em] bottom-[0.12em] w-px bg-ink-faint ${
				side === "start" ? "-start-px" : "-end-px"
			}`}
			style={markMotionStyle(shown, motion === "Draw" ? "Fade" : motion)}
		/>
	);
}

function RevealPiece({
	piece,
	index,
	shown,
	tabbable,
	boundaries,
	motion,
	chunk,
	onReveal,
	onFocusPiece,
	onBlurPiece,
	onActivate,
}: {
	readonly piece: Morpheme;
	readonly index: number;
	readonly shown: boolean;
	readonly tabbable: boolean;
	readonly boundaries: { readonly start: boolean; readonly end: boolean };
	readonly motion: RevealMotion;
	readonly chunk: BreakdownDisplay["chunk"];
	readonly onReveal: (index: number) => void;
	readonly onFocusPiece: (index: number, visible: boolean) => void;
	readonly onBlurPiece: (index: number) => void;
	readonly onActivate: (index: number) => void;
}) {
	const zero = piece.letters === "";
	const isChunk = piece.kind === "Chunk";
	const framed = framedKinds.has(piece.kind);
	const tone = isChunk ? "text-link-shadow" : "text-link";
	const markStyle = markMotionStyle(shown, motion);
	return (
		<button
			type="button"
			data-morpheme={index}
			data-kind={piece.kind}
			data-shown={shown}
			tabIndex={tabbable ? 0 : -1}
			aria-label={morphemeLabel(piece)}
			className={`relative inline-block cursor-pointer pt-[0.55em] outline-none ${
				zero ? "w-[0.8em]" : ""
			}`}
			onPointerEnter={(event) => {
				if (event.pointerType !== "touch") onReveal(index);
			}}
			onFocus={(event) =>
				onFocusPiece(
					index,
					event.currentTarget.matches(":focus-visible"),
				)
			}
			onBlur={() => onBlurPiece(index)}
			onClick={() => onActivate(index)}
		>
			{framed || isChunk ? null : (
				<AboveMark
					kind={piece.kind}
					className={tone}
					style={markStyle}
				/>
			)}
			{boundaries.start ? (
				<Boundary side="start" shown={shown} motion={motion} />
			) : null}
			{boundaries.end ? (
				<Boundary side="end" shown={shown} motion={motion} />
			) : null}
			{zero ? (
				<span className="relative ms-[0.12em] inline-block h-[0.9em] w-[0.55em] translate-y-[0.12em]">
					<FrameMark
						kind="Ending"
						className={`inset-0! ${tone}`}
						style={markStyle}
					/>
				</span>
			) : (
				<span
					className={`relative ${shown ? tone : "text-ink"} ${
						isChunk && chunk === "Underlined"
							? `underline decoration-dashed decoration-1 underline-offset-[0.22em] ${
									shown
										? "decoration-current"
										: "decoration-transparent"
								}`
							: ""
					}`}
					style={lettersStyle(shown, motion)}
				>
					{framed ? (
						<FrameMark
							kind={piece.kind}
							className={tone}
							style={markStyle}
						/>
					) : null}
					{piece.letters}
				</span>
			)}
		</button>
	);
}

/**
 * Where an arrow key moves focus along the word: toward the inline end or
 * start, so the arrows follow the reading direction, or to either end.
 */
function nextMorpheme(
	key: string,
	rtl: boolean,
	interactive: readonly number[],
	current: number | null,
): number | undefined {
	const position = current === null ? -1 : interactive.indexOf(current);
	const forward = rtl ? "ArrowLeft" : "ArrowRight";
	const backward = rtl ? "ArrowRight" : "ArrowLeft";
	switch (key) {
		case "Home":
			return interactive[0];
		case "End":
			return interactive.at(-1);
		case forward:
			return interactive[Math.min(position + 1, interactive.length - 1)];
		case backward:
			return interactive[Math.max(position - 1, 0)];
		default:
			return undefined;
	}
}

/** Whether a piece takes the pointer and focus at all. */
function isInteractive(piece: Morpheme, display: BreakdownDisplay): boolean {
	if (piece.kind === "Filler") return false;
	if (piece.letters === "") return display.zeroEnding === "TargetAfterWord";
	return true;
}

/**
 * The morphemes line as the user's sketch draws it (#1241): at rest the word
 * is plain text; under the pointer, or keyboard focus, one morpheme's
 * letters turn link blue and its school mark draws in above them. Arrow keys
 * walk the morphemes (one tab stop, a toolbar's roving focus); Enter opens
 * the morpheme's Note. A click opens it too, and can pin the reveal; a tap
 * can reveal first and open on the second tap.
 */
export function RevealMorphemesLine({
	owner,
	pieces,
	follow,
}: {
	readonly owner: string;
	readonly pieces: readonly Morpheme[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const display = useBreakdownDisplay();
	const lineRef = useRef<HTMLDivElement>(null);
	const lastInput = useRef<string>("mouse");
	const [hovered, setHovered] = useState<number | null>(null);
	const [focused, setFocused] = useState<number | null>(null);
	const [armed, setArmed] = useState<number | null>(null);
	const [instant, setInstant] = useState(false);
	const [pinned, setPinned] = useMorphemePin(owner);
	const interactive = pieces.flatMap((piece, index) =>
		isInteractive(piece, display) ? [index] : [],
	);
	const [roving, setRoving] = useState<number | null>(null);
	const tabStop =
		roving !== null && interactive.includes(roving)
			? roving
			: (interactive[0] ?? null);
	const shownIndex = hovered ?? focused ?? armed ?? pinned;
	// Keyboard focus is repeated input: it reveals at once (emil-design-eng).
	const motion: RevealMotion = instant ? "Instant" : display.motion;

	// A tap or click outside the line drops a tap's reveal and a pin.
	useEffect(() => {
		if (armed === null && pinned === null) return;
		const onPointerDown = (event: PointerEvent) => {
			if (
				event.target instanceof Node &&
				lineRef.current?.contains(event.target)
			)
				return;
			setArmed(null);
			setPinned(null);
		};
		document.addEventListener("pointerdown", onPointerDown);
		return () => document.removeEventListener("pointerdown", onPointerDown);
	}, [armed, pinned, setPinned]);

	const activate = (index: number) => {
		const piece = pieces[index];
		if (!piece) return;
		const input = lastInput.current;
		lastInput.current = "mouse";
		if (
			input === "touch" &&
			display.touch === "TapRevealsThenOpens" &&
			armed !== index
		) {
			setInstant(false);
			setArmed(index);
			return;
		}
		setArmed(null);
		if (display.click === "PinAndOpen") setPinned(index);
		const link = piece.target?.link;
		if (link) follow(link);
	};

	const move = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			lastInput.current = "keyboard";
			return;
		}
		if (event.key === "Escape" && (pinned !== null || armed !== null)) {
			event.stopPropagation();
			setPinned(null);
			setArmed(null);
			return;
		}
		const next = nextMorpheme(
			event.key,
			getComputedStyle(event.currentTarget).direction === "rtl",
			interactive,
			tabStop,
		);
		if (next === undefined) return;
		event.preventDefault();
		setRoving(next);
		lineRef.current
			?.querySelector<HTMLElement>(`[data-morpheme="${next}"]`)
			?.focus();
	};

	return (
		<div
			data-breakdown-line="morphemes"
			className="pt-[0.2em] text-[1.2em] tracking-[0.02em]"
		>
			<div
				ref={lineRef}
				role="toolbar"
				aria-label="Morphemes"
				data-reveal-instant={instant}
				className="inline-flex items-end whitespace-nowrap"
				style={lineTimings(display)}
				onPointerDown={(event) => {
					lastInput.current = event.pointerType;
				}}
				onPointerLeave={() => setHovered(null)}
				onKeyDown={move}
			>
				{pieces.map((piece, index) => {
					const key = `${index}:${piece.kind}:${piece.letters}`;
					if (!isInteractive(piece, display))
						return piece.letters === "" ? null : (
							<span key={key} className="inline-block text-ink">
								{piece.letters}
							</span>
						);
					const boundary = display.neighbours === "Boundary";
					const before = pieces[index - 1];
					const after = pieces[index + 1];
					return (
						<RevealPiece
							key={key}
							piece={piece}
							index={index}
							shown={shownIndex === index}
							tabbable={tabStop === index}
							boundaries={{
								start: boundary && before !== undefined,
								end:
									boundary &&
									after !== undefined &&
									piece.letters !== "" &&
									(after.letters !== "" ||
										display.zeroEnding ===
											"TargetAfterWord"),
							}}
							motion={motion}
							chunk={display.chunk}
							onReveal={(next) => {
								setInstant(false);
								setHovered(next);
							}}
							onFocusPiece={(next, visible) => {
								setRoving(next);
								if (!visible) return;
								setInstant(true);
								setFocused(next);
							}}
							onBlurPiece={(left) =>
								setFocused((current) =>
									current === left ? null : current,
								)
							}
							onActivate={activate}
						/>
					);
				})}
			</div>
		</div>
	);
}
