import { describe, expect, test } from "bun:test";
import {
	busy,
	DEALT,
	dealWord,
	forget,
	initialScene,
	landWord,
	moveCard,
	openCard,
	placesOf,
	redeal,
	slotsOf,
	throwAway,
	turnAll,
	turnCard,
	uncover,
	withDeck,
} from "./scene";
import { WORDS_TO_DEAL } from "./words";

describe("the scene", () => {
	test("deals every Note Card onto the Ground's Deck, each on a Slot", () => {
		const scene = initialScene();
		const slots = new Set(
			Object.values(slotsOf(scene)).flatMap((list) =>
				list.map((slot) => slot.id),
			),
		);
		const places = placesOf(scene);
		expect(DEALT.length).toBeGreaterThanOrEqual(6);
		expect(DEALT.length).toBeLessThanOrEqual(8);
		for (const id of DEALT)
			expect(slots.has(places.get(id)?.slot ?? "")).toBe(true);
	});

	test("opens a Card as its Region's Cover and keeps its rank in the Deck", () => {
		const scene = openCard(initialScene(), "lesen");
		expect(placesOf(scene).get("lesen")).toMatchObject({
			slot: "ground:cover",
			form: "cover",
		});
		expect(
			slotsOf(scene).ground.some((slot) => slot.id === "ground:lesen"),
		).toBe(true);
		expect(placesOf(uncover(scene, "lesen")).get("lesen")?.slot).toBe(
			"ground:lesen",
		);
	});

	test("moves a Card across to the Pane, on top of what is there", () => {
		const scene = moveCard(
			moveCard(initialScene(), "haus", "pane"),
			"abend",
			"pane",
		);
		expect(scene.cards.pane).toEqual(["haus", "abend"]);
		expect(placesOf(scene).get("abend")).toMatchObject({
			slot: "pane:abend",
			z: 2,
		});
	});

	test("keeps a thrown Card's Place until it is forgotten", () => {
		const scene = initialScene();
		const from = placesOf(scene).get("gehen");
		if (!from) throw new Error("no Place");
		const thrown = throwAway(scene, "gehen", from);
		expect(thrown.cards.ground).not.toContain("gehen");
		expect(placesOf(thrown).get("gehen")).toEqual(from);
		expect(placesOf(forget(thrown, "gehen")).has("gehen")).toBe(false);
	});

	test("fans the Deck: the outermost Cards turned furthest", () => {
		const scene = withDeck(initialScene(), DEALT, "fan");
		const places = placesOf(scene);
		expect(places.get(DEALT[0] as string)?.rotate).toBe(-130);
		expect(places.get(DEALT.at(-1) as string)?.rotate).toBe(130);
	});

	test("turns every Card face down, then face up again", () => {
		const down = turnAll(initialScene());
		expect(placesOf(down).get("gehen")?.side).toBe("back");
		expect(placesOf(turnAll(down)).get("gehen")?.side).toBe("front");
	});

	test("deals a word face down and busy, and its Knowledge turns it face up", () => {
		const [lief] = WORDS_TO_DEAL;
		if (!lief) throw new Error("no word to deal");
		const dealt = dealWord(initialScene(), "laufen", lief, false);
		expect(dealt.cards.pane).toEqual(["laufen"]);
		expect(placesOf(dealt).get("laufen")).toMatchObject({
			slot: "pane:laufen",
			side: "back",
		});
		expect(busy(dealt, "laufen")).toBe(true);
		// a busy Card waits for its Knowledge to turn it
		expect(turnCard(dealt, "laufen")).toBe(dealt);
		expect(placesOf(turnAll(dealt)).get("laufen")?.side).toBe("back");
		const landed = landWord(dealt, "laufen");
		expect(busy(landed, "laufen")).toBe(false);
		expect(placesOf(landed).get("laufen")?.side).toBe("front");
	});

	test("keeps dealt words in the Pane through a redeal, and drops them once forgotten", () => {
		const [lief] = WORDS_TO_DEAL;
		if (!lief) throw new Error("no word to deal");
		const dealt = dealWord(initialScene(), "laufen", lief, true);
		expect(redeal(dealt).cards).toEqual({
			ground: DEALT,
			pane: ["laufen"],
		});
		const from = placesOf(dealt).get("laufen");
		if (!from) throw new Error("no Place");
		const gone = forget(throwAway(dealt, "laufen", from), "laufen");
		expect(gone.words).toEqual({});
	});
});
