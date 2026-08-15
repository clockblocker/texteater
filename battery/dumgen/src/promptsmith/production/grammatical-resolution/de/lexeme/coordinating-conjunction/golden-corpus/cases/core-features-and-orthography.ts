import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { conjunctionCase } from "./case-helpers";

export const orthographyAndHistoryCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-cconj-demo-typo-udn": conjunctionCase(
				"Tee <TARGET>udn</TARGET> Kaffee stehen bereit.",
				"udn",
				{
					normalizedMember: "und",
					canonicalForm: "und",
					orthography: "Typo",
					explanation:
						"Letters swapped. Mark Typo. Repair normalized member and Lemma.",
				},
			),
			"grammar-de-cconj-demo-variant-bzw": conjunctionCase(
				"Die Eltern <TARGET>bzw</TARGET>. Sorgeberechtigten unterschreiben.",
				"bzw",
				{
					canonicalForm: "beziehungsweise",
					spelling: "Variant",
					explanation:
						"Licensed abbreviation. Standard member. Variant Surface. Full Lemma.",
				},
			),
			"grammar-de-cconj-demo-archaic-allein": conjunctionCase(
				"Ich wollte helfen, <TARGET>allein</TARGET> mir fehlte die Zeit.",
				"allein",
				{
					historicalStatus: "Archaic",
					explanation:
						"Old adversative coordinator. Mark Surface Archaic.",
				},
			),
			"grammar-de-cconj-dev-typo-odre": conjunctionCase(
				"Nimm den Bus <TARGET>odre</TARGET> geh zu Fuß.",
				"odre",
				{
					normalizedMember: "oder",
					canonicalForm: "oder",
					orthography: "Typo",
				},
			),
			"grammar-de-cconj-dev-typo-sonedrn": conjunctionCase(
				"Das Paket ist nicht leicht, <TARGET>sonedrn</TARGET> schwer.",
				"sonedrn",
				{
					normalizedMember: "sondern",
					canonicalForm: "sondern",
					orthography: "Typo",
				},
			),
			"grammar-de-cconj-dev-variant-bzw-initial": conjunctionCase(
				"<TARGET>Bzw</TARGET>. die gesetzliche Vertretung muss zustimmen.",
				"Bzw",
				{
					normalizedMember: "bzw",
					canonicalForm: "beziehungsweise",
					spelling: "Variant",
				},
			),
			"grammar-de-cconj-accept-typo-jedcoh": conjunctionCase(
				"Der Versuch war riskant, <TARGET>jedcoh</TARGET> das Team setzte ihn fort.",
				"jedcoh",
				{
					normalizedMember: "jedoch",
					canonicalForm: "jedoch",
					orthography: "Typo",
				},
			),
			"grammar-de-cconj-accept-archaic-allein": conjunctionCase(
				"Die Mannschaft kämpfte tapfer, <TARGET>allein</TARGET> der Sieg blieb aus.",
				"allein",
				{ historicalStatus: "Archaic" },
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
