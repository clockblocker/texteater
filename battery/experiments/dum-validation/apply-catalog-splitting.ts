import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const catalogSelector =
	"battery/dumgen/src/concrete-lang/de/authored-closed-sets/select.ts";

/** Keep authoring inventory/build validation intact; defer runtime group initialization. */
export async function applyCatalogSplitting(root: string) {
	const directory = join(
		root,
		"battery/dumgen/src/concrete-lang/de/authored-closed-sets",
	);
	const inventory = await readFile(join(directory, "inventory.ts"), "utf8");
	const imports = new Map(
		[
			...inventory.matchAll(
				/import \{ member as (\w+) \} from "([^"]+)";/g,
			),
		].map((m) => [m[1]!, m[2]!]),
	);
	const array = inventory.slice(
		inventory.indexOf("export const authoredMembers"),
	);
	const names = [...array.matchAll(/\bm\d+\b/g)].map((m) => m[0]);
	if (names.length !== imports.size)
		throw new Error("Catalog inventory layout changed");
	const groups = new Map<string, string[]>();
	for (const name of names) {
		const path = imports.get(name)!;
		const group = /\/auxiliary\//.test(path)
			? "AUX"
			: /\/determiner\//.test(path)
				? "DET"
				: /\/pronoun\//.test(path)
					? "PRON"
					: undefined;
		if (!group) throw new Error(`Unclassified authored member: ${path}`);
		groups.set(group, [...(groups.get(group) ?? []), name]);
	}
	for (const [group, members] of groups) {
		await writeFile(
			join(directory, `experiment-catalog-${group}.ts`),
			members
				.map(
					(name) =>
						`import {member as ${name}} from ${JSON.stringify(imports.get(name))};`,
				)
				.join("\n") +
				`\nexport const members = [${members.join(",")}];\n`,
		);
	}
	await writeFile(
		join(directory, "experiment-catalog-loader.ts"),
		`
import type * as Dumling from "dumling/types";
import type {AuthoredMember} from "./member.js";
const loaded = new Map<string,readonly AuthoredMember[]>();
const empty: readonly AuthoredMember[] = [];
/** Literal requires become memoized lazy module initializers in the ESM bundle. */
export function membersFor(lemma: Dumling.Lemma): readonly AuthoredMember[] {
 if(lemma.language!=="de" || lemma.family!=="Lexeme")return empty;
 const cached=loaded.get(lemma.kind);if(cached)return cached;
 let members: readonly AuthoredMember[];
 switch(lemma.kind){
 ${[...groups.keys()].map((group) => `case ${JSON.stringify(group)}: members=require("./experiment-catalog-${group}.js").members;break;`).join("\n")}
 default:return empty;
 }
 loaded.set(lemma.kind,members);return members;
}
export const catalogState=()=>({groups:[...loaded.keys()],members:[...loaded.values()].reduce((n,a)=>n+a.length,0)});
`,
	);
	const path = join(root, catalogSelector);
	const source = await readFile(path, "utf8");
	if (!source.includes('import { authoredMembers } from "./inventory.js";'))
		throw new Error("Catalog selector drift");
	await writeFile(
		path,
		source
			.replace(
				'import { authoredMembers } from "./inventory.js";',
				'import { membersFor } from "./experiment-catalog-loader.js";',
			)
			.replace(
				"return authoredMembers.find",
				"return membersFor(lemma).find",
			)
			.replace(
				"return authoredMembers\n",
				"return membersFor(input.source)\n",
			),
	);
	return {
		groups: Object.fromEntries(
			[...groups].map(([name, members]) => [name, members.length]),
		),
		memberCount: names.length,
		mode: "Synchronous lazy module initialization by grammatical Kind. Code remains in the initial bundle; objects initialize on first group access. Public APIs and authored build validation remain unchanged.",
	};
}
