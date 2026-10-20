/** Hebrew registers only intake segmentation. Resolution and Knowledge remain
 * unavailable until their real language implementations exist. */
import type { LanguageModule } from "../language-module.js";
import {
	segmentHebrewSentence,
	writtenHebrewSegments,
} from "../segment/he/segments.js";
import { segmentHebrewUnits } from "../segment/he/units.js";

export const hebrewLanguage: LanguageModule = {
	segment: {
		segments: segmentHebrewSentence,
		writtenSegments: writtenHebrewSegments,
		units: segmentHebrewUnits,
	},
};
