import { describe, expect, it } from "bun:test";

import { panels, verb } from "./support.js";

type Core = Parameters<typeof verb>[1];

/** A weak verb's table from its licensed Präteritum, the form its class is derived from. */
const weakly = (infinitive: string, preterite: string, core: Core = {}) =>
	panels(verb(infinitive, core), { preterite: [preterite] });

/** Every panel of the 5 weak vault verbs (filler-de#62). */
describe("the dev vault's weak verbs", () => {
	it("aufpassen places its particle", () => {
		const past =
			"ich passte auf, du passtest auf, er passte auf, wir passten auf, ihr passtet auf, sie passten auf";
		expect(
			weakly("aufpassen", "passte auf", { hasSepPrefix: "auf" }),
		).toEqual({
			Imperativ: "pass auf, passt auf",
			"Konjunktiv II": past,
			"Partizip II": "aufgepasst",
			Präsens:
				"ich passe auf, du passt auf, er passt auf, wir passen auf, ihr passt auf, sie passen auf",
			Präteritum: past,
		});
	});

	it("passen", () => {
		const past =
			"ich passte, du passtest, er passte, wir passten, ihr passtet, sie passten";
		expect(weakly("passen", "passte")).toEqual({
			Imperativ: "pass, passt",
			"Konjunktiv II": past,
			"Partizip II": "gepasst",
			Präsens:
				"ich passe, du passt, er passt, wir passen, ihr passt, sie passen",
			Präteritum: past,
		});
	});

	it("ignorieren takes no ge-", () => {
		const past =
			"ich ignorierte, du ignoriertest, er ignorierte, wir ignorierten, ihr ignoriertet, sie ignorierten";
		expect(weakly("ignorieren", "ignorierte")).toEqual({
			Imperativ: "ignorier, ignoriert",
			"Konjunktiv II": past,
			"Partizip II": "ignoriert",
			Präsens:
				"ich ignoriere, du ignorierst, er ignoriert, wir ignorieren, ihr ignoriert, sie ignorieren",
			Präteritum: past,
		});
	});

	it("vernachlässigen keeps its inseparable prefix", () => {
		const past =
			"ich vernachlässigte, du vernachlässigtest, er vernachlässigte, wir vernachlässigten, ihr vernachlässigtet, sie vernachlässigten";
		expect(weakly("vernachlässigen", "vernachlässigte")).toEqual({
			Imperativ: "vernachlässige, vernachlässigt",
			"Konjunktiv II": past,
			"Partizip II": "vernachlässigt",
			Präsens:
				"ich vernachlässige, du vernachlässigst, er vernachlässigt, wir vernachlässigen, ihr vernachlässigt, sie vernachlässigen",
			Präteritum: past,
		});
	});

	// The 🪞 Reading's reflexive fills its Reflexive Slot, never a form, so
	// the table is bare (ADR 0052).
	it("hüten shows bare forms and links its t-stem with e", () => {
		const past =
			"ich hütete, du hütetest, er hütete, wir hüteten, ihr hütetet, sie hüteten";
		expect(weakly("hüten", "hütete")).toEqual({
			Imperativ: "hüte, hütet",
			"Konjunktiv II": past,
			"Partizip II": "gehütet",
			Präsens:
				"ich hüte, du hütest, er hütet, wir hüten, ihr hütet, sie hüten",
			Präteritum: past,
		});
	});
});

/** The 3 strong vault verbs (filler-de#62), before dumgen stored their Präteritum. */
describe("verbs with no Präteritum", () => {
	it("fahren gets only its regular Präsens cells", () => {
		expect(panels(verb("fahren"))).toEqual({
			Präsens: "ich fahre, wir fahren, ihr fahrt, sie fahren",
		});
	});

	it("unterschreiben", () => {
		expect(panels(verb("unterschreiben")).Präsens).toBe(
			"ich unterschreibe, wir unterschreiben, ihr unterschreibt, sie unterschreiben",
		);
	});

	it("achtgeben places its particle", () => {
		expect(
			panels(verb("achtgeben", { hasSepPrefix: "acht" })).Präsens,
		).toBe("ich gebe acht, wir geben acht, ihr gebt acht, sie geben acht");
	});

	it("wissen drops ich, whose regular form it lacks", () => {
		expect(panels(verb("wissen")).Präsens).toBe(
			"wir wissen, ihr wisst, sie wissen",
		);
	});
});

