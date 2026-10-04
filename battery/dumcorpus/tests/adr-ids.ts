import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AdrIds } from "../src/check-citations.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Reads every ADR id in the repository: `docs/adr/` as `ADR-NNNN`, and each
 * app's or battery's `docs/adr/` as `<name>/ADR-NNNN`. `check:docs` keeps
 * every ADR accepted, so an id that exists is current.
 */
export function readRepositoryAdrIds(): AdrIds {
	const ids = new Set<string>();
	const read = (directory: string, prefix: string) => {
		let files: string[];
		try {
			files = readdirSync(directory);
		} catch {
			return;
		}
		for (const file of files) {
			const number = /^(\d{4})-.+\.md$/u.exec(file)?.[1];
			if (number) ids.add(`${prefix}ADR-${number}`);
		}
	};
	read(join(repositoryRoot, "docs/adr"), "");
	for (const area of ["app", "battery"])
		for (const name of readdirSync(join(repositoryRoot, area)))
			read(join(repositoryRoot, area, name, "docs/adr"), `${name}/`);
	return ids;
}
