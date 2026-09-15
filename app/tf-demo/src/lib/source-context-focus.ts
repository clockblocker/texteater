export const SOURCE_CONTEXT_EMPHASIS_COLOR = "oklch(64.1% 0.15 257.5)";

type ScrollTarget = {
	scrollIntoView(options?: ScrollIntoViewOptions): void;
};

type AnimationTarget = {
	animate(
		keyframes: Keyframe[] | PropertyIndexedKeyframes,
		options?: number | KeyframeAnimationOptions,
	): Animation;
};

/**
 * Whether the reader has turned motion off. The Web Animations call below
 * bypasses the app's reduced-motion stylesheet, so it checks for itself and
 * honours the same `data-motion-preference="ignore"` override.
 */
export function prefersReducedMotion(
	view: Pick<Window, "matchMedia" | "document"> | null = typeof window ===
	"undefined"
		? null
		: window,
): boolean {
	if (!view) return false;
	if (view.document.documentElement.dataset.motionPreference === "ignore")
		return false;
	return view.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function actuateSourceContextFocus(
	sentence: ScrollTarget,
	members: readonly AnimationTarget[],
	reduceMotion: boolean = prefersReducedMotion(),
): Animation[] {
	sentence.scrollIntoView({ block: "center", behavior: "auto" });
	/* The static highlight already marks the members; the flash only adds
	   motion, so it is skipped entirely when motion is turned off. */
	if (reduceMotion) return [];
	return members.map((member) =>
		member.animate(
			[
				{ backgroundColor: SOURCE_CONTEXT_EMPHASIS_COLOR },
				{ backgroundColor: "transparent" },
			],
			{
				duration: 600,
				easing: "ease-out",
				iterations: 1,
			},
		),
	);
}

export function isFocusedOccurrenceMember(
	focus:
		| { readonly kind: "None" | "Missing" }
		| {
				readonly kind: "Occurrence";
				readonly sentenceId: string;
				readonly memberSegmentIndices: readonly number[];
		  },
	sentenceId: string,
	segmentIndex: number,
): boolean {
	return (
		focus.kind === "Occurrence" &&
		focus.sentenceId === sentenceId &&
		focus.memberSegmentIndices.includes(segmentIndex)
	);
}
