import { z } from "zod/v4";

export const yesNoAndBoolean = z.invertCodec(
	z.stringbool({
		truthy: ["Yes"],
		falsy: ["No"],
		case: "sensitive",
	}),
);
