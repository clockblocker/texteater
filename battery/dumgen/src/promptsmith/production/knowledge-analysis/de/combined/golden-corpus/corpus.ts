import {
	assertCaseSelectionsUncontaminated,
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
} from "../../../../../assembly";
import {
	acceptanceCases,
	adversarialCases,
	basicCases,
	demonstrationCases,
	relationCorpusAdjudications,
} from "./retained-cases";

const demonstrations = defineGoldenCaseCollection(import.meta.url, {
	cases: demonstrationCases,
});

const development = defineGoldenCaseCollection(import.meta.url, {
	groups: {
		basic: defineGoldenCaseGroup(basicCases),
		adversarial: defineGoldenCaseGroup(adversarialCases),
	},
	cases: {},
});

// The provider-untouched reservation is review-inaccessible until the human
// gate records approval. Its committed selection must never join a prompt.
const acceptance = defineGoldenCaseCollection(import.meta.url, {
	cases: acceptanceCases,
});

export const corpus = defineGoldenCorpus({
	route: "knowledge-analysis/de/combined",
	inputSchema: relationCorpusAdjudications.inputSchema,
	outputSchema: relationCorpusAdjudications.outputSchema,
	collections: { demonstrations, development, acceptance },
});

assertCaseSelectionsUncontaminated({
	route: corpus.route,
	demonstrations: corpus.collections.demonstrations.union(
		corpus.collections.development,
	),
	evaluation: corpus.collections.acceptance,
});

export const untouchedAcceptanceReservation = Object.freeze({
	status: "sealed-pending-human-approval" as const,
	approvedByHuman: false,
	revealedCaseCount: 0,
	reservedCaseCount: corpus.collections.acceptance.ids.length,
	selectionCommitmentSha256:
		"56fd828f15f74f45a481e34597e6d752c6652056e5679fa794e07a05c6da2d93",
	selection: corpus.collections.acceptance,
	gate: "At least one human must approve the untouched reservation before its cases are materialized into an acceptance plan or sent to a provider.",
});

export { relationCorpusAdjudications } from "./retained-cases";
