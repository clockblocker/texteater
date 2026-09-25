import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AdrStatuses } from "../src/check-citations.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));

/**
 * Reads every ADR's frontmatter status from the repository: `docs/adr/` as
 * `ADR-NNNN`, and each app's or battery's `docs/adr/` as `<name>/ADR-NNNN`.
 * An ADR without frontmatter predates it and counts as accepted.
 */
export function readRepositoryAdrStatuses(): AdrStatuses {
	const statuses = new Map<string, string>();
	const read = (directory: string, prefix: string) => {
		let files: string[];
		try {
			files = readdirSync(directory);
		} catch {
			return;
		}
		for (const file of files) {
			const number = /^(\d{4})-.+\.md$/u.exec(file)?.[1];
			if (!number) continue;
			const text = readFileSync(join(directory, file), "utf8");
			const status =
				/^---\n(?:.*\n)*?status: (.+)\n(?:.*\n)*?---\n/u.exec(
					text,
				)?.[1];
			statuses.set(
				`${prefix}ADR-${number}`,
				status?.trim() ?? "accepted",
			);
		}
	};
	read(join(repositoryRoot, "docs/adr"), "");
	for (const area of ["app", "battery"])
		for (const name of readdirSync(join(repositoryRoot, area)))
			read(join(repositoryRoot, area, name, "docs/adr"), `${name}/`);
	return statuses;
}
