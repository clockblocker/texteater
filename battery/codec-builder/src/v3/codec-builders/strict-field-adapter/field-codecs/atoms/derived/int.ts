import { reverseCodecDirections } from "../../../helpers/casters/reverse-codec-directions";
import { intAndNumber } from "../core-non-nullable-codecs/int-and-number";

export const numberAndInt = reverseCodecDirections(intAndNumber);
