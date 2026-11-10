import { describe, expect, test } from "bun:test";
import { type DeckSteps, deckPlan } from "./deck-plan";
import { DEFAULT_FEEL } from "./knobs";
import { PRESETS, sessionTimeline } from "./session";

const MOTION = { landMs: 300, turnMs: 300 };
const ALONE: DeckSteps = {
	attestationAtClick: false,
	attestation: false,
	surface: false,
	lemma: false,
};
const ALL_FOUR: DeckSteps = {
	attestationAtClick: true,
	attestation: true,
	surface: true,
	lemma: true,
};

function plan(
	preset: keyof typeof PRESETS,
	steps: DeckSteps = ALONE,
	feel: Partial<typeof DEFAULT_FEEL> = {},
) {
	return deckPlan({
		timeline: sessionTimeline(PRESETS[preset]),
		steps,
		feel: { ...DEFAULT_FEEL, ...feel },
		motion: MOTION,
	});
}

describe("when the Deck is dealt", () => {
	test("a slow answer deals the front Card face down as the threshold passes, and turns it up when its Knowledge lands", () => {
		const states = plan("typical");
		expect(states[0]).toEqual({
			at: 300,
			phase: "Started",
			cards: ["Reading"],
			faceUp: false,
		});
		expect(states.find(({ faceUp }) => faceUp)).toMatchObject({
			at: 1400,
			phase: "Knowledge",
		});
	});

	test("an answer inside the threshold deals the Deck face up, with no turn", () => {
		const fast = plan("fast");
		expect(fast[0]).toMatchObject({ at: 220, faceUp: true });
		expect(fast.every(({ faceUp }) => faceUp)).toBe(true);
		const stored = plan("stored", ALL_FOUR);
		expect(stored).toEqual([
			{
				at: 60,
				phase: "Stored",
				cards: ["Attestation", "Surface", "Lemma", "Reading"],
				faceUp: true,
			},
		]);
	});

	test("the knob's other values deal at the click and as the selection returns", () => {
		expect(plan("typical", ALONE, { dealWhen: "click" })[0]).toMatchObject({
			at: 0,
			phase: "Clicked",
			faceUp: false,
		});
		expect(
			plan("typical", ALONE, { dealWhen: "selection" })[0],
		).toMatchObject({ at: 120, phase: "Selected", faceUp: false });
	});

	test("a Card never turns before its deal has landed", () => {
		const states = plan("typical", ALONE, { thresholdMs: 1300 });
		expect(states[0]).toMatchObject({ at: 1300, faceUp: false });
		expect(states.find(({ faceUp }) => faceUp)?.at).toBe(1600);
	});
});

describe("which Cards the Deck holds", () => {
	test("an Attestation known at the click is dealt with the front Card; the Surface and Lemma join at commit, once the turn has landed", () => {
		const states = plan("typical", ALL_FOUR);
		expect(states[0]?.cards).toEqual(["Attestation", "Reading"]);
		const full = states.find(({ cards }) => cards.length === 4);
		expect(full?.at).toBe(1700);
		expect(states.at(-1)?.cards).toEqual([
			"Attestation",
			"Surface",
			"Lemma",
			"Reading",
		]);
	});

	test("a front Card that turns up at commit turns with the Cards that join then", () => {
		const states = plan("typical", ALL_FOUR, { turnUp: "commit" });
		expect(states.find(({ faceUp }) => faceUp)).toEqual({
			at: 1500,
			phase: "Committed",
			cards: ["Attestation", "Surface", "Lemma", "Reading"],
			faceUp: true,
		});
	});

	test("an Attestation Grammar finds joins when Grammar lands", () => {
		const states = plan("typical", { ...ALONE, attestation: true });
		expect(states[0]?.cards).toEqual(["Reading"]);
		expect(
			states.find(({ cards }) => cards.includes("Attestation")),
		).toMatchObject({ at: 600, phase: "Grammar" });
	});

	test("the Surface can join with Grammar instead", () => {
		const states = plan(
			"typical",
			{ ...ALONE, surface: true },
			{ surfaceWhen: "grammar" },
		);
		expect(states.find(({ cards }) => cards.includes("Surface"))?.at).toBe(
			600,
		);
	});

	test("the Deck only grows, whatever the preset and the knobs", () => {
		for (const preset of Object.keys(PRESETS) as (keyof typeof PRESETS)[])
			for (const dealWhen of ["threshold", "click", "selection"] as const)
				for (const surfaceWhen of ["commit", "grammar"] as const) {
					const states = plan(preset, ALL_FOUR, {
						dealWhen,
						surfaceWhen,
					});
					for (const [index, state] of states.entries()) {
						const before = states[index - 1];
						if (!before) continue;
						expect(state.at).toBeGreaterThan(before.at);
						expect(
							before.cards.every((role) =>
								state.cards.includes(role),
							),
						).toBe(true);
						expect(before.faceUp && !state.faceUp).toBe(false);
					}
					expect(states[0]?.cards).toContain("Reading");
				}
	});
});

describe("a failed Session", () => {
	test("leaves the front Card face down, or turns it up to show the failure", () => {
		const back = plan("failure", { ...ALONE, attestationAtClick: true });
		expect(back.at(-1)).toEqual({
			at: 1500,
			phase: "Failed",
			cards: ["Attestation", "Reading"],
			faceUp: false,
		});
		const face = plan("failure", ALONE, { failure: "face" });
		expect(face.at(-1)).toMatchObject({ phase: "Failed", faceUp: true });
	});

	test("deals no Card that only a commit would", () => {
		const states = plan("failure", ALL_FOUR);
		expect(states.at(-1)?.cards).toEqual(["Attestation", "Reading"]);
	});
});
