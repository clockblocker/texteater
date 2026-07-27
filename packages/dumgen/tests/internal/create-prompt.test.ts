import { describe, expect, test } from "bun:test";

import { createPrompt } from "../../src/index";

describe("createPrompt", () => {
	test("wraps content in a prompt object", () => {
		expect(createPrompt("hello")).toEqual({
			kind: "prompt",
			content: "hello",
		});
	});
});
