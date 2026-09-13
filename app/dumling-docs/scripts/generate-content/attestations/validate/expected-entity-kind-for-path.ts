import { relative } from "node:path";
import type * as Dumling from "dumling/types";

import { sourceAttestationsDir } from "../../shared/paths";

export function expectedEntityKindForPath(
	sourcePath: string,
): Dumling.UnitKind | undefined {
	const [, kindDirectory] = relative(sourceAttestationsDir, sourcePath).split(
		/[\\/]/u,
	);
	if (kindDirectory === "lemma") {
		return "Lemma";
	}
	if (kindDirectory === "surface") {
		return "Surface";
	}
	if (kindDirectory === "attestation") {
		return "Attestation";
	}
	return undefined;
}
