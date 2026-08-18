export const SOURCE_CONTEXT_EMPHASIS_COLOR = "#4d8ce6";

type ScrollTarget = {
	scrollIntoView(options?: ScrollIntoViewOptions): void;
};

type AnimationTarget = {
	animate(
		keyframes: Keyframe[] | PropertyIndexedKeyframes,
		options?: number | KeyframeAnimationOptions,
	): Animation;
};

export function actuateSourceContextFocus(
	sentence: ScrollTarget,
	members: readonly AnimationTarget[],
): Animation[] {
	sentence.scrollIntoView({ block: "center", behavior: "auto" });
	return members.map((member) =>
		member.animate(
			[
				{ backgroundColor: SOURCE_CONTEXT_EMPHASIS_COLOR },
				{ backgroundColor: "transparent" },
			],
			{
				duration: 900,
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
