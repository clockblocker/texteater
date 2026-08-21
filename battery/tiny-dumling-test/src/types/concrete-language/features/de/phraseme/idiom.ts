import type { DeVerbalInflectionalFeatures } from "../lexeme/verb.js";

export type DeIdiomPhrasemeFeatures = {
	core: Record<never, never>;
	inflectional: DeVerbalInflectionalFeatures;
};
