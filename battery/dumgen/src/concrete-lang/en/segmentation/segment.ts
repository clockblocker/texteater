import { segmentLatin } from "../../../universal/latin-segmentation.js";
export const segmentEnglish = (text: string) => segmentLatin(text, "en");
