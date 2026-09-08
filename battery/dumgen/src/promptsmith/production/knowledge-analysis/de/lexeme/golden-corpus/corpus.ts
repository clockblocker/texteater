import {
	germanKnowledgeAnalysisSchemaForFamily,
	germanKnowledgeGenerationInputSchemaForFamily,
} from "../../../../../../knowledge-generation/de/schemas";
import {
	assertCaseSelectionsUncontaminated,
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
} from "../../../../../assembly";
import { sealUntouchedAcceptanceReservation } from "../../acceptance-reservation";
import { relationCorpusAdjudications } from "../../retained-cases";
import {
	goldenCasesFor,
	retainedCasesForFamily,
} from "../../retained-partition";

const family = "Lexeme" as const;
const retained = retainedCasesForFamily(family);

const demonstrations = defineGoldenCaseCollection(import.meta.url, {
	cases: goldenCasesFor(retained.demonstrations),
});

const development = defineGoldenCaseCollection(import.meta.url, {
	groups: {
		basic: defineGoldenCaseGroup(goldenCasesFor(retained.basic)),
		adversarial: defineGoldenCaseGroup(
			goldenCasesFor(retained.adversarial),
		),
	},
	cases: {},
});

// The provider-untouched reservation is review-inaccessible until the human
// gate records approval. Its committed selection must never join a prompt.
const acceptance = defineGoldenCaseCollection(import.meta.url, {
	cases: goldenCasesFor(retained.acceptance),
});

export const corpus = defineGoldenCorpus({
	route: "knowledge-analysis/de/lexeme",
	inputSchema: germanKnowledgeGenerationInputSchemaForFamily(family),
	outputSchema: germanKnowledgeAnalysisSchemaForFamily(family),
	collections: { demonstrations, development, acceptance },
});

assertCaseSelectionsUncontaminated({
	route: corpus.route,
	demonstrations: corpus.collections.demonstrations.union(
		corpus.collections.development,
	),
	evaluation: corpus.collections.acceptance,
});

export const untouchedAcceptanceReservation =
	sealUntouchedAcceptanceReservation(corpus.collections.acceptance);

export { relationCorpusAdjudications };
