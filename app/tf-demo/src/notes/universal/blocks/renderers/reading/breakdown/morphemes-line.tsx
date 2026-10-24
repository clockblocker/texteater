import {
	type CSSProperties,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";

import type { WorkspaceTarget } from "@/workspace/workspace-subject";
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
const LINE_TIMINGS = {
	"--reveal-in": "170ms",
	"--reveal-out": "110ms",
	"--reveal-color": "120ms",
	"--reveal-ease": "cubic-bezier(0.23, 1, 0.32, 1)",
} as CSSProperties;

function lettersStyle(shown: boolean, motion: RevealMotion): CSSProperties {
	if (motion === "Instant") return { transition: "none" };
	return {
		transition: shown
			? "color var(--reveal-color) ease"
			: "color var(--reveal-out) ease-out",
	};
}

function RevealPiece({
	piece,
	index,
	shown,
	tabbable,
	motion,
	onReveal,
	onFocusPiece,
	onBlurPiece,
	onActivate,
}: {
	readonly piece: Morpheme;
	readonly index: number;
	readonly shown: boolean;
	readonly tabbable: boolean;
	readonly motion: RevealMotion;
	readonly onReveal: (index: number) => void;
	readonly onFocusPiece: (index: number, visible: boolean) => void;
	readonly onBlurPiece: (index: number) => void;
	readonly onActivate: (index: number) => void;
}) {
	const zero = piece.letters === "";
	const isChunk = piece.kind === "Chunk";
	const framed = framedKinds.has(piece.kind);
	// A part not split yet keeps the Shadow tone of a pending link, unmarked.
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
					className={`relative ${shown ? tone : "text-ink"}`}
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

/**
 * The Morphemic Breakdown line (ADR 0051), as the user's sketch draws it
 * (#1241): at rest the word is plain text; under the pointer, or keyboard
 * focus, one morpheme's letters turn link blue and its school mark draws in
 * above them, with nothing marked on its neighbours. The zero ending is a
 * target after the last letter, and a part not split yet is one chunk in
 * the Shadow tone. Arrow keys walk the morphemes (one tab stop, a toolbar's
 * roving focus); Enter opens the morpheme's Note. A click opens it and pins
 * the reveal, which survives Back and clears on a click elsewhere or Esc; a
 * tap reveals first and opens on the second tap.
 */
export function MorphemesLine({
	owner,
	pieces,
	follow,
}: {
	/** Names the line, so a pinned reveal survives leaving the Note. */
	readonly owner: string;
	readonly pieces: readonly Morpheme[];
	readonly follow: (target: WorkspaceTarget) => void;
}) {
	const lineRef = useRef<HTMLDivElement>(null);
	const lastInput = useRef<string>("mouse");
	const [hovered, setHovered] = useState<number | null>(null);
	const [focused, setFocused] = useState<number | null>(null);
	const [armed, setArmed] = useState<number | null>(null);
	const [instant, setInstant] = useState(false);
	const [pinned, setPinned] = useMorphemePin(owner);
	const interactive = pieces.flatMap((piece, index) =>
		piece.kind === "Filler" ? [] : [index],
	);
	const [roving, setRoving] = useState<number | null>(null);
	const tabStop =
		roving !== null && interactive.includes(roving)
			? roving
			: (interactive[0] ?? null);
	const shownIndex = hovered ?? focused ?? armed ?? pinned;
	// Keyboard focus is repeated input: it reveals at once (emil-design-eng).
	const motion: RevealMotion = instant ? "Instant" : "Draw";

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
		if (input === "touch" && armed !== index) {
			setInstant(false);
			setArmed(index);
			return;
		}
		setArmed(null);
		setPinned(index);
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
				style={LINE_TIMINGS}
				onPointerDown={(event) => {
					lastInput.current = event.pointerType;
				}}
				onPointerLeave={() => setHovered(null)}
				onKeyDown={move}
			>
				{pieces.map((piece, index) => {
					const key = `${index}:${piece.kind}:${piece.letters}`;
					if (piece.kind === "Filler")
						return piece.letters === "" ? null : (
							<span key={key} className="inline-block text-ink">
								{piece.letters}
							</span>
						);
					return (
						<RevealPiece
							key={key}
							piece={piece}
							index={index}
							shown={shownIndex === index}
							tabbable={tabStop === index}
							motion={motion}
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
