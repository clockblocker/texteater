import { describe, expect, test } from "bun:test";
import { createTapCounter } from "./pointer";

/** A tap counter on a clock the test moves. */
function counter() {
	let now = 0;
	const taps = createTapCounter(350, 10, () => now);
	return {
		tap: (id: string, x: number, y: number, at: number) => {
			now = at;
			return taps(id, x, y);
		},
	};
}

describe("the tap counter", () => {
	test("a second tap within 350 ms and 10 px opens the first tap's Card, whichever Card is under the hand by then", () => {
		const { tap } = counter();
		expect(tap("back", 100, 20, 0)).toBeNull();
		expect(tap("middle", 104, 26, 300)).toBe("back");
	});

	test("too late or too far, it is a tap of its own", () => {
		const late = counter();
		expect(late.tap("a", 0, 0, 0)).toBeNull();
		expect(late.tap("a", 0, 0, 351)).toBeNull();
		const far = counter();
		expect(far.tap("a", 0, 0, 0)).toBeNull();
		expect(far.tap("a", 11, 0, 100)).toBeNull();
	});

	test("a double-tap is spent: a third tap starts over", () => {
		const { tap } = counter();
		tap("a", 0, 0, 0);
		expect(tap("a", 0, 0, 100)).toBe("a");
		expect(tap("a", 0, 0, 200)).toBeNull();
	});
});
