import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { formatTypeScript } from "../../dumrel/codegen/format-typescript.js";
import { authoredMembers } from "../src/concrete-lang/de/authored-closed-sets/inventory.js";
import type { AuthoredMember } from "../src/concrete-lang/de/authored-closed-sets/member.js";
import { validateAuthoredCatalog } from "./validate-authored-catalog.js";

/** Preserve inventory order and member identity; grouping is derived from validated coordinates. */
export async function generateAuthoredCatalog(check: boolean): Promise<void> {
	validateAuthoredCatalog(authoredMembers);
	const membersDirectory = new URL(
		"../src/concrete-lang/de/authored-closed-sets/members/",
		import.meta.url,
	);
	const locations = new Map<AuthoredMember, string>();
	for (const relative of (
		await readdir(membersDirectory, { recursive: true })
	)
		.filter((p) => p.endsWith(".ts"))
		.sort()) {
		const { member } = await import(
			fileURLToPath(new URL(relative, membersDirectory))
		);
		if (!authoredMembers.includes(member))
			throw new Error(
				`Authored member is missing from the inventory: ${relative}`,
			);
		if (locations.has(member))
			throw new Error(`Duplicate authored member module: ${relative}`);
		locations.set(member, relative.replace(/\.ts$/, ".js"));
	}
	if (locations.size !== authoredMembers.length)
		throw new Error(
			"Authored inventory must list every member exactly once",
		);
	const groups = new Map<string, AuthoredMember[]>();
	for (const member of authoredMembers) {
		const { language, family, kind } = member.lemma;
		const route = `${language}/${family}/${kind}`;
		if (!/^[a-zA-Z0-9]+\/[a-zA-Z0-9]+\/[a-zA-Z0-9]+$/.test(route))
			throw new Error(`Invalid catalog route: ${route}`);
		groups.set(route, [...(groups.get(route) ?? []), member]);
	}
	const outputs: Record<string, string> = {};
	for (const [route, members] of [...groups].sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		outputs[`catalog/${route.replaceAll("/", "-")}.ts`] =
			"// Generated authored catalog group. Run bun run generate.\n" +
			members
				.map(
					(member, i) =>
						`import {member as m${i}} from ${JSON.stringify(`../../concrete-lang/de/authored-closed-sets/members/${locations.get(member)}`)};`,
				)
				.join("\n") +
			`\nexport const members = [${members.map((_, i) => `m${i}`).join(",")}];\n`;
	}
	outputs["catalog.ts"] =
		`// Generated private catalog loader. Run bun run generate.
import type * as Dumling from "dumling/types";
import type {AuthoredMember} from "../concrete-lang/de/authored-closed-sets/member.js";
const loaded = new Map<string, readonly AuthoredMember[]>();
const empty: readonly AuthoredMember[] = [];
/** Literal requires are bundled into synchronous, memoized module initializers. */
export function membersFor(lemma: Dumling.Lemma): readonly AuthoredMember[] {
 const route=\`\${lemma.language}/\${lemma.family}/\${lemma.kind}\`;
 const cached=loaded.get(route);if(cached)return cached;
 let members: readonly AuthoredMember[];
 switch(route){
 ${[...groups.keys()]
		.sort()
		.map(
			(route) =>
				`case ${JSON.stringify(route)}: members=require(${JSON.stringify(`./catalog/${route.replaceAll("/", "-")}.js`)}).members;break;`,
		)
		.join("\n")}
 default:return empty;
 }
 loaded.set(route,members);return members;
}
/** Private loading diagnostics; not a package-root export. */
export const catalogState=()=>({groups:[...loaded.keys()],members:[...loaded.values()].reduce((n,m)=>n+m.length,0)});
`;
	const directory = new URL("../src/generated/", import.meta.url);
	const groupDirectory = new URL("catalog/", directory);
	for (const name of await readdir(groupDirectory).catch(() => [])) {
		if (Object.hasOwn(outputs, `catalog/${name}`)) continue;
		if (check) throw new Error(`Obsolete catalog group: ${name}`);
		await rm(new URL(name, groupDirectory));
	}
	for (const [name, source] of Object.entries(outputs)) {
		const path = new URL(name, directory);
		const formatted = await formatTypeScript(source, path);
		if (check) {
			if ((await readFile(path, "utf8").catch(() => "")) !== formatted)
				throw new Error(
					`Stale catalog artifact: ${name}; run bun run generate`,
				);
		} else {
			await mkdir(new URL(".", path), { recursive: true });
			await writeFile(path, formatted);
		}
	}
}

if (import.meta.main)
	await generateAuthoredCatalog(process.argv.includes("--check"));
