/**
 * German's language module (#772): the Segment and unit stages with
 * production's setting (`productionUnitSettings`), the Breakdown
 * segmenters (`segment/de/breakdown/`), the German body of
 * `resolve.grammar`, that of `knowledge.produce` and that of
 * `knowledge.accumulateTranslations`.
 */
import { accumulateGermanTranslations } from "../knowledge/de/accumulate.js";
import { produceGermanKnowledge } from "../knowledge/de/produce.js";
import type { LanguageModule } from "../language-module.js";
import type { LanguageOptions } from "../languages.js";
import { resolveGermanGrammar } from "../resolve/de/grammar.js";
import { germanConstituents } from "../segment/de/breakdown/constituents.js";
import { germanMorphemes } from "../segment/de/breakdown/morphemes.js";
import {
	segmentGermanSentence,
	writtenGermanSegments,
} from "../segment/de/segments.js";
import {
	productionUnitSettings,
	segmentGermanUnits,
} from "../segment/de/units.js";

export function germanLanguage(options: LanguageOptions): LanguageModule {
	const settings =
		options.inventory === undefined
			? productionUnitSettings
			: { ...productionUnitSettings, inventory: options.inventory };
	return {
		segment: {
			segments: segmentGermanSentence,
			writtenSegments: writtenGermanSegments,
			units: (segmentation, ask) =>
				segmentGermanUnits(segmentation, ask, settings),
			constituents: germanConstituents,
			morphemes: germanMorphemes,
		},
		resolveGrammar: resolveGermanGrammar,
		produceKnowledge: produceGermanKnowledge,
		accumulateTranslations: accumulateGermanTranslations,
	};
}
