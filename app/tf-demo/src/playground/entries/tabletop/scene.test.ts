import { describe, expect, test } from "bun:test";
import {
	DEALT,
	forget,
	initialScene,
	moveCard,
	openCard,
	placesOf,
	slotsOf,
	throwAway,
	turnAll,
	uncover,
	withDeck,
} from "./scene";

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
});
