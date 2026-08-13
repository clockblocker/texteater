import { defineGoldenCorpus } from "../../../../../../../assembly";
import { inputSchema, outputSchema } from "../schemas";
import { agreementAndPositionCases } from "./cases/agreement-and-position";
import { classifiedBoundaryCases } from "./cases/boundaries";
import { comparisonCases } from "./cases/comparison";
import { featurePolicyCases } from "./cases/feature-policy";
import { orthographyCases } from "./cases/orthography";
import { surfaceKindCases } from "./cases/surface-kinds";

export const corpus = defineGoldenCorpus({
	route: "grammatical-resolution/de/lexeme/adjective",
	inputSchema,
	outputSchema,
	collections: {
		surfaceKinds: surfaceKindCases,
		agreementAndPosition: agreementAndPositionCases,
		comparison: comparisonCases,
		orthography: orthographyCases,
		classifiedBoundaries: classifiedBoundaryCases,
		featurePolicy: featurePolicyCases,
	},
	fingerprintInput(input) {
		return JSON.stringify({
			markedContext: input.markedContext
				.normalize("NFC")
				.replaceAll(/\s+/gu, " ")
				.trim()
				.toLocaleLowerCase("de"),
			members: input.members.map((member) =>
				member.normalize("NFC").toLocaleLowerCase("de"),
			),
		});
	},
});
