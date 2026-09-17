import { segmentLatin } from "../../../universal/latin-segmentation.js";
export const segmentGerman = (text: string) => segmentLatin(text, "de");
