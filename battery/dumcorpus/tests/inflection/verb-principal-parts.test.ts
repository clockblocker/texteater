import { describe, expect, it } from "bun:test";
import type * as Dumling from "dumling/types";

import {
	cellsOf,
	pack,
	panels,
	type Reflexive,
	selectionOf,
	verb,
} from "./support.js";

type Core = Parameters<typeof verb>[1];
const weakly = (
	infinitive: string,
	preterite: string,
	core: Core = {},
	reflexive?: Reflexive,
) => panels(verb(infinitive, core), { preterite: [preterite] }, reflexive);

/**
 * The principal parts texteater#1218 stores, now Paradigm Variants, as
 * dumcorpus's gold holds them (der Zug fährt gleich ab, der Elefant
 * trompetete, der Kellner bringt eine Cola).
 */
describe("verbs with licensed principal parts", () => {
	const fahren = {
		pastParticiple: ["gefahren"],
		present1: ["fahre"],
		present2: ["fährst"],
		present3: ["fährt"],
		preterite: ["fuhr"],
		subjunctivePast: ["führe"],
	};

	it("fahren gets every core panel", () => {
		expect(panels(verb("fahren"), fahren)).toEqual({
			"Konjunktiv II":
				"ich führe, du führest, er führe, wir führen, ihr führet, sie führen",
			"Partizip II": "gefahren",
			Präsens:
				"ich fahre, du fährst, er fährt, wir fahren, ihr fahrt, sie fahren",
			Präteritum:
				"ich fuhr, du fuhrst, er fuhr, wir fuhren, ihr fuhrt, sie fuhren",
		});
	});

	it("tags each form with its provenance and variant", () => {
		const lemma = verb("fahren");
		const schema = pack.schemaFor(lemma) as Dumling.TableSchema;
		const table = pack.derive({
			lemma,
			schema,
			selection: selectionOf(lemma, fahren),
			readings: [],
		});
		const at = (bundle: Record<string, string>) =>
			Object.entries(table).find(
				([key]) =>
					Object.entries(bundle).every(([name, value]) =>
						key.split("|").includes(`${name}=${value}`),
					) && key.split("|").length === Object.keys(bundle).length,
			)?.[1];
		const past = {
			verbForm: "Fin",
			mood: "Ind",
			tense: "Past",
			number: "Sing",
		};
		expect(at({ ...past, person: "3" })).toEqual([
			{
				form: { kind: "Verb", pronoun: "er", finite: "fuhr" },
				provenance: "Variant",
				variant: { dimension: "preterite", id: "fuhr" },
			},
		]);
		expect(at({ ...past, person: "2" })).toEqual([
			{
				form: { kind: "Verb", pronoun: "du", finite: "fuhrst" },
				provenance: "Rule",
				variant: { dimension: "preterite", id: "fuhr" },
			},
		]);
		expect(
			at({
				verbForm: "Fin",
				mood: "Ind",
				tense: "Pres",
				person: "1",
				number: "Plur",
			}),
		).toEqual([
			{
				form: { kind: "Verb", pronoun: "wir", finite: "fahren" },
				provenance: "Rule",
			},
		]);
	});

	it("abfahren places its particle in the finite forms only, after a Gap", () => {
		const table = panels(verb("abfahren", { hasSepPrefix: "ab" }), {
			pastParticiple: ["abgefahren"],
			present1: ["fahre ab"],
			present2: ["fährst ab"],
			present3: ["fährt ab"],
			preterite: ["fuhr ab"],
			subjunctivePast: ["führe ab"],
		});
		expect(table).toEqual({
			"Konjunktiv II":
				"ich führe ab, du führest ab, er führe ab, wir führen ab, ihr führet ab, sie führen ab",
			"Partizip II": "abgefahren",
			Präsens:
				"ich fahre ab, du fährst ab, er fährt ab, wir fahren ab, ihr fahrt ab, sie fahren ab",
			Präteritum:
				"ich fuhr ab, du fuhrst ab, er fuhr ab, wir fuhren ab, ihr fuhrt ab, sie fuhren ab",
		});
		const er = cellsOf(verb("abfahren", { hasSepPrefix: "ab" }), {
			present3: ["fährt ab"],
		});
		expect(
			er.find(({ forms }) => forms.includes("er fährt ab")),
		).toBeDefined();
		expect(
			pack.display({
				kind: "Verb",
				pronoun: "er",
				finite: "fährt",
				particle: "ab",
			}),
		).toEqual([
			{ text: "er ", role: "Context" },
			{ text: "fährt", role: "Form" },
			{ text: " … ", role: "Gap" },
			{ text: "ab", role: "Form" },
		]);
	});

	it("bringen gets its umlauted Konjunktiv II from the variant", () => {
		expect(
			panels(verb("bringen"), {
				pastParticiple: ["gebracht"],
				present1: ["bringe"],
				present2: ["bringst"],
				present3: ["bringt"],
				preterite: ["brachte"],
				subjunctivePast: ["brächte"],
			})["Konjunktiv II"],
		).toBe(
			"ich brächte, du brächtest, er brächte, wir brächten, ihr brächtet, sie brächten",
		);
	});

	it("trompeten gets the Partizip II no rule could give it", () => {
		expect(
			panels(verb("trompeten"), {
				pastParticiple: ["trompetet"],
				preterite: ["trompetete"],
			})["Partizip II"],
		).toBe("trompetet");
	});

	it("each licensed dimension fills only its own cells", () => {
		expect(
			panels(verb("fahren"), { pastParticiple: ["gefahren"] }),
		).toEqual({
			"Partizip II": "gefahren",
			Präsens: "ich fahre, wir fahren, ihr fahrt, sie fahren",
		});
	});

	it("licensed forms win over a weak verb's rules", () => {
		const table = panels(verb("senden"), {
			preterite: ["sendete"],
			pastParticiple: ["gesendet"],
			subjunctivePast: ["sendete"],
		});
		expect(table["Partizip II"]).toBe("gesendet");
		expect(table["Konjunktiv II"]).toBe(
			"ich sendete, du sendetest, er sendete, wir sendeten, ihr sendetet, sie sendeten",
		);
	});

	it("lists each licensed alternative in its cell", () => {
		expect(
			panels(verb("backen"), {
				pastParticiple: ["gebacken"],
				present1: ["backe"],
				present2: ["backst", "bäckst"],
				present3: ["backt", "bäckt"],
				preterite: ["backte"],
			}),
		).toMatchObject({
			"Partizip II": "gebacken",
			Präsens:
				"ich backe, du backst, du bäckst, er backt, er bäckt, wir backen, ihr backt, sie backen",
		});
	});

	it("leaves out a variant that does not fit the verb, and never fills its dimension from rules", () => {
		expect(
			panels(verb("abfahren", { hasSepPrefix: "ab" }), {
				// No particle in the participle, the wrong one in a Präsens form.
				pastParticiple: ["gefahren"],
				present1: ["fahre ab"],
				present2: ["fährst an"],
				present3: ["fährt ab"],
				// A Konjunktiv II form ends in -e.
				subjunctivePast: ["führ ab"],
			}),
		).toEqual({
			Präsens:
				"ich fahre ab, er fährt ab, wir fahren ab, ihr fahrt ab, sie fahren ab",
		});
	});

	it("places the Reflexive Slot's reflexive in the licensed finite forms", () => {
		expect(
			panels(
				verb("erinnern"),
				{
					pastParticiple: ["erinnert"],
					present1: ["erinnere"],
					present2: ["erinnerst"],
					present3: ["erinnert"],
					subjunctivePast: ["erinnerte"],
				},
				"Acc",
			),
		).toMatchObject({
			"Konjunktiv II":
				"ich erinnerte mich, du erinnertest dich, er erinnerte sich, wir erinnerten uns, ihr erinnertet euch, sie erinnerten sich",
			"Partizip II": "erinnert",
			Präsens:
				"ich erinnere mich, du erinnerst dich, er erinnert sich, wir erinnern uns, ihr erinnert euch, sie erinnern sich",
		});
	});
});

