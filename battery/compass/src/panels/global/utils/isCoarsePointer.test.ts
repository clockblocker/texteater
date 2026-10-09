import { afterEach, describe, expect, test } from "bun:test";
import { stubCoarsePointer } from "../test/fakeSplit";
import { isCoarsePointer, resetCoarsePointerCache } from "./isCoarsePointer";

afterEach(() => {
	resetCoarsePointerCache();
});

describe("isCoarsePointer", () => {
	test('answers matchMedia("(pointer:coarse)")', () => {
		const stub = stubCoarsePointer(true);
		try {
			expect(isCoarsePointer()).toBe(true);
			expect(stub.queries).toEqual(["(pointer:coarse)"]);
		} finally {
			stub.restore();
		}
	});

	test("asks matchMedia once and caches the answer", () => {
		const stub = stubCoarsePointer(false);
		try {
			expect(isCoarsePointer()).toBe(false);
			expect(isCoarsePointer()).toBe(false);
			expect(stub.queries).toEqual(["(pointer:coarse)"]);
		} finally {
			stub.restore();
		}
	});

	test("is false without matchMedia", () => {
		expect(typeof globalThis.matchMedia).toBe("undefined");
		resetCoarsePointerCache();
		expect(isCoarsePointer()).toBe(false);
	});
});
