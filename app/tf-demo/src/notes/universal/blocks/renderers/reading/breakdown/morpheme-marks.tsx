import type { CSSProperties } from "react";

import type { BreakdownData } from "./constituents-line";

export type Morpheme = NonNullable<BreakdownData["morphemes"]>[number];

/**
 * The school mark a Kind wears above its letters (разбор по составу): the
 * prefix's bracket ¬ with its tick at the inline end, as the user's sketch
 * draws it, the root's arc ⌒ and the suffix's caret ^. The Ending's box and
 * the Interfix's ring are drawn around the letters instead.
 */
const markPaths: Readonly<Record<string, string>> = {
	Prefix: "M1 1.5 H99 V9",
	Root: "M1 9 Q50 -7 99 9",
	Suffix: "M1 9 L50 1 L99 9",
	Suffixoid: "M1 9 L50 1 L99 9",
};

const kindNames: Readonly<Record<string, string>> = {
	Prefix: "prefix",
	Root: "root",
	Suffix: "suffix",
	Suffixoid: "suffixoid",
	Interfix: "linking element",
	Ending: "ending",
	Chunk: "not split yet",
};

export function kindName(kind: string): string {
	return kindNames[kind] ?? kind.toLowerCase();
}

/** What a screen reader hears for one morpheme: `ein, prefix`. */
export function morphemeLabel(piece: Morpheme): string {
	return piece.letters === ""
		? "zero ending"
		: `${piece.letters}, ${kindName(piece.kind)}`;
}

/** Shapes drawn around the letters rather than above them. */
export const framedKinds: ReadonlySet<string> = new Set(["Ending", "Interfix"]);

export type RevealMotion = "Draw" | "Fade" | "Instant";

/**
 * How a revealed mark comes and goes. It enters with a short wipe from the
 * inline start (`Draw`) or a fade (`Fade`), on a strong ease-out, and leaves
 * with a quicker fade; the wipe resets only once the fade is done, so a
 * pointer that comes back mid-exit fades the whole mark back in. CSS
 * transitions retarget from the current value, so every change interrupts
 * cleanly. The durations come from the line's custom properties.
 */
export function markMotionStyle(
	shown: boolean,
	motion: RevealMotion,
): CSSProperties {
	const wiped = motion === "Draw" && !shown;
	const clipPath = wiped ? "inset(0 100% 0 0)" : "inset(0 0 0 0)";
	if (motion === "Instant")
		return { opacity: shown ? 1 : 0, clipPath, transition: "none" };
	return {
		opacity: shown ? 1 : 0,
		clipPath,
		transition: shown
			? motion === "Draw"
				? "clip-path var(--reveal-in) var(--reveal-ease), opacity calc(var(--reveal-in) * 0.5) linear"
				: "opacity var(--reveal-in) var(--reveal-ease)"
			: "opacity var(--reveal-out) ease-out, clip-path 0s linear var(--reveal-out)",
	};
}

/** The mark above a prefix, root or suffix, stretched over its letters. */
export function AboveMark({
	kind,
	className,
	style,
}: {
	readonly kind: string;
	readonly className: string;
	readonly style?: CSSProperties;
}) {
	const path = markPaths[kind];
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 100 10"
			preserveAspectRatio="none"
			className={`absolute inset-x-px top-0 h-[0.45em] w-[calc(100%-2px)] overflow-visible rtl:-scale-x-100 ${className}`}
			style={style}
		>
			{path ? (
				<path
					d={path}
					fill="none"
					stroke="currentColor"
					strokeWidth={1.6}
					vectorEffect="non-scaling-stroke"
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			) : null}
		</svg>
	);
}

/**
 * The Ending's box or the Interfix's ring, laid over the letters so that
 * revealing it moves nothing.
 */
export function FrameMark({
	kind,
	className,
	style,
}: {
	readonly kind: string;
	readonly className: string;
	readonly style?: CSSProperties;
}) {
	const ring = kind === "Interfix";
	// An absolutely placed SVG keeps its own aspect ratio instead of
	// stretching to its insets, so a span takes the insets and the SVG fills it.
	return (
		<span
			aria-hidden="true"
			className={`pointer-events-none absolute rtl:-scale-x-100 ${
				ring
					? "-inset-x-[0.14em] -inset-y-[0.02em]"
					: "-inset-x-[0.04em] inset-y-[0.06em]"
			} ${className}`}
			style={style}
		>
			<svg
				aria-hidden="true"
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				className="block size-full overflow-visible"
			>
				{ring ? (
					<ellipse
						cx={50}
						cy={50}
						rx={49}
						ry={49}
						fill="none"
						stroke="currentColor"
						strokeWidth={1.3}
						vectorEffect="non-scaling-stroke"
					/>
				) : (
					<rect
						x={1}
						y={1}
						width={98}
						height={98}
						rx={6}
						fill="none"
						stroke="currentColor"
						strokeWidth={1.3}
						vectorEffect="non-scaling-stroke"
					/>
				)}
			</svg>
		</span>
	);
}