describe("forms left out rather than guessed", () => {
	it("a be- verb whose stem opens with i or u gets no participle", () => {
		expect(
			weakly("beurteilen", "beurteilte")["Partizip II"],
		).toBeUndefined();
		expect(weakly("beugen", "beugte")["Partizip II"]).toBeUndefined();
	});

	it("-ieren takes no ge- only after a stem vowel", () => {
		expect(weakly("schmieren", "schmierte")["Partizip II"]).toBe(
			"geschmiert",
		);
		expect(
			weakly("abschmieren", "schmierte ab", { hasSepPrefix: "ab" })[
				"Partizip II"
			],
		).toBe("abgeschmiert");
		expect(weakly("studieren", "studierte")["Partizip II"]).toBe(
			"studiert",
		);
	});

	it("trompeten, whose first syllable is unstressed, gets no Partizip II from rules", () => {
		const table = weakly("trompeten", "trompetete");
		expect(table["Partizip II"]).toBeUndefined();
		expect(table.Imperativ).toBe("trompete, trompetet");
	});

	it("any root longer than a syllable gets no Partizip II, its stress unknown", () => {
		// posaunt, frohlockt, miaut, prophezeit, rumort: no ge-;
		// gearbeitet, geantwortet: ge-. Only a dictionary tells them apart.
		for (const [infinitive, preterite] of [
			["posaunen", "posaunte"],
			["frohlocken", "frohlockte"],
			["miauen", "miaute"],
			["prophezeien", "prophezeite"],
			["rumoren", "rumorte"],
			["palavern", "palaverte"],
			["arbeiten", "arbeitete"],
			["antworten", "antwortete"],
		] as const)
			expect(
				weakly(infinitive, preterite)["Partizip II"],
			).toBeUndefined();
	});

	it("a one-syllable root before -eln, -ern or -ig carries the stress", () => {
		expect(weakly("handeln", "handelte")["Partizip II"]).toBe("gehandelt");
		expect(weakly("ärgern", "ärgerte")["Partizip II"]).toBe("geärgert");
		expect(weakly("kündigen", "kündigte")["Partizip II"]).toBe("gekündigt");
	});

	it("tells an -ern verb from an inseparable prefix", () => {
		expect(weakly("entern", "enterte")["Partizip II"]).toBe("geentert");
		expect(weakly("erinnern", "erinnerte")["Partizip II"]).toBe("erinnert");
		expect(weakly("verbessern", "verbesserte")["Partizip II"]).toBe(
			"verbessert",
		);
	});

	it("knien gets no forms", () => {
		expect(weakly("knien", "kniete")).toEqual({});
	});
});

