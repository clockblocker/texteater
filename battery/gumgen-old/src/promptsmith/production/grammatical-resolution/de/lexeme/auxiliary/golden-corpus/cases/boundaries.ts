import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { finiteCase } from "./builders";

export const classifiedContrastCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-aux-dev-contrast-modal-mag": finiteCase(
				"Sie mag Schokolade, aber heute <TARGET>mag</TARGET> sie lieber kochen.",
				"mag",
				"mögen",
				"Mod",
				{
					mood: "Ind",
					number: "Sing",
					person: "3",
					tense: "Pres",
					voice: null,
				},
				{
					explanation:
						"Marked use governs infinitive and is fixed AUX. Earlier nominal-object use stays unmarked lexical contrast.",
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
