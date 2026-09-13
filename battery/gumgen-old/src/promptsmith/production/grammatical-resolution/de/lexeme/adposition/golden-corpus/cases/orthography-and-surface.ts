import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { adpositionCase, ordinaryAdpositionCore } from "./builders";

export const orthographyAndSurfaceCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-adp-demo-typo-one": adpositionCase(
				"Sie ging <TARGET>one</TARGET> Mantel hinaus.",
				["one"],
				{
					normalizedMembers: ["ohne"],
					memberOrthographies: ["Typo"],
					canonicalForm: "ohne",
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Acc",
					}),
					explanation:
						"Missing h is a genuine typo; repair only the supplied member.",
				},
			),
			"grammar-de-adp-demo-archaic-ob": adpositionCase(
				"<TARGET>Ob</TARGET> des Unwetters blieb das Tor geschlossen.",
				["Ob"],
				{
					normalizedMembers: ["ob"],
					historicalStatus: "Archaic",
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Gen",
					}),
				},
			),
			"grammar-de-adp-dev-sentence-initial-wegen": adpositionCase(
				"<TARGET>Wegen</TARGET> des Sturms blieb die Fähre im Hafen.",
				["Wegen"],
				{
					normalizedMembers: ["wegen"],
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Gen",
					}),
					explanation:
						"Sentence-initial capitalization is Standard and normalizes to lowercase.",
				},
			),
			"grammar-de-adp-dev-casing-typo-unter": adpositionCase(
				"Das Paket liegt <TARGET>Unter</TARGET> dem Tisch.",
				["Unter"],
				{
					normalizedMembers: ["unter"],
					memberOrthographies: ["Typo"],
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: null,
					}),
				},
			),
			"grammar-de-adp-dev-lexical-typo-gegen": adpositionCase(
				"Sie protestiert <TARGET>egen</TARGET> den neuen Plan.",
				["egen"],
				{
					normalizedMembers: ["gegen"],
					memberOrthographies: ["Typo"],
					canonicalForm: "gegen",
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Acc",
					}),
				},
			),
			"grammar-de-adp-dev-abbreviation-inkl": adpositionCase(
				"Der Preis beträgt <TARGET>inkl</TARGET>. Versand zehn Euro.",
				["inkl"],
				{
					canonicalForm: "inkl.",
					spelling: "Variant",
					coreFeatures: ordinaryAdpositionCore({
						abbr: "Yes",
						adpType: "Prep",
						governedCase: "Gen",
					}),
					explanation:
						"Segment supplies letters only; following period remains unmarked punctuation.",
				},
			),
			"grammar-de-adp-dev-variant-auf-grund": adpositionCase(
				"Die Redaktion führt „aufgrund“ als Leitform; <TARGET>auf</TARGET> <TARGET>Grund</TARGET> des Wetters bleibt zulässig.",
				["auf", "Grund"],
				{
					canonicalForm: "aufgrund",
					spelling: "Variant",
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Gen",
					}),
					explanation:
						"Context names editorial headword; two-word standard variant stays aligned.",
				},
			),
			"grammar-de-adp-accept-typo-ohhne": adpositionCase(
				"Er verließ das Haus <TARGET>ohhne</TARGET> seine Schlüssel.",
				["ohhne"],
				{
					normalizedMembers: ["ohne"],
					memberOrthographies: ["Typo"],
					canonicalForm: "ohne",
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Acc",
					}),
				},
			),
			"grammar-de-adp-accept-archaic-behufs": adpositionCase(
				"<TARGET>Behufs</TARGET> einer Prüfung wurden die Akten versiegelt.",
				["Behufs"],
				{
					normalizedMembers: ["behufs"],
					historicalStatus: "Archaic",
					coreFeatures: ordinaryAdpositionCore({
						adpType: "Prep",
						governedCase: "Gen",
					}),
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
