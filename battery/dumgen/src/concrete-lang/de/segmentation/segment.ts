import { segmentLatin } from "../../../universal/latin-segmentation.js";
import { germanFusionTable } from "../fusion-entries.js";
export const segmentGerman = (text: string) =>
	segmentLatin(text, "de", germanFusionTable);
