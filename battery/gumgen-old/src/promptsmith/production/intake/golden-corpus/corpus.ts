import { defineGoldenCorpus } from "../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { core } from "./cases/core";

export const corpus = defineGoldenCorpus({
	route: "intake",
	inputSchema,
	outputSchema,
	collections: { core },
});
