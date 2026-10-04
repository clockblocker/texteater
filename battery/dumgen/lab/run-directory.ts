import { fileURLToPath } from "node:url";

/**
 * Where the evaluation CLIs write their Promptsmith runs by default: the
 * untracked `.runs/dumgen/` at the repository root. A caller can always
 * supply a different output directory.
 */
export const defaultRunOutputDirectory = fileURLToPath(
	new URL("../../../.runs/dumgen/", import.meta.url),
);
