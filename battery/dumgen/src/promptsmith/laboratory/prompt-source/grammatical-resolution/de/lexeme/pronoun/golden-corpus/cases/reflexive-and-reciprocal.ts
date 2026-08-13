import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { citationCase, core, inflectionCase } from "./builders";

export const reflexiveAndReciprocalCases = defineGoldenCaseCollection(
	import.meta.url,
	{
		cases: {
			"grammar-de-pron-demo-reflexive-sich": inflectionCase(
				"Nach dem Training wäscht Lea <TARGET>sich</TARGET> die Hände.",
				"sich",
				"sich",
				{ case: "Dat", gender: null, number: null, reflex: "Yes" },
				{
					coreFeatures: core("Prs", { person: "3" }),
					explanation: "Reflexive possessor. Dative form sich.",
				},
			),
			"grammar-de-pron-dev-reflexive-mich": inflectionCase(
				"Vor dem Spiegel kämme ich <TARGET>mich</TARGET> sorgfältig.",
				"mich",
				"ich",
				{ case: "Acc", gender: null, number: "Sing", reflex: "Yes" },
				{ coreFeatures: core("Prs", { person: "1" }) },
			),
			"grammar-de-pron-dev-nonreflexive-mich": inflectionCase(
				"Die Ärztin untersucht <TARGET>mich</TARGET> am Montag.",
				"mich",
				"ich",
				{ case: "Acc", gender: null, number: "Sing", reflex: null },
				{ coreFeatures: core("Prs", { person: "1" }) },
			),
			"grammar-de-pron-dev-reciprocal-einander": citationCase(
				"Nach dem Streit hörten die beiden <TARGET>einander</TARGET> wieder zu.",
				"einander",
				"einander",
				{
					coreFeatures: core("Rcp"),
					explanation: "Invariant reciprocal. Citation Surface.",
				},
			),
			"grammar-de-pron-dev-inherent-reflexive-sich": inflectionCase(
				"Mara schämt <TARGET>sich</TARGET> für den Irrtum.",
				"sich",
				"sich",
				{ case: "Acc", gender: null, number: null, reflex: "Yes" },
				{
					coreFeatures: core("Prs", { person: "3" }),
					explanation: "VERB selects it. Target still PRON only.",
				},
			),
			"grammar-de-pron-accept-v4-reflexive-euch-acc": inflectionCase(
				"Vor dem Wettkampf wärmt <TARGET>euch</TARGET> gründlich auf.",
				"euch",
				"ihr",
				{ case: "Acc", gender: null, number: "Plur", reflex: "Yes" },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Infm",
					}),
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
