import {
	germanKnowledgeAnalysisSchemaForFamily,
	germanKnowledgeGenerationInputSchemaForFamily,
} from "../../../../../../knowledge-generation/de/schemas";
import {
	assertCaseSelectionsUncontaminated,
	defineGoldenCaseCollection,
	defineGoldenCorpus,
} from "../../../../../assembly";
import {
	goldenCasesFor,
	retainedCasesForFamily,
} from "../../retained-partition";

const family = "Morpheme" as const;
const retained = retainedCasesForFamily(family);

// The thin Morpheme route owns base leaves only, so its corpus is minimal:
// one demonstration teaching the shape, with no development or acceptance
// relation corpus.
const demonstrations = defineGoldenCaseCollection(import.meta.url, {
	cases: goldenCasesFor(retained.demonstrations),
});

const development = defineGoldenCaseCollection(import.meta.url, {
	cases: {},
});

const acceptance = defineGoldenCaseCollection(import.meta.url, {
	cases: {},
});

export const corpus = defineGoldenCorpus({
	route: "knowledge-analysis/de/morpheme",
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
