import { describe, expect, test } from "bun:test";

import { actuateSourceContextFocus } from "../src/lib/source-context-focus";

describe("Source Context focus", () => {
	test("centers the Sentence", () => {
		const scrollCalls: unknown[] = [];
		actuateSourceContextFocus({
			scrollIntoView(options) {
				scrollCalls.push(options);
			},
		});
		expect(scrollCalls).toEqual([{ block: "center", behavior: "auto" }]);
	});
});