describe("verbs with a licensed Präteritum (texteater#1215)", () => {
	it("fahren gets its Präteritum from the variant", () => {
		expect(panels(verb("fahren"), { preterite: ["fuhr"] })).toEqual({
			Präsens: "ich fahre, wir fahren, ihr fahrt, sie fahren",
			Präteritum:
				"ich fuhr, du fuhrst, er fuhr, wir fuhren, ihr fuhrt, sie fuhren",
		});
	});

	it("unterschreiben", () => {
		expect(
			panels(verb("unterschreiben"), { preterite: ["unterschrieb"] })
				.Präteritum,
		).toBe(
			"ich unterschrieb, du unterschriebst, er unterschrieb, wir unterschrieben, ihr unterschriebt, sie unterschrieben",
		);
	});

	it("achtgeben and aufstehen keep their particle", () => {
		expect(
			panels(verb("achtgeben", { hasSepPrefix: "acht" }), {
				preterite: ["gab acht"],
			}).Präteritum,
		).toBe(
			"ich gab acht, du gabst acht, er gab acht, wir gaben acht, ihr gabt acht, sie gaben acht",
		);
		expect(
			panels(verb("aufstehen", { hasSepPrefix: "auf" }), {
				preterite: ["stand auf"],
			}).Präteritum,
		).toBe(
			"ich stand auf, du standest auf, er stand auf, wir standen auf, ihr standet auf, sie standen auf",
		);
	});

	it("a strong verb gets no Partizip II, Konjunktiv II or Imperativ", () => {
		const table = panels(verb("lesen"), { preterite: ["las"] });
		expect(Object.keys(table)).toEqual(["Präsens", "Präteritum"]);
		expect(table.Präteritum).toBe(
			"ich las, du lasest, er las, wir lasen, ihr last, sie lasen",
		);
	});

	it("a mixed verb gets its Partizip II from the -te form", () => {
		expect(panels(verb("bringen"), { preterite: ["brachte"] })).toEqual({
			"Partizip II": "gebracht",
			Präsens: "ich bringe, wir bringen, ihr bringt, sie bringen",
			Präteritum:
				"ich brachte, du brachtest, er brachte, wir brachten, ihr brachtet, sie brachten",
		});
		expect(
			panels(verb("mitbringen", { hasSepPrefix: "mit" }), {
				preterite: ["brachte mit"],
			})["Partizip II"],
		).toBe("mitgebracht");
	});

	it("a Free preterite puts each variant's form in every cell, and its Weak one in the Konjunktiv II", () => {
		expect(
			panels(verb("senden"), { preterite: ["sandte", "sendete"] }),
		).toEqual({
			"Konjunktiv II":
				"ich sendete, du sendetest, er sendete, wir sendeten, ihr sendetet, sie sendeten",
			"Partizip II": "gesandt, gesendet",
			Präsens: "ich sende, wir senden, ihr sendet, sie senden",
			Präteritum:
				"ich sandte, ich sendete, du sandtest, du sendetest, er sandte, er sendete, wir sandten, wir sendeten, ihr sandtet, ihr sendetet, sie sandten, sie sendeten",
		});
	});

	it("a weak verb prefers its licensed Präteritum", () => {
		expect(
			panels(verb("abholen", { hasSepPrefix: "ab" }), {
				preterite: ["holte ab"],
			})["Partizip II"],
		).toBe("abgeholt");
	});

	it("leaves out a variant whose particle is not the verb's", () => {
		const aufstehen = verb("aufstehen", { hasSepPrefix: "auf" });
		expect(
			panels(aufstehen, { preterite: ["stand", "stand auf"] }).Präteritum,
		).toBe(
			"ich stand auf, du standest auf, er stand auf, wir standen auf, ihr standet auf, sie standen auf",
		);
		expect(panels(aufstehen, { preterite: ["stand"] })).toEqual({
			Präsens:
				"ich stehe auf, wir stehen auf, ihr steht auf, sie stehen auf",
		});
	});

	it("leaves out the participle of a weak past with a strong participle", () => {
		expect(
			panels(verb("backen"), { preterite: ["backte"] })["Partizip II"],
		).toBeUndefined();
	});
});
