import { segmentLatin } from "../../../universal/latin-segmentation.js";
import { englishFusionTable } from "../fusion-entries.js";
export const segmentEnglish = (text: string) =>
	segmentLatin(text, "en", englishFusionTable);
