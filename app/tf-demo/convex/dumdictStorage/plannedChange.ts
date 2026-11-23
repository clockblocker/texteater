import {
	ParsingError,
	type PlannedChangeOp,
	parseAsPlannedChangeOp,
} from "dumdict/planning";
import type * as Dumling from "dumling/types";
import { SUPPORTED_TARGET_LANGUAGE_VALUES } from "../../shared/supported-target-language";

type PlannedChange = PlannedChangeOp<Dumling.Language>;

/**
 * Parses one planned change at the write boundary. The Convex schema stores
 * Dumdict payloads as `v.any()`, so this is where they become typed; every
 * step after it reads the typed union.
 */
export function parsePlannedChange(value: unknown): PlannedChange {
	const outcomes = SUPPORTED_TARGET_LANGUAGE_VALUES.map((language) =>
		parseAsPlannedChangeOp(value, language),
	);
	for (const parsed of outcomes)
		if (!(parsed instanceof ParsingError)) return parsed;
	throw outcomes[0];
}
