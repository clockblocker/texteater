import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finite, ordinaryCore } from "./builders";

export const prepositionContrastCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-verb-prep-governed-warten-auf": {
				input: {
					markedContext:
						"Die Fahrgäste <TARGET>warten</TARGET> trotz der eisigen Kälte geduldig <TARGET>auf</TARGET> den verspäteten Nachtzug nach Hamburg.",
					members: ["warten", "auf"],
				},
				idealOutput: finite(
					["warten", "auf"],
					"warten",
					{
						mood: "Ind",
						number: "Plur",
						person: "3",
						tense: "Pres",
					},
					{ ...ordinaryCore, hasGovPrep: "auf" },
					["Standard", "Standard"],
				),
			},
			"grammar-de-verb-prep-free-warten-im": {
				input: {
					markedContext:
						"Während des schweren Gewitters <TARGET>wartet</TARGET> der Hausmeister im trockenen Keller des alten Schulgebäudes.",
					members: ["wartet"],
				},
				idealOutput: finite(["wartet"], "warten", {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
			},
			"grammar-de-verb-prep-governed-verzichten-auf": {
				input: {
					markedContext:
						"Die Ministerin <TARGET>verzichtet</TARGET> trotz heftiger Kritik aus der eigenen Partei <TARGET>auf</TARGET> eine erneute Kandidatur.",
					members: ["verzichtet", "auf"],
				},
				idealOutput: finite(
					["verzichtet", "auf"],
					"verzichten",
					{
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
					},
					{ ...ordinaryCore, hasGovPrep: "auf" },
					["Standard", "Standard"],
				),
			},
			"grammar-de-verb-prep-free-sprechen-im": {
				input: {
					markedContext:
						"Nach langen Verhandlungen <TARGET>spricht</TARGET> die Ministerin im voll besetzten Parlament ruhig, langsam und mit großer Entschlossenheit.",
					members: ["spricht"],
				},
				idealOutput: finite(["spricht"], "sprechen", {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
			},
			"grammar-de-verb-prep-governed-reflexive-erinnern-an": {
				input: {
					markedContext:
						"Der pensionierte Lehrer <TARGET>erinnert</TARGET> <TARGET>sich</TARGET> noch deutlich <TARGET>an</TARGET> seinen ersten Schultag in dem kleinen Bergdorf.",
					members: ["erinnert", "sich", "an"],
				},
				idealOutput: finite(
					["erinnert", "sich", "an"],
					"sich erinnern",
					{
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
					},
					{
						hasGovPrep: "an",
						hasSepPrefix: null,
						lexicallyReflexive: "Yes",
					},
					["Standard", "Standard", "Standard"],
				),
			},
			"grammar-de-verb-prep-governed-reflexive-sehnen-nach": {
				input: {
					markedContext:
						"Viele Bewohner <TARGET>sehnen</TARGET> <TARGET>sich</TARGET> nach Monaten voller Lärm <TARGET>nach</TARGET> etwas Ruhe und verlässlichen Nächten.",
					members: ["sehnen", "sich", "nach"],
				},
				idealOutput: finite(
					["sehnen", "sich", "nach"],
					"sich sehnen",
					{
						mood: "Ind",
						number: "Plur",
						person: "3",
						tense: "Pres",
					},
					{
						hasGovPrep: "nach",
						hasSepPrefix: null,
						lexicallyReflexive: "Yes",
					},
					["Standard", "Standard", "Standard"],
				),
			},
			"grammar-de-verb-prep-free-reflexive-erholen-im": {
				input: {
					markedContext:
						"Nach der anstrengenden Sitzung <TARGET>erholt</TARGET> <TARGET>sich</TARGET> die Ministerin im stillen Garten hinter dem Kanzleramt.",
					members: ["erholt", "sich"],
				},
				idealOutput: finite(
					["erholt", "sich"],
					"sich erholen",
					{
						mood: "Ind",
						number: "Sing",
						person: "3",
						tense: "Pres",
					},
					{
						...ordinaryCore,
						lexicallyReflexive: "Yes",
					},
					["Standard", "Standard"],
				),
			},
			"grammar-de-verb-prep-governed-warnen-vor": {
				input: {
					markedContext:
						"Internationale Fachleute <TARGET>warnen</TARGET> die Küstenstädte seit Jahren <TARGET>vor</TARGET> den Folgen eines ungebremsten Meeresspiegelanstiegs.",
					members: ["warnen", "vor"],
				},
				idealOutput: finite(
					["warnen", "vor"],
					"warnen",
					{
						mood: "Ind",
						number: "Plur",
						person: "3",
						tense: "Pres",
					},
					{ ...ordinaryCore, hasGovPrep: "vor" },
					["Standard", "Standard"],
				),
			},
			"grammar-de-verb-prep-free-arbeiten-mit": {
				input: {
					markedContext:
						"Die Ärztin <TARGET>arbeitet</TARGET> seit vielen Jahren mit einem besonders präzisen Mikroskop in der Forschungsklinik.",
					members: ["arbeitet"],
				},
				idealOutput: finite(["arbeitet"], "arbeiten", {
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
				}),
			},
			"grammar-de-verb-prep-free-spielen-auf": {
				input: {
					markedContext:
						"Die Kinder <TARGET>spielen</TARGET> auch bei kühlem Herbstwetter auf dem frisch renovierten Schulhof hinter der Turnhalle.",
					members: ["spielen"],
				},
				idealOutput: finite(["spielen"], "spielen", {
					mood: "Ind",
					number: "Plur",
					person: "3",
					tense: "Pres",
				}),
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
