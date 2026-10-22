import { expect, test } from "bun:test";
import { argmax, argmaxBesideNone } from "../../../src/segment/de/partition.js";

test("argmax takes the largest share, ties to the first key", () => {
	expect(argmax({ p1: 0.2, p2: 0.4, p3: 0.4 })).toEqual({
		key: "p2",
		share: 0.4,
	});
});

test("an empty distribution has no argmax", () => {
	expect(argmax({})).toBeUndefined();
});

test("argmaxBesideNone skips none, and has no winner when only none answers", () => {
	expect(argmaxBesideNone({ none: 0.7, p3: 0.3 })).toEqual({
		key: "p3",
		share: 0.3,
	});
	expect(argmaxBesideNone({ none: 1 })).toBeUndefined();
});
