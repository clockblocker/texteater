/** Hebrew language-owned intake, canonical resolution and Card Knowledge. */

import { accumulateHebrewTranslations } from "../knowledge/he/accumulate.js";
import { produceHebrewKnowledge } from "../knowledge/he/produce.js";
import type { LanguageModule } from "../language-module.js";
import { resolveHebrewGrammar } from "../resolve/he/grammar.js";
import { resolveHebrewReading } from "../resolve/he/reading.js";
import {
	segmentHebrewSentence,
	writtenHebrewSegments,
} from "../segment/he/segments.js";
import { segmentHebrewUnits } from "../segment/he/units.js";

export const hebrewLanguage: LanguageModule<"he"> = {
	segment: {
		segments: segmentHebrewSentence,
		writtenSegments: writtenHebrewSegments,
		units: segmentHebrewUnits,
	},
	resolveGrammar: resolveHebrewGrammar,
	resolveReading: resolveHebrewReading,
	produceKnowledge: produceHebrewKnowledge,
	accumulateTranslations: accumulateHebrewTranslations,
};
