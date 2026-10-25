import { expect, test } from "bun:test";
import type { ReflexiveSlot } from "../shared/reflexive-slot";
import { germanCitation } from "../src/notes/de/citation";
import { citationText } from "../src/notes/universal/blocks/citation";

const reflexive = (
	governedCase: "Acc" | "Dat",
	preposition: string | null = null,
	status: ReflexiveSlot["status"] = "Required",
): ReflexiveSlot => ({ status, governedCase, preposition });

const cite = (
	canonicalForm: string,
	slot: ReflexiveSlot | null,
	emojiDescription?: string,
) =>
	citationText(
		germanCitation({
			lemma: { canonicalForm },
			reflexive: slot,
			...(emojiDescription === undefined ? {} : { emojiDescription }),
		}),
	);

test("a reflexive goes first, or right after a leading es", () => {
	expect(cite("erinnern", reflexive("Acc"))).toBe("sich erinnern");
	expect(cite("Sorgen machen", reflexive("Dat"))).toBe("sich Sorgen machen");
	expect(cite("es gemütlich machen", reflexive("Dat"))).toBe(
		"es sich gemütlich machen",
	);
});

test("a reflexive in a fixed phrase goes right after its preposition", () => {
	expect(cite("außer sein", reflexive("Dat", "außer"))).toBe(
		"außer sich sein",
	);
	expect(cite("zu kommen", reflexive("Dat", "zu"))).toBe("zu sich kommen");
	expect(cite("es in haben", reflexive("Dat", "in"))).toBe(
		"es in sich haben",
	);
});

test("a preposition the wording lacks falls back to the first place", () => {
	expect(cite("gemütlich machen", reflexive("Dat", "in"))).toBe(
		"sich gemütlich machen",
	);
});

test("an Optional Reflexive Slot is parenthesised", () => {
	expect(cite("ausruhen", reflexive("Acc", null, "Optional"))).toBe(
		"(sich) ausruhen",
	);
});

test("a Reading without a reflexive cites its bare Canonical Form", () => {
	expect(cite("erinnern", null, "💭")).toBe("erinnern");
	expect(cite("es eilig haben", null)).toBe("es eilig haben");
});

test("before Knowledge gives a frame, the 🪞 marker stands for the Slot", () => {
	expect(cite("schämen", null, "🪞😳")).toBe("sich schämen");
	expect(cite("Sorgen machen", null, "🪞😟")).toBe("sich Sorgen machen");
});

test("the reflexive is its own part, so a heading can style it", () => {
	expect(
		germanCitation({
			lemma: { canonicalForm: "es gemütlich machen" },
			reflexive: reflexive("Dat"),
		}),
	).toEqual([
		{ kind: "Words", text: "es" },
		{ kind: "Reflexive", text: "sich", optional: false },
		{ kind: "Words", text: "gemütlich machen" },
	]);
});
