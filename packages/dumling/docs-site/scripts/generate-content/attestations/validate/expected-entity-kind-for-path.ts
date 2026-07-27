import { relative } from "node:path";
import type { EntityKind } from "../../../../../src/types/public-types.ts";
import { sourceAttestationsDir } from "../../shared/paths";

export function expectedEntityKindForPath(
	sourcePath: string,
): EntityKind | undefined {
	const [, kindDirectory] = relative(sourceAttestationsDir, sourcePath).split(
		/[\\/]/u,
	);
	if (kindDirectory === "lemma") {
		return "Lemma";
	}
	if (kindDirectory === "surface") {
		return "Surface";
	}
	if (kindDirectory === "selection") {
		return "Selection";
	}
	return undefined;
}
