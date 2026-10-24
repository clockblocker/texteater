import type { KnowledgeCoverage } from "../src/corpus-types.js";

/**
 * The principal parts of aufpassen, a form in each dimension a German VERB
 * names.
 */
export const verbParadigm = {
	preterite: ["passte auf"],
	present1: ["passe auf"],
	present2: ["passt auf"],
	present3: ["passt auf"],
	pastParticiple: ["aufgepasst"],
	subjunctivePast: ["passte auf"],
};

/**
 * Coverage of every structural aspect a German VERB Reading's policy
 * requests, for a Knowledge of a definition and `verbParadigm`.
 */
export const verbCoverage: KnowledgeCoverage = {
	definition: "Authored",
	valency: "ReviewedEmpty",
	source: "ReviewedEmpty",
	semanticRelations: {
		synonym: "ReviewedEmpty",
		nearSynonym: "ReviewedEmpty",
		antonym: "ReviewedEmpty",
		nearAntonym: "ReviewedEmpty",
		hypernym: "ReviewedEmpty",
	},
	paradigm: {
		preterite: "Authored",
		present1: "Authored",
		present2: "Authored",
		present3: "Authored",
		pastParticiple: "Authored",
		subjunctivePast: "Authored",
	},
};
