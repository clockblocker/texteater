import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedFrame } from "./builders";

export const frameCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-paired-frame-demo-anstatt-zu": resolvedFrame({
			markedContext:
				"Mara telefonierte, <TARGET>anstatt</TARGET> den Bericht sorgfältig <TARGET>zu</TARGET> schreiben.",
			canonicalForm: "anstatt … zu",
		}),
		"grammar-de-paired-frame-demo-sowohl-als-auch": resolvedFrame({
			markedContext:
				"Sie hat <TARGET>sowohl</TARGET> den Film gesehen <TARGET>als</TARGET> <TARGET>auch</TARGET> das Buch gelesen.",
			canonicalForm: "sowohl … als auch",
		}),
		"grammar-de-paired-frame-demo-je-desto-payload": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Je</TARGET> länger der Weg wird, <TARGET>desto</TARGET> müder werden die Reisenden.",
				normalizedMembers: ["je", "desto"],
				canonicalForm: "je … desto",
			}),
			explanation:
				"Je + desto anchors. Comparative words carry payload. Keep them out.",
		},
		"grammar-de-paired-frame-demo-entweder-typo": {
			...resolvedFrame({
				markedContext:
					"Wir nehmen <TARGET>endweder</TARGET> den Bus <TARGET>oder</TARGET> die Bahn.",
				normalizedMembers: ["entweder", "oder"],
				canonicalForm: "entweder … oder",
				memberOrthographies: ["Typo", "Standard"],
			}),
			explanation:
				"endweder typo. Repair one anchor. Membership stays fixed.",
		},
		"grammar-de-paired-frame-demo-so-dass-variant": {
			...resolvedFrame({
				markedContext:
					"Im alten Druck stand: Er sprach <TARGET>so</TARGET> leise, <TARGET>daß</TARGET> ihn niemand verstand.",
				normalizedMembers: ["so", "daß"],
				canonicalForm: "so … dass",
				spelling: "Variant",
			}),
			explanation:
				"Old daß spelling is licensed. Keep Standard member, Variant Surface, current dass Lemma.",
		},
		"grammar-de-paired-frame-demo-einerseits-andererseits": {
			...resolvedFrame({
				markedContext:
					"Der Plan ist <TARGET>einerseits</TARGET> günstig, <TARGET>andererseits</TARGET> riskant.",
				normalizedMembers: ["einerseits", "andererseits"],
				canonicalForm: "einerseits … andererseits",
			}),
			explanation:
				"Two correlating anchors. Adjective predicates are unmarked payload.",
		},

		"grammar-de-paired-frame-dev-entweder-freitag": resolvedFrame({
			markedContext:
				"Wir reisen <TARGET>entweder</TARGET> am Freitag <TARGET>oder</TARGET> am Samstag.",
			canonicalForm: "entweder … oder",
		}),
		"grammar-de-paired-frame-dev-entweder-clauses": resolvedFrame({
			markedContext:
				"<TARGET>Entweder</TARGET> fährt Mia heute, <TARGET>oder</TARGET> sie bleibt bis morgen.",
			normalizedMembers: ["entweder", "oder"],
			canonicalForm: "entweder … oder",
		}),
		"grammar-de-paired-frame-dev-weder-noch": resolvedFrame({
			markedContext:
				"Sie trinkt <TARGET>weder</TARGET> Tee <TARGET>noch</TARGET> Kaffee.",
			canonicalForm: "weder … noch",
		}),
		"grammar-de-paired-frame-dev-sowohl-wie": resolvedFrame({
			markedContext:
				"Die Regel gilt <TARGET>sowohl</TARGET> für Kinder <TARGET>wie</TARGET> für Erwachsene.",
			canonicalForm: "sowohl … wie",
		}),
		"grammar-de-paired-frame-dev-sowohl-wie-auch": resolvedFrame({
			markedContext:
				"Das Angebot gilt <TARGET>sowohl</TARGET> online <TARGET>wie</TARGET> <TARGET>auch</TARGET> im Laden.",
			canonicalForm: "sowohl … wie auch",
		}),
		"grammar-de-paired-frame-dev-je-umso": resolvedFrame({
			markedContext:
				"<TARGET>Je</TARGET> genauer wir messen, <TARGET>umso</TARGET> sicherer wird das Ergebnis.",
			normalizedMembers: ["je", "umso"],
			canonicalForm: "je … umso",
		}),
		"grammar-de-paired-frame-dev-um-zu": resolvedFrame({
			markedContext:
				"Noah spart, <TARGET>um</TARGET> im Sommer verreisen <TARGET>zu</TARGET> können.",
			canonicalForm: "um … zu",
		}),
		"grammar-de-paired-frame-dev-ohne-zu": resolvedFrame({
			markedContext:
				"Er ging, <TARGET>ohne</TARGET> sich <TARGET>zu</TARGET> verabschieden.",
			canonicalForm: "ohne … zu",
		}),
		"grammar-de-paired-frame-dev-statt-zu": {
			...resolvedFrame({
				markedContext:
					"Lina schwieg, <TARGET>statt</TARGET> offen <TARGET>zu</TARGET> widersprechen.",
				canonicalForm: "statt … zu",
			}),
			explanation:
				"statt + zu is licensed lexical alternative. Own Canonical Lemma, not spelling Variant.",
		},
		"grammar-de-paired-frame-dev-teils-teils": {
			...resolvedFrame({
				markedContext:
					"Die Antworten waren <TARGET>teils</TARGET> hilfreich, <TARGET>teils</TARGET> widersprüchlich.",
				canonicalForm: "teils … teils",
			}),
			explanation:
				"Same spelling, two anchor occurrences. Preserve both positions.",
		},
		"grammar-de-paired-frame-dev-je-je": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Je</TARGET> mehr er versprach, <TARGET>je</TARGET> weniger glaubte man ihm.",
				normalizedMembers: ["je", "je"],
				canonicalForm: "je … je",
			}),
			explanation:
				"Repeated je anchors form a licensed proportional frame.",
		},
		"grammar-de-paired-frame-dev-casing-entweder": resolvedFrame({
			markedContext:
				"<TARGET>Entweder</TARGET> gewinnen wir heute, <TARGET>oder</TARGET> wir üben morgen weiter.",
			normalizedMembers: ["entweder", "oder"],
			canonicalForm: "entweder … oder",
		}),
		"grammar-de-paired-frame-dev-desto-typo": resolvedFrame({
			markedContext:
				"<TARGET>Je</TARGET> höher der Druck, <TARGET>desdo</TARGET> größer das Risiko.",
			normalizedMembers: ["je", "desto"],
			canonicalForm: "je … desto",
			memberOrthographies: ["Standard", "Typo"],
		}),
		"grammar-de-paired-frame-dev-andererseits-typo": resolvedFrame({
			markedContext:
				"Die Lösung ist <TARGET>einerseits</TARGET> schnell, <TARGET>anderrerseits</TARGET> aber teuer.",
			normalizedMembers: ["einerseits", "andererseits"],
			canonicalForm: "einerseits … andererseits",
			memberOrthographies: ["Standard", "Typo"],
		}),
		"grammar-de-paired-frame-dev-near-cconj": {
			...resolvedFrame({
				markedContext:
					"Die Frage lautet „Kaffee oder Tee?“, doch wir bestellen <TARGET>entweder</TARGET> Saft <TARGET>oder</TARGET> Wasser.",
				canonicalForm: "entweder … oder",
			}),
			explanation:
				"First oder is ordinary context CCONJ. Marked anchors alone form target.",
		},
		"grammar-de-paired-frame-dev-near-sconj": {
			...resolvedFrame({
				markedContext:
					"Ob es regnet, weiß niemand; wir fahren <TARGET>entweder</TARGET> mit dem Bus <TARGET>oder</TARGET> mit der Bahn.",
				canonicalForm: "entweder … oder",
			}),
			explanation:
				"Initial ob is standalone SCONJ context. Do not absorb it.",
		},
		"grammar-de-paired-frame-dev-near-adv": {
			...resolvedFrame({
				markedContext:
					"Außerdem ist der Entwurf <TARGET>sowohl</TARGET> klar <TARGET>als</TARGET> <TARGET>auch</TARGET> knapp.",
				canonicalForm: "sowohl … als auch",
			}),
			explanation:
				"Außerdem is ADV context. Three marked anchors stay target.",
		},
		"grammar-de-paired-frame-dev-repeated-um-zu-context": {
			...resolvedFrame({
				markedContext:
					"Um das Haus blieb es zu laut, <TARGET>um</TARGET> dort ruhig schlafen <TARGET>zu</TARGET> können.",
				canonicalForm: "um … zu",
			}),
			explanation:
				"Earlier um and zu are standalone context. Later marked um + zu are frame anchors.",
		},

		"grammar-de-paired-frame-accept-entweder-nouns": resolvedFrame({
			markedContext:
				"Zum Frühstück gibt es <TARGET>entweder</TARGET> Müsli <TARGET>oder</TARGET> Brot.",
			canonicalForm: "entweder … oder",
		}),
		"grammar-de-paired-frame-accept-weder-clauses": resolvedFrame({
			markedContext:
				"<TARGET>Weder</TARGET> rief sie zurück, <TARGET>noch</TARGET> schrieb sie eine Nachricht.",
			normalizedMembers: ["weder", "noch"],
			canonicalForm: "weder … noch",
		}),
		"grammar-de-paired-frame-accept-sowohl-als-auch": resolvedFrame({
			markedContext:
				"Der Kurs ist <TARGET>sowohl</TARGET> anspruchsvoll <TARGET>als</TARGET> <TARGET>auch</TARGET> unterhaltsam.",
			canonicalForm: "sowohl … als auch",
		}),
		"grammar-de-paired-frame-accept-sowohl-wie": resolvedFrame({
			markedContext:
				"Das Verfahren eignet sich <TARGET>sowohl</TARGET> für kleine Teams <TARGET>wie</TARGET> für große Abteilungen.",
			canonicalForm: "sowohl … wie",
		}),
		"grammar-de-paired-frame-accept-je-desto": resolvedFrame({
			markedContext:
				"<TARGET>Je</TARGET> ruhiger die See war, <TARGET>desto</TARGET> schneller kamen wir voran.",
			normalizedMembers: ["je", "desto"],
			canonicalForm: "je … desto",
		}),
		"grammar-de-paired-frame-accept-je-umso": resolvedFrame({
			markedContext:
				"<TARGET>Je</TARGET> später der Abend wurde, <TARGET>umso</TARGET> leiser sprach die Runde.",
			normalizedMembers: ["je", "umso"],
			canonicalForm: "je … umso",
		}),
		"grammar-de-paired-frame-accept-um-zu": resolvedFrame({
			markedContext:
				"Tarek öffnete das Fenster, <TARGET>um</TARGET> frische Luft hereinzulassen <TARGET>zu</TARGET> können.",
			canonicalForm: "um … zu",
		}),
		"grammar-de-paired-frame-accept-einerseits": resolvedFrame({
			markedContext:
				"Die Wohnung liegt <TARGET>einerseits</TARGET> zentral, <TARGET>andererseits</TARGET> ist sie sehr laut.",
			canonicalForm: "einerseits … andererseits",
		}),
		"grammar-de-paired-frame-accept-teils": resolvedFrame({
			markedContext:
				"Der Weg führte <TARGET>teils</TARGET> durch Wald, <TARGET>teils</TARGET> über offene Felder.",
			canonicalForm: "teils … teils",
		}),
		"grammar-de-paired-frame-accept-ohne-zu": resolvedFrame({
			markedContext:
				"Nora löste die Aufgabe, <TARGET>ohne</TARGET> jemanden um Hilfe <TARGET>zu</TARGET> bitten.",
			canonicalForm: "ohne … zu",
		}),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
