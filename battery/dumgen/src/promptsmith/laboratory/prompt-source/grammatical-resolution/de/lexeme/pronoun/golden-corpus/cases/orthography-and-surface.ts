import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citation, core, inflection } from "./builders";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-variant-nix": {
				input: { markedContext: "Ich sehe <TARGET>nix</TARGET>." },
				idealOutput: citation({
					normalizedMembers: ["nix"],
					canonicalForm: "nichts",
					coreFeatures: core("Neg"),
					spelling: "Variant",
				}),
				explanation:
					"German GSD lemmatizes the licensed colloquial form nix as nichts without Typo.",
			},
			"grammar-de-pron-typo-ihc": {
				input: { markedContext: "<TARGET>Ihc</TARGET> komme später." },
				idealOutput: inflection({
					normalizedMembers: ["ich"],
					canonicalForm: "ich",
					coreFeatures: core("Prs", { person: "1" }),
					memberOrthography: "Typo",
					inflectionalFeatures: {
						case: "Nom",
						gender: null,
						number: "Sing",
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
