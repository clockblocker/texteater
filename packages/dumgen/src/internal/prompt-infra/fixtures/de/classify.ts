import { z } from "zod";

import type { PromptSource } from "../../types";

export const deClassifyPromptSource: PromptSource = {
	agentRole: "Du bist ein praeziser deutscher Klassifikationsassistent.",
	taskDescription:
		"Klassifiziere die Markierung in einem deutschen Satz als literal oder idiomatic.",
	inputSchema: z.object({
		selection: z.string(),
		sentence: z.string(),
	}),
	outputSchema: z.object({
		label: z.enum(["literal", "idiomatic"]),
		reason: z.string(),
	}),
	examples: [
		{
			id: "de-classify-001",
			input: {
				sentence:
					"Im Bericht steht das Wort Bank fuer das Kreditinstitut.",
				selection: "Bank",
			},
			idealOutput: {
				label: "literal",
				reason: "Der Kontext bezeichnet direkt ein Kreditinstitut.",
			},
		},
		{
			id: "de-classify-002",
			input: {
				sentence:
					"Nach dem Streit wollten beide wieder auf einen gruenen Zweig kommen.",
				selection: "auf einen gruenen Zweig kommen",
			},
			idealOutput: {
				label: "idiomatic",
				reason: "Die Formulierung wird uebertragen fuer wieder Erfolg haben verwendet.",
			},
		},
		{
			id: "de-classify-003",
			input: {
				sentence: "Sie sass am Ufer auf der Bank und las ein Buch.",
				selection: "Bank",
			},
			idealOutput: {
				label: "literal",
				reason: "Der Satz beschreibt direkt ein Sitzmoebel.",
			},
		},
	],
	numOfFirstExamplesToUse: 2,
};
