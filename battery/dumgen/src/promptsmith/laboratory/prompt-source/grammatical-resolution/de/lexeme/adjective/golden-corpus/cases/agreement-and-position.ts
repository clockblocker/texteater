import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { inflection, unmarkedCore } from "./builders";

export const agreementAndPositionCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-adj-attributive-nom-masc-klein": {
				input: {
					markedContext: "Der <TARGET>kleine</TARGET> Hund schläft.",
				},
				idealOutput: inflection({
					normalizedSurface: "kleine",
					canonicalForm: "klein",
					inflectionalFeatures: {
						case: "Nom",
						degree: "Pos",
						gender: "Masc",
						number: "Sing",
					},
				}),
				explanation:
					"Attributive adjectives carry contextual agreement together with Degree.",
			},
			"grammar-de-adj-adverbial-schnell": {
				input: {
					markedContext: "Der Hund läuft <TARGET>schnell</TARGET>.",
				},
				idealOutput: inflection({
					normalizedSurface: "schnell",
					canonicalForm: "schnell",
					inflectionalFeatures: {
						case: null,
						degree: "Pos",
						gender: null,
						number: null,
					},
				}),
				explanation:
					"Productive adverbial use remains ADJ and has Degree but no agreement features.",
				contaminationKeys: ["de-adj-position:adverbial-positive"],
			},
			"grammar-de-adj-attributive-acc-fem-rot": {
				input: {
					markedContext:
						"Sie trägt die <TARGET>rote</TARGET> Tasche.",
				},
				idealOutput: inflection({
					normalizedSurface: "rote",
					canonicalForm: "rot",
					inflectionalFeatures: {
						case: "Acc",
						degree: "Pos",
						gender: "Fem",
						number: "Sing",
					},
				}),
			},
			"grammar-de-adj-attributive-dat-neut-kalt": {
				input: {
					markedContext:
						"Bei <TARGET>kaltem</TARGET> Wetter bleiben wir drin.",
				},
				idealOutput: inflection({
					normalizedSurface: "kaltem",
					canonicalForm: "kalt",
					inflectionalFeatures: {
						case: "Dat",
						degree: "Pos",
						gender: "Neut",
						number: "Sing",
					},
				}),
			},
			"grammar-de-adj-attributive-gen-plur-neu": {
				input: {
					markedContext:
						"Aufgrund <TARGET>neuer</TARGET> Regeln änderte sich der Ablauf.",
				},
				idealOutput: inflection({
					normalizedSurface: "neuer",
					canonicalForm: "neu",
					inflectionalFeatures: {
						case: "Gen",
						degree: "Pos",
						gender: "Fem",
						number: "Plur",
					},
				}),
			},
			"grammar-de-adj-predicative-blau": {
				input: {
					markedContext: "<TARGET>Blau</TARGET> ist der Himmel.",
				},
				idealOutput: inflection({
					normalizedSurface: "blau",
					canonicalForm: "blau",
					inflectionalFeatures: {
						case: null,
						degree: "Pos",
						gender: null,
						number: null,
					},
				}),
			},
			"grammar-de-adj-adverbial-leise": {
				input: {
					markedContext:
						"Sie schließt die Tür <TARGET>leise</TARGET>.",
				},
				idealOutput: inflection({
					normalizedSurface: "leise",
					canonicalForm: "leise",
					inflectionalFeatures: {
						case: null,
						degree: "Pos",
						gender: null,
						number: null,
					},
				}),
				contaminationKeys: ["de-adj-position:adverbial-positive"],
			},
			"grammar-de-adj-participial-geschlossen": {
				input: {
					markedContext:
						"Die <TARGET>geschlossene</TARGET> Tür bleibt zu.",
				},
				idealOutput: inflection({
					normalizedSurface: "geschlossene",
					canonicalForm: "geschlossen",
					coreFeatures: unmarkedCore,
					inflectionalFeatures: {
						case: "Nom",
						degree: "Pos",
						gender: "Fem",
						number: "Sing",
					},
				}),
				explanation:
					"German GSD directly attests geschlossene as an agreement-bearing ADJ Surface of the representable adjective Lemma geschlossen.",
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
