import { expect, test } from "bun:test";
import { germanFusions } from "dumcorpus/inventories";
import { germanFusionOneLiner } from "../convex/model/presentedDumling";

const im = {
	spelling: "im",
	components: [
		{ span: "i", surface: "in" },
		{ span: "m", surface: "dem" },
	],
};

const reviewedIm = germanFusions.find(({ form }) => form === "im")?.oneLiner;

test("a closed fusion shows dumcorpus's reviewed one-liner", () => {
	expect(reviewedIm).toContain("Dativ");
	expect(germanFusionOneLiner(im)).toBe(reviewedIm ?? "");
});

test("a sentence-initial closed fusion finds its entry case-folded", () => {
	expect(
		germanFusionOneLiner({
			spelling: "Im",
			components: [
				{ span: "I", surface: "in" },
				{ span: "m", surface: "dem" },
			],
		}),
	).toBe(reviewedIm ?? "");
});

test("a clitic fusion keeps the line naming this Sentence's reading", () => {
	expect(
		germanFusionOneLiner({
			spelling: "geht's",
			components: [
				{ span: "geht", surface: "geht" },
				{ span: "'s", surface: "es" },
			],
		}),
	).toBe("„geht's“ ist „geht es“.");
});

test("a fusion whose components differ from the entry keeps the built line", () => {
	expect(
		germanFusionOneLiner({
			spelling: "im",
			components: [
				{ span: "i", surface: "in" },
				{ span: "m", surface: "einem" },
			],
		}),
	).toBe("„im“ ist „in einem“.");
});

test("every closed fusion entry is found by its own form and components", () => {
	for (const entry of germanFusions)
		expect(
			germanFusionOneLiner({
				spelling: entry.form,
				components: entry.components.map(({ span, surface }) => ({
					span,
					surface,
				})),
			}),
		).toBe(entry.oneLiner);
});
