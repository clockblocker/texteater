import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, unmarkedCoreFeatures } from "./builders";

const demonstrative = {
	...unmarkedCoreFeatures,
	pronType: "Dem" as const,
};

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-adv-dev-route-sconj-da": citationCase(
			"<TARGET>Da</TARGET> steht der Hausmeister schon vor dem Tor.",
			["Da"],
			"da",
			unmarkedCoreFeatures,
			{
				normalizedMembers: ["da"],
				explanation:
					"The authoritative ADV route and verb-second clause identify locative da, not clause-introducing SCONJ da.",
			},
		),
		"grammar-de-adv-dev-route-part-doch": citationCase(
			"Nach langem Zögern kam Leon dann <TARGET>doch</TARGET> zur Sitzung.",
			["doch"],
			"doch",
			unmarkedCoreFeatures,
			{
				explanation:
					"Target Classification fixed ADV; the contrastive adverb is not the homographic modal-particle route.",
			},
		),
		"grammar-de-adv-dev-route-adp-davor": citationCase(
			"<TARGET>Davor</TARGET> warnt die Technikerin in jedem Kurs.",
			["Davor"],
			"davor",
			demonstrative,
			{
				normalizedMembers: ["davor"],
				explanation:
					"The pronominal ADV is a complete member; do not split or reinterpret it as the ADP vor.",
			},
		),
		"grammar-de-adv-dev-route-adj-gern": citationCase(
			"Die Praktikantin hilft den Gästen <TARGET>gern</TARGET>.",
			["gern"],
			"gern",
			unmarkedCoreFeatures,
			{
				explanation:
					"The classified lexical ADV gern remains ADV; productive adverbial ADJ forms belong to their fixed ADJ route instead.",
			},
		),
		"grammar-de-adv-dev-route-paired-frame-auch": citationCase(
			"Der Jugendchor singt und tanzt <TARGET>auch</TARGET>.",
			["auch"],
			"auch",
			unmarkedCoreFeatures,
			{
				explanation:
					"The supplied target is an ordinary ADV occurrence, not a member of an upstream PairedFrame payload.",
			},
		),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
