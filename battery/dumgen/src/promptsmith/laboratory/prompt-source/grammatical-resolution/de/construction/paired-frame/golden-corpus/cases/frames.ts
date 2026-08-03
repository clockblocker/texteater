import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedFrame } from "./builders";

export const frameCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-paired-frame-entweder-oder-friday": {
			...resolvedFrame({
				markedContext:
					"Wir reisen <TARGET>entweder</TARGET> am Freitag <TARGET>oder</TARGET> am Samstag.",
				normalizedSurface: "entweder oder",
				canonicalForm: "entweder … oder",
			}),
			contaminationKeys: ["de-paired-frame:entweder-oder"],
			explanation:
				"IDS grammis analyzes entweder ... oder as one multi-part coordinator; only its two frame members are selected.",
		},
		"grammar-de-paired-frame-je-umso-night": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Je</TARGET> länger die Nacht, <TARGET>umso</TARGET> heller der Morgen.",
				normalizedSurface: "je umso",
				canonicalForm: "je … umso",
			}),
			contaminationKeys: ["de-paired-frame:je-umso"],
			explanation:
				"IDS lists je ... umso as a proportional two-part linkage; its distinct lexical second arm remains part of its own Canonical Form.",
		},
		"grammar-de-paired-frame-um-zu-learn": {
			...resolvedFrame({
				markedContext:
					"Sie liest täglich, <TARGET>um</TARGET> schneller <TARGET>zu</TARGET> lernen.",
				normalizedSurface: "um zu",
				canonicalForm: "um … zu",
			}),
			contaminationKeys: ["de-paired-frame:um-zu"],
			explanation:
				"Dumling names um_zu as the German PairedFrame example, and IDS analyzes um ... zu as an infinitive construction.",
		},
		"grammar-de-paired-frame-entweder-oder-clauses": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Entweder</TARGET> fährt Mia heute, <TARGET>oder</TARGET> sie bleibt bis morgen.",
				normalizedSurface: "entweder oder",
				canonicalForm: "entweder … oder",
			}),
			contaminationKeys: ["de-paired-frame:entweder-oder"],
			explanation:
				"Sentence-initial capitalization is Standard and normalizes to the lower-case frame member.",
		},
		"grammar-de-paired-frame-weder-noch-nouns": {
			...resolvedFrame({
				markedContext:
					"Sie trinkt <TARGET>weder</TARGET> Tee <TARGET>noch</TARGET> Kaffee.",
				normalizedSurface: "weder noch",
				canonicalForm: "weder … noch",
			}),
			contaminationKeys: ["de-paired-frame:weder-noch"],
			explanation:
				"IDS lists weder ... noch among its two-member coordinators; the complete frame, not either conjunct, is selected.",
		},
		"grammar-de-paired-frame-sowohl-wie": {
			...resolvedFrame({
				markedContext:
					"Die Regel gilt <TARGET>sowohl</TARGET> für Kinder <TARGET>wie</TARGET> für Erwachsene.",
				normalizedSurface: "sowohl wie",
				canonicalForm: "sowohl … wie",
			}),
			contaminationKeys: ["de-paired-frame:sowohl-wie"],
			explanation:
				"IDS explicitly licenses sowohl ... wie (auch); without auch, wie is the complete second arm of a two-member Canonical Form.",
		},
		"grammar-de-paired-frame-sowohl-als-auch": {
			...resolvedFrame({
				markedContext:
					"Sie hat <TARGET>sowohl</TARGET> den Film gesehen <TARGET>als</TARGET> <TARGET>auch</TARGET> das Buch gelesen.",
				normalizedSurface: "sowohl als auch",
				canonicalForm: "sowohl … als auch",
			}),
			contaminationKeys: ["de-paired-frame:sowohl-als-auch"],
			explanation:
				"All three lexical members of the multi-part coordinator are marked; the coordinated phrases are fillers.",
		},
		"grammar-de-paired-frame-sowohl-wie-auch": {
			...resolvedFrame({
				markedContext:
					"Das gilt <TARGET>sowohl</TARGET> für Kinder <TARGET>wie</TARGET> <TARGET>auch</TARGET> für Erwachsene.",
				normalizedSurface: "sowohl wie auch",
				canonicalForm: "sowohl … wie auch",
			}),
			contaminationKeys: ["de-paired-frame:sowohl-wie-auch"],
			explanation:
				"IDS explicitly licenses sowohl ... wie auch; its lexical wie arm gives it a distinct Canonical Form rather than an orthographic Variant Surface.",
		},
		"grammar-de-paired-frame-je-desto": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Je</TARGET> länger er wartet, <TARGET>desto</TARGET> unruhiger wird er.",
				normalizedSurface: "je desto",
				canonicalForm: "je … desto",
			}),
			contaminationKeys: ["de-paired-frame:je-desto"],
			explanation:
				"IDS calls je ... desto/umso an obligatory two-part linkage in proportional clauses.",
		},
		"grammar-de-paired-frame-je-umso": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Je</TARGET> genauer wir messen, <TARGET>umso</TARGET> sicherer wird das Ergebnis.",
				normalizedSurface: "je umso",
				canonicalForm: "je … umso",
			}),
			contaminationKeys: ["de-paired-frame:je-umso"],
		},
		"grammar-de-paired-frame-um-zu-purpose": {
			...resolvedFrame({
				markedContext:
					"Noah spart, <TARGET>um</TARGET> im Sommer verreisen <TARGET>zu</TARGET> können.",
				normalizedSurface: "um zu",
				canonicalForm: "um … zu",
			}),
			contaminationKeys: ["de-paired-frame:um-zu"],
		},
		"grammar-de-paired-frame-ohne-zu": {
			...resolvedFrame({
				markedContext:
					"Er ging, <TARGET>ohne</TARGET> sich <TARGET>zu</TARGET> verabschieden.",
				normalizedSurface: "ohne zu",
				canonicalForm: "ohne … zu",
			}),
			contaminationKeys: ["de-paired-frame:ohne-zu"],
			explanation:
				"IDS groups ohne ... zu with the marked infinitive constructions; the infinitive itself is a filler, not a frame member.",
		},
		"grammar-de-paired-frame-anstatt-zu": {
			...resolvedFrame({
				markedContext:
					"Sie telefonierte, <TARGET>anstatt</TARGET> den Bericht <TARGET>zu</TARGET> schreiben.",
				normalizedSurface: "anstatt zu",
				canonicalForm: "anstatt … zu",
			}),
			contaminationKeys: ["de-paired-frame:anstatt-zu"],
			explanation:
				"IDS groups anstatt ... zu with German infinitive constructions.",
		},
		"grammar-de-paired-frame-entweder-typo": {
			...resolvedFrame({
				markedContext:
					"Wir nehmen <TARGET>endweder</TARGET> den Bus <TARGET>oder</TARGET> die Bahn.",
				normalizedSurface: "entweder oder",
				canonicalForm: "entweder … oder",
				memberOrthographies: ["Typo", "Standard"],
			}),
			contaminationKeys: ["de-paired-frame:entweder-oder"],
			explanation:
				"A single unmistakable member typo is repaired without changing the frame identity.",
		},
		"grammar-de-paired-frame-desto-typo": {
			...resolvedFrame({
				markedContext:
					"<TARGET>Je</TARGET> höher der Druck, <TARGET>desdo</TARGET> größer das Risiko.",
				normalizedSurface: "je desto",
				canonicalForm: "je … desto",
				memberOrthographies: ["Standard", "Typo"],
			}),
			contaminationKeys: ["de-paired-frame:je-desto"],
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
