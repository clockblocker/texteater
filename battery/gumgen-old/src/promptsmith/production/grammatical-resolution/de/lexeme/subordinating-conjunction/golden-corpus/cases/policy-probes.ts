import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { subordinatingConjunctionCase } from "./builders";

export const policyProbeCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-sconj-demo-typo-obwol": subordinatingConjunctionCase(
			"Sie ging weiter, <TARGET>obwol</TARGET> sie müde war.",
			["obwol"],
			"obwohl",
			undefined,
			{
				normalizedMembers: ["obwohl"],
				orthographies: ["Typo"],
			},
		),
		"grammar-de-sconj-demo-historical-dass": subordinatingConjunctionCase(
			"Im Brief von 1880 schrieb sie, <TARGET>daß</TARGET> alles bereit sei.",
			["daß"],
			"dass",
			undefined,
			{
				historicalStatus: "Archaic",
				spelling: "Variant",
			},
		),
		"grammar-de-sconj-demo-multiword-so-dass": subordinatingConjunctionCase(
			"Es schneite stark, <TARGET>so</TARGET> <TARGET>dass</TARGET> die Straße gesperrt wurde.",
			["so", "dass"],
			"so dass",
		),

		"grammar-de-sconj-dev-multiword-als-ob": subordinatingConjunctionCase(
			"Er tat, <TARGET>als</TARGET> <TARGET>ob</TARGET> er die Nachricht nicht gehört hätte.",
			["als", "ob"],
			"als ob",
			"Comp",
		),
		"grammar-de-sconj-dev-variant-sodass": subordinatingConjunctionCase(
			"Die Tür klemmte, <TARGET>so</TARGET> <TARGET>dass</TARGET> wir warten mussten.",
			["so", "dass"],
			"so dass",
		),

		"grammar-de-sconj-accept-multiword-ohne-dass":
			subordinatingConjunctionCase(
				"Sie ging, <TARGET>ohne</TARGET> <TARGET>dass</TARGET> jemand es bemerkte.",
				["ohne", "dass"],
				"ohne dass",
			),
		"grammar-de-sconj-accept-typo-wehn": subordinatingConjunctionCase(
			"Ruf an, <TARGET>wehn</TARGET> du angekommen bist.",
			["wehn"],
			"wenn",
			undefined,
			{
				normalizedMembers: ["wenn"],
				orthographies: ["Typo"],
			},
		),
		"grammar-de-sconj-accept-archaic-sintemal":
			subordinatingConjunctionCase(
				"Der Chronist schwieg, <TARGET>sintemal</TARGET> ihm niemand Glauben schenkte.",
				["sintemal"],
				"sintemal",
				undefined,
				{ historicalStatus: "Archaic" },
			),
		"grammar-de-sconj-accept-variant-obzwar": subordinatingConjunctionCase(
			"Sie blieb höflich, <TARGET>obzwar</TARGET> sie den Einwand ablehnte.",
			["obzwar"],
			"obzwar",
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
