import { describe, expect, test } from "bun:test";

import {
	actuateSourceContextFocus,
	isFocusedOccurrenceMember,
	prefersReducedMotion,
	SOURCE_CONTEXT_EMPHASIS_COLOR,
} from "../src/lib/source-context-focus";

describe("Source Context focus", () => {
	test("centers the Sentence and animates every exact member once", () => {
		const scrollCalls: unknown[] = [];
		const animationCalls: unknown[][] = [[], []];
		const cancellations = [0, 0];
		const animations = actuateSourceContextFocus(
			{
				scrollIntoView(options) {
					scrollCalls.push(options);
				},
			},
			animationCalls.map((calls, index) => ({
				animate(keyframes, options) {
					calls.push(keyframes, options);
					return {
						cancel() {
							cancellations[index] += 1;
						},
					} as Animation;
				},
			})),
		);

		expect(scrollCalls).toEqual([{ block: "center", behavior: "auto" }]);
		for (const calls of animationCalls) {
			expect(calls).toEqual([
				[
					{ backgroundColor: SOURCE_CONTEXT_EMPHASIS_COLOR },
					{ backgroundColor: "transparent" },
				],
				{ duration: 600, easing: "ease-out", iterations: 1 },
			]);
		}
		for (const animation of animations) animation.cancel();
		expect(cancellations).toEqual([1, 1]);
	});

	test("still centers the Sentence but skips the flash when motion is reduced", () => {
		const scrollCalls: unknown[] = [];
		let animateCalls = 0;
		const animations = actuateSourceContextFocus(
			{
				scrollIntoView(options) {
					scrollCalls.push(options);
				},
			},
			[
				{
					animate() {
						animateCalls += 1;
						return {} as Animation;
					},
				},
			],
			true,
		);

		expect(scrollCalls).toEqual([{ block: "center", behavior: "auto" }]);
		expect(animateCalls).toBe(0);
		expect(animations).toEqual([]);
	});

	test("reads the system preference unless the app ignores it", () => {
		const view = (matches: boolean, preference?: string) => ({
			matchMedia: () => ({ matches }) as MediaQueryList,
			document: {
				documentElement: {
					dataset: preference ? { motionPreference: preference } : {},
				},
			} as unknown as Document,
		});
		expect(prefersReducedMotion(null)).toBe(false);
		expect(prefersReducedMotion(view(false))).toBe(false);
		expect(prefersReducedMotion(view(true))).toBe(true);
		expect(prefersReducedMotion(view(true, "ignore"))).toBe(false);
		expect(prefersReducedMotion(view(true, "respect"))).toBe(true);
	});

	test("matches discontinuous members without matching intervening Segments", () => {
		const focus = {
			kind: "Occurrence" as const,
			sentenceId: "sentence_1",
			memberSegmentIndices: [1, 4],
		};

		expect(isFocusedOccurrenceMember(focus, "sentence_1", 1)).toBe(true);
		expect(isFocusedOccurrenceMember(focus, "sentence_1", 2)).toBe(false);
		expect(isFocusedOccurrenceMember(focus, "sentence_1", 4)).toBe(true);
		expect(isFocusedOccurrenceMember(focus, "sentence_2", 1)).toBe(false);
	});
});
