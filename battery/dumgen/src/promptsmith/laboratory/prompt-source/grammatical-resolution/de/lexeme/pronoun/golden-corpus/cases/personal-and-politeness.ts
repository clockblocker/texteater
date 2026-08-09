import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, core, inflection } from "./builders";

const personal = (person: "1" | "2" | "3") => core("Prs", { person });

export const personalAndPolitenessCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-citation-man": {
				input: {
					markedContext:
						"Wörterbucheintrag Pronomen: <TARGET>man</TARGET>",
				},
				idealOutput: citation({
					normalizedMembers: ["man"],
					canonicalForm: "man",
					coreFeatures: core("Ind"),
				}),
				explanation:
					"An explicit dictionary label uses Citation; PronType=Ind is stable Lemma identity.",
			},
			"grammar-de-pron-inflection-dative-ihm": {
				input: { markedContext: "Anna hilft <TARGET>ihm</TARGET>." },
				idealOutput: inflection({
					normalizedMembers: ["ihm"],
					canonicalForm: "er",
					coreFeatures: personal("3"),
					inflectionalFeatures: {
						case: "Dat",
						gender: "Masc",
						number: "Sing",
						reflex: null,
					},
				}),
				explanation:
					"The dative Surface retains contextual morphology while the Lemma uses canonical er.",
			},
			"grammar-de-pron-sentence-initial-es": {
				input: { markedContext: "<TARGET>Es</TARGET> öffnet die Tür." },
				idealOutput: inflection({
					normalizedMembers: ["es"],
					canonicalForm: "es",
					coreFeatures: personal("3"),
					inflectionalFeatures: {
						case: "Nom",
						gender: "Neut",
						number: "Sing",
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-personal-feminine-sie": {
				input: {
					markedContext: "Heute öffnet <TARGET>sie</TARGET> die Tür.",
				},
				idealOutput: inflection({
					normalizedMembers: ["sie"],
					canonicalForm: "sie",
					coreFeatures: personal("3"),
					inflectionalFeatures: {
						case: "Nom",
						gender: "Fem",
						number: "Sing",
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-personal-plural-sie": {
				input: {
					markedContext: "Heute öffnen <TARGET>sie</TARGET> die Tür.",
				},
				idealOutput: inflection({
					normalizedMembers: ["sie"],
					canonicalForm: "sie",
					coreFeatures: personal("3"),
					inflectionalFeatures: {
						case: "Nom",
						gender: null,
						number: "Plur",
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-personal-wir": {
				input: {
					markedContext: "<TARGET>Wir</TARGET> warten draußen.",
				},
				idealOutput: inflection({
					normalizedMembers: ["wir"],
					canonicalForm: "wir",
					coreFeatures: personal("1"),
					inflectionalFeatures: {
						case: "Nom",
						gender: null,
						number: "Plur",
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-formal-sie": {
				input: {
					markedContext: "Bitte warten <TARGET>Sie</TARGET> hier.",
				},
				idealOutput: inflection({
					normalizedMembers: ["Sie"],
					canonicalForm: "Sie",
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Form",
					}),
					inflectionalFeatures: {
						case: "Nom",
						gender: null,
						number: null,
						reflex: null,
					},
				}),
			},
			"grammar-de-pron-formal-ihnen": {
				input: { markedContext: "Ich danke <TARGET>Ihnen</TARGET>." },
				idealOutput: inflection({
					normalizedMembers: ["Ihnen"],
					canonicalForm: "Sie",
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Form",
					}),
					inflectionalFeatures: {
						case: "Dat",
						gender: null,
						number: null,
						reflex: null,
					},
				}),
			},
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
