import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { nounInflection } from "./builders";

export const boundaryCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-noun-demo-suspended-kinderbuecher": nounInflection({
			markedContext:
				"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher.",
			members: ["Kinder-"],
			normalizedMembers: ["Kinderbücher"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Acc",
			number: "Plur",
			explanation:
				"Ergänzungsstrich points to shared Bücher; one member stays Standard and Full.",
		}),
		"grammar-de-noun-dev-suspended-right-jugendbuecher": nounInflection({
			markedContext:
				"Sie verkauft Kinder- und <TARGET>Jugendbücher</TARGET>.",
			members: ["Jugendbücher"],
			canonicalForm: "Jugendbuch",
			gender: "Neut",
			case: "Acc",
			number: "Plur",
		}),
		"grammar-de-noun-dev-suspended-hyphen-genitiv": nounInflection({
			markedContext:
				"Die Seiten des <TARGET>Kinder‐</TARGET> und Jugendbuchs fehlen.",
			members: ["Kinder‐"],
			normalizedMembers: ["Kinderbuchs"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Gen",
			number: "Sing",
		}),
		"grammar-de-noun-dev-suspended-typo": nounInflection({
			markedContext:
				"Sie verkauft <TARGET>Kidner-</TARGET> und Jugendbücher.",
			members: ["Kidner-"],
			normalizedMembers: ["Kinderbücher"],
			memberOrthographies: ["Typo"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Acc",
			number: "Plur",
		}),
		"grammar-de-noun-accept-suspended-nonbreaking": nounInflection({
			markedContext:
				"Der Laden führt <TARGET>Kinder‑</TARGET> und Jugendbücher.",
			members: ["Kinder‑"],
			normalizedMembers: ["Kinderbücher"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Acc",
			number: "Plur",
		}),
		"grammar-de-noun-accept-suspended-oder-singular": nounInflection({
			markedContext:
				"Sie kauft ein <TARGET>Kinder-</TARGET> oder Jugendbuch.",
			members: ["Kinder-"],
			normalizedMembers: ["Kinderbuch"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Acc",
			number: "Sing",
		}),
		"grammar-de-noun-accept-suspended-dativ-plural": nounInflection({
			markedContext:
				"Mit <TARGET>Kinder-</TARGET> und Jugendbüchern kennt sie sich aus.",
			members: ["Kinder-"],
			normalizedMembers: ["Kinderbüchern"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Dat",
			number: "Plur",
		}),
		"grammar-de-noun-accept-suspended-nominativ-plural": nounInflection({
			markedContext:
				"<TARGET>Kinder-</TARGET> und Jugendbücher sind beliebt.",
			members: ["Kinder-"],
			normalizedMembers: ["Kinderbücher"],
			canonicalForm: "Kinderbuch",
			gender: "Neut",
			case: "Nom",
			number: "Plur",
		}),
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
