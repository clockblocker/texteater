import { expect, test } from "bun:test";
import { messageOf } from "../src/index.js";

test("messageOf reads an Error's own message", () => {
	expect(messageOf(new TypeError("bad input"))).toBe("bad input");
});

test("messageOf writes any other thrown value as a string", () => {
	expect(messageOf("plain text")).toBe("plain text");
	expect(messageOf(404)).toBe("404");
	expect(messageOf(undefined)).toBe("undefined");
	expect(messageOf({ toString: () => "custom" })).toBe("custom");
});
