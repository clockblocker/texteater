import type { DeVerbalInflectionalFeatures } from "../lexeme/verb.js";

export type DeCollocationPhrasemeFeatures = {
	core: Record<never, never>;
	inflectional: DeVerbalInflectionalFeatures;
};
