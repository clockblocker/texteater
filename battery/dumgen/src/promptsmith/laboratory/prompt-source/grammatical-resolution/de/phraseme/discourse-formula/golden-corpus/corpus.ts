import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { boundaryCases } from "./cases/boundaries";
import { formulaCases } from "./cases/formulas";
import { orthographyCases } from "./cases/orthography";
import { roleAmbiguityAndBoundaryCases } from "./cases/role-ambiguity-and-boundaries";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/phraseme/discourse-formula",
	inputSchema,
	outputSchema,
	collections: {
		formulas: formulaCases,
		orthography: orthographyCases,
		boundaries: boundaryCases,
		roleAmbiguityAndBoundaries: roleAmbiguityAndBoundaryCases,
	},
	fingerprintInput(input) {
		return input.markedContext
			.normalize("NFC")
			.replaceAll(/\s+/gu, " ")
			.trim()
			.toLocaleLowerCase("de");
	},
});
