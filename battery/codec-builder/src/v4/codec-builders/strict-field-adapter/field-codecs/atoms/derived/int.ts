import { z } from "zod/v4";
import { intAndNumber } from "../core-non-nullable-codecs/int-and-number";

export const numberAndInt = z.invertCodec(intAndNumber);
