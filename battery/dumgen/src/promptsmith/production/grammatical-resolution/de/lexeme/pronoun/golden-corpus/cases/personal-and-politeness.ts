import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { core, inflectionCase } from "./builders";

const personal = (
	person: "1" | "2" | "3",
	referenceNumber: "Plur" | "Sing" | null,
	referenceGender: "Fem" | "Masc" | "Neut" | null = null,
) => core("Prs", { person, referenceGender, referenceNumber });

export const personalAndPolitenessCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-demo-personal-ihm": inflectionCase(
				"Anna hilft <TARGET>ihm</TARGET> beim Umzug.",
				"ihm",
				"ihm",
				{ case: "Dat", gender: "Masc", number: "Sing", reflex: null },
				{
					coreFeatures: personal("3", "Sing", "Masc"),
					explanation:
						"Dative masculine singular fixed form identity.",
				},
			),
			"grammar-de-pron-demo-formal-ihnen": inflectionCase(
				"Frau Weber, ich danke <TARGET>Ihnen</TARGET> für die Hilfe.",
				"Ihnen",
				"Ihnen",
				{ case: "Dat", gender: null, number: "Plur", reflex: null },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Form",
						referenceNumber: "Sing",
					}),
					explanation:
						"Formal singular addressee; Surface remains morphologically plural.",
				},
			),
			"grammar-de-pron-dev-personal-ich": inflectionCase(
				"Heute fahre <TARGET>ich</TARGET> mit dem Zug nach Leipzig.",
				"ich",
				"ich",
				{ case: "Nom", gender: null, number: "Sing", reflex: null },
				{ coreFeatures: personal("1", "Sing") },
			),
			"grammar-de-pron-dev-personal-sie-fem": inflectionCase(
				"Nach dem Essen liest <TARGET>sie</TARGET> noch eine Stunde.",
				"sie",
				"sie",
				{ case: "Nom", gender: "Fem", number: "Sing", reflex: null },
				{ coreFeatures: personal("3", "Sing", "Fem") },
			),
			"grammar-de-pron-dev-personal-sie-plur-acc": inflectionCase(
				"Die Gäste warten draußen; der Portier ruft <TARGET>sie</TARGET> herein.",
				"sie",
				"sie",
				{ case: "Acc", gender: null, number: "Plur", reflex: null },
				{ coreFeatures: personal("3", "Plur") },
			),
			"grammar-de-pron-dev-personal-euch": inflectionCase(
				"Morgen besuche ich <TARGET>euch</TARGET> in Dresden.",
				"euch",
				"euch",
				{ case: "Acc", gender: null, number: "Plur", reflex: null },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Infm",
						referenceNumber: "Plur",
					}),
				},
			),
			"grammar-de-pron-dev-formal-sie-nom": inflectionCase(
				"Herr Yilmaz, <TARGET>Sie</TARGET> beginnen bitte mit dem Bericht.",
				"Sie",
				"Sie",
				{ case: "Nom", gender: null, number: "Plur", reflex: null },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Form",
						referenceNumber: "Sing",
					}),
				},
			),
			"grammar-de-pron-accept-v4-personal-dir-dat": inflectionCase(
				"Nach der Besprechung gebe ich <TARGET>dir</TARGET> die Notizen zurück.",
				"dir",
				"dir",
				{ case: "Dat", gender: null, number: "Sing", reflex: null },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Infm",
						referenceNumber: "Sing",
					}),
				},
			),
			"grammar-de-pron-accept-v4-personal-wir-nom": inflectionCase(
				"Am nächsten Morgen fahren <TARGET>wir</TARGET> gemeinsam zur Baustelle.",
				"wir",
				"wir",
				{ case: "Nom", gender: null, number: "Plur", reflex: null },
				{ coreFeatures: personal("1", "Plur") },
			),
			"grammar-de-pron-accept-v4-formal-ihnen-dat": inflectionCase(
				"Herr Brandt, die Rezeption reserviert <TARGET>Ihnen</TARGET> ein ruhiges Zimmer.",
				"Ihnen",
				"Ihnen",
				{ case: "Dat", gender: null, number: "Plur", reflex: null },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Form",
						referenceNumber: "Sing",
					}),
				},
			),
			"grammar-de-pron-accept-formal-sie-unknown-addressee":
				inflectionCase(
					"Kommen <TARGET>Sie</TARGET> bitte herein.",
					"Sie",
					"Sie",
					{ case: "Nom", gender: null, number: "Plur", reflex: null },
					{
						coreFeatures: core("Prs", {
							person: "2",
							polite: "Form",
							referenceNumber: null,
						}),
						explanation:
							"Addressee count is unstated, so fixed-population selection must miss.",
					},
				),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
