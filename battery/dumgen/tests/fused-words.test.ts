import { expect, test } from "bun:test";
import {
	germanFusionOneLiner,
	isGermanFusedWord,
	splitGermanFusedWords,
} from "../src/authored.js";

test("a stored German Sentence holds the pieces of each fused word", () => {
	expect(
		splitGermanFusedWords([
			{ kind: "ResolvableText", text: "Im" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Wald" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "'ne" },
		]),
	).toEqual([
		{ kind: "ResolvableText", text: "I", surface: "in" },
		{ kind: "ResolvableText", text: "m", surface: "dem" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "Wald" },
		{ kind: "Whitespace", text: " " },
		{ kind: "ResolvableText", text: "'ne" },
	]);
	expect(isGermanFusedWord("aufs")).toBe(true);
	expect(isGermanFusedWord("auf")).toBe(false);
});

test("a Fusion value finds its authored one-liner", () => {
	expect(
		germanFusionOneLiner({
			spelling: "im",
			components: [{ span: "i" }, { span: "m" }],
		}),
	).toContain("„im“ ist „in dem“");
	expect(
		germanFusionOneLiner({
			spelling: "geht's",
			components: [{ span: "geht" }, { span: "'s" }],
		}),
	).toBeString();
	expect(
		germanFusionOneLiner({
			spelling: "xy",
			components: [{ span: "x" }, { span: "y" }],
		}),
	).toBeUndefined();
});
