import type { EnabledSegmentationLanguage } from "../types";
import type { SourceSegmenter } from "./contracts";
import { segmentGerman } from "./de";
import { segmentHebrew } from "./he";

const routes = Object.freeze({
	de: segmentGerman,
	he: segmentHebrew,
}) satisfies Readonly<Record<EnabledSegmentationLanguage, SourceSegmenter>>;

export function segmentSource(
	language: EnabledSegmentationLanguage,
	stitchedText: string,
) {
	return routes[language](stitchedText);
}
