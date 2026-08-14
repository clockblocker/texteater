import { defineGoldenCorpus } from "../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { frameCases } from "./cases/frames";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/construction/paired-frame",
	inputSchema,
	outputSchema,
	collections: {
		frames: frameCases,
		boundaries: boundaryCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
