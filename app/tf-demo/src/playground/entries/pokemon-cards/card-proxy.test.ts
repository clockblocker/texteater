import { describe, expect, test } from "bun:test";
import { proxyCard } from "./card-proxy";
import { SECTIONS, SHOWCASE } from "./sections";

/* Expected values come from upstream's CardProxy.svelte script, run on the
   same cards at acb1197. */
const byId = (id: string) => {
	const card = [
		SHOWCASE,
		...SECTIONS.flatMap((section) => section.cards),
	].find((each) => each.id === id);
	if (!card) throw new Error(`no card ${id}`);
	return proxyCard(card);
};
const cdn = (set: string, number: string, foil: string) => ({
	foil: `https://poke-holo.b-cdn.net/foils/${set}/foils/upscaled/${number}_foil_${foil}_2x.webp`,
	mask: `https://poke-holo.b-cdn.net/foils/${set}/masks/upscaled/${number}_foil_${foil}_2x.webp`,
});

describe("proxyCard", () => {
	test("a basic card has no foil, mask or rarity", () => {
		const card = byId("sm10-33");
		expect(card).toMatchObject({
			img: "https://images.pokemontcg.io/sm10/33_hires.png",
			foil: "",
			mask: "",
		});
		expect(card.rarity).toBeUndefined();
	});

	test.each([
		[
			"swsh12pt5-160",
			"Rare Secret",
			cdn("swsh12pt5", "160", "etched_swsecret"),
		],
		[
			"swsh12-127",
			"Common Reverse Holo",
			cdn("swsh12", "127", "holo_reverse"),
		],
		[
			"swshp-SWSH012",
			"Rare Holo Cosmos",
			cdn("swshp", "012", "holo_cosmos"),
		],
		[
			"swsh11tg-TG03",
			"trainer gallery rare holo",
			cdn("swsh11", "tg03", "holo_rainbow"),
		],
		[
			"swsh45sv-SV107",
			"Rare Shiny VMAX",
			cdn("swsh45", "sv107", "etched_swsecret"),
		],
		[
			"swsh7-215",
			"Rare Rainbow Alt",
			cdn("swsh7", "215", "etched_swsecret"),
		],
	])("%s is %s with its foil and mask", (id, rarity, urls) => {
		expect(byId(id)).toMatchObject({ rarity, ...urls });
	});

	test("18 sections deal 87 cards; the header holds the 88th", () => {
		expect(SECTIONS).toHaveLength(18);
		expect(SECTIONS.flatMap((section) => section.cards)).toHaveLength(87);
	});
});
