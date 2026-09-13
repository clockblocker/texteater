import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../assembly";
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
					coreFeatures: core("Prs", {
						person: "3",
						referenceNumber: null,
					}),
					explanation: "Reflexive possessor. Dative form sich.",
				},
			),
			"grammar-de-pron-dev-reflexive-mich": inflectionCase(
				"Vor dem Spiegel kämme ich <TARGET>mich</TARGET> sorgfältig.",
				"mich",
				"mich",
				{ case: "Acc", gender: null, number: "Sing", reflex: "Yes" },
				{
					coreFeatures: core("Prs", {
						person: "1",
						referenceNumber: "Sing",
					}),
				},
			),
			"grammar-de-pron-dev-nonreflexive-mich": inflectionCase(
				"Die Ärztin untersucht <TARGET>mich</TARGET> am Montag.",
				"mich",
				"mich",
				{ case: "Acc", gender: null, number: "Sing", reflex: null },
				{
					coreFeatures: core("Prs", {
						person: "1",
						referenceNumber: "Sing",
					}),
				},
			),
			"grammar-de-pron-fixed-reflexive-dich": inflectionCase(
				"Nach dem Lauf wäschst du <TARGET>dich</TARGET> gründlich.",
				"dich",
				"dich",
				{ case: "Acc", gender: null, number: "Sing", reflex: "Yes" },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Infm",
						referenceNumber: "Sing",
					}),
				},
			),
			"grammar-de-pron-fixed-reflexive-uns": inflectionCase(
				"Vor dem Foto stellen wir <TARGET>uns</TARGET> nebeneinander.",
				"uns",
				"uns",
				{ case: "Acc", gender: null, number: "Plur", reflex: "Yes" },
				{
					coreFeatures: core("Prs", {
						person: "1",
						referenceNumber: "Plur",
					}),
				},
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
					coreFeatures: core("Prs", {
						person: "3",
						referenceNumber: null,
					}),
					explanation: "VERB selects it. Target still PRON only.",
				},
			),
			"grammar-de-pron-accept-v4-reflexive-euch-acc": inflectionCase(
				"Vor dem Wettkampf wärmt <TARGET>euch</TARGET> gründlich auf.",
				"euch",
				"euch",
				{ case: "Acc", gender: null, number: "Plur", reflex: "Yes" },
				{
					coreFeatures: core("Prs", {
						person: "2",
						polite: "Infm",
						referenceNumber: "Plur",
					}),
				},
			),
		} as const satisfies GoldenCaseRegistry<
			typeof inputSchema,
			typeof outputSchema
		>,
	},
);
