import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, unmarkedCoreFeatures } from "./builders";

export const fixedMultiMemberCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-adv-demo-einerseits-andererseits": citationCase(
				"Der Plan ist <TARGET>einerseits</TARGET> günstig, <TARGET>andererseits</TARGET> riskant.",
				["einerseits", "andererseits"],
				"einerseits … andererseits",
				unmarkedCoreFeatures,
				{
					explanation:
						"Both correlating anchors are ordered members of one invariant ADV Lexeme; adjective predicates remain unmarked.",
				},
			),

			"grammar-de-adv-dev-teils-teils": citationCase(
				"Die Antworten waren <TARGET>teils</TARGET> hilfreich, <TARGET>teils</TARGET> widersprüchlich.",
				["teils", "teils"],
				"teils … teils",
				unmarkedCoreFeatures,
				{
					explanation:
						"The repeated spelling marks two separate anchor occurrences in source order.",
				},
			),
			"grammar-de-adv-dev-andererseits-typo": citationCase(
				"Die Lösung ist <TARGET>einerseits</TARGET> schnell, <TARGET>anderrerseits</TARGET> aber teuer.",
				["einerseits", "anderrerseits"],
				"einerseits … andererseits",
				unmarkedCoreFeatures,
				{
					normalizedMembers: ["einerseits", "andererseits"],
					orthographies: ["Standard", "Typo"],
				},
			),

			"grammar-de-adv-accept-einerseits-andererseits": citationCase(
				"Die Wohnung liegt <TARGET>einerseits</TARGET> zentral, <TARGET>andererseits</TARGET> ist sie sehr laut.",
				["einerseits", "andererseits"],
				"einerseits … andererseits",
			),
			"grammar-de-adv-accept-teils-teils": citationCase(
				"Der Weg führte <TARGET>teils</TARGET> durch Wald, <TARGET>teils</TARGET> über offene Felder.",
				["teils", "teils"],
				"teils … teils",
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