describe("weak stems", () => {
	it("-eln and -ern verbs", () => {
		expect(weakly("sammeln", "sammelte").Präsens).toBe(
			"ich sammle, du sammelst, er sammelt, wir sammeln, ihr sammelt, sie sammeln",
		);
		expect(weakly("wandern", "wanderte").Imperativ).toBe(
			"wandere, wandert",
		);
	});

	it("links a consonant + n stem with e, but not after a lengthening h", () => {
		expect(weakly("rechnen", "rechnete").Präsens).toBe(
			"ich rechne, du rechnest, er rechnet, wir rechnen, ihr rechnet, sie rechnen",
		);
		expect(weakly("wohnen", "wohnte")["Partizip II"]).toBe("gewohnt");
	});

	it("tells an inseparable prefix from a stem that only looks like one", () => {
		expect(weakly("besuchen", "besuchte")["Partizip II"]).toBe("besucht");
		expect(weakly("beten", "betete")["Partizip II"]).toBe("gebetet");
		expect(weakly("ernten", "erntete")["Partizip II"]).toBe("geerntet");
		expect(weakly("übersetzen", "übersetzte")["Partizip II"]).toBe(
			"übersetzt",
		);
		expect(
			weakly("übersetzen", "setzte über", { hasSepPrefix: "über" })[
				"Partizip II"
			],
		).toBe("übergesetzt");
	});

	it("a Dat reflexive", () => {
		expect(weakly("merken", "merkte", {}, "Dat").Imperativ).toBe(
			"merk dir, merkt euch",
		);
	});
});
