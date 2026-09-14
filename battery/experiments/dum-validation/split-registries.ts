import type { Constraint } from "common-utils";

export type Registry = {
	roots: Record<string, Constraint>;
	definitions: Record<string, Constraint>;
};

/** Partition immutable package-owned artifacts; public mutable artifacts are untouched. */
export function splitRegistry(
	registry: Registry,
	groupFor: (root: string) => string,
) {
	const groups = new Map<
		string,
		{ roots: Record<string, Constraint>; references: Set<string> }
	>();
	function references(value: unknown, found: Set<string>) {
		if (
			Array.isArray(value) &&
			value[0] === "ref" &&
			typeof value[1] === "string"
		) {
			const name = value[1];
			if (found.has(name)) return;
			if (!Object.hasOwn(registry.definitions, name))
				throw new Error(`Missing definition ${name}`);
			found.add(name);
			references(registry.definitions[name], found);
		} else if (value && typeof value === "object") {
			for (const member of Object.values(value))
				references(member, found);
		}
	}
	for (const name of Object.keys(registry.roots).sort()) {
		const group = groupFor(name);
		if (!group) throw new Error(`Missing operation group for ${name}`);
		const entry = groups.get(group) ?? {
			roots: {},
			references: new Set<string>(),
		};
		entry.roots[name] = registry.roots[name]!;
		references(registry.roots[name], entry.references);
		groups.set(group, entry);
	}
	const shared = new Set<string>();
	for (const name of Object.keys(registry.definitions))
		if (
			[...groups.values()].filter((group) => group.references.has(name))
				.length > 1
		)
			shared.add(name);
	const select = (names: Iterable<string>) =>
		Object.fromEntries(
			[...names]
				.sort()
				.map((name) => [name, registry.definitions[name]!]),
		);
	const sharedDefinitions = select(shared);
	const buckets = new Map<string, { consumers: string[]; names: string[] }>();
	for (const name of [...shared].sort()) {
		const consumers = [...groups]
			.filter(([, group]) => group.references.has(name))
			.map(([group]) => group)
			.sort();
		const key = consumers.join("|");
		const bucket = buckets.get(key) ?? { consumers, names: [] };
		bucket.names.push(name);
		buckets.set(key, bucket);
	}
	const sharedBlocks = [...buckets]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, bucket]) => ({
			name,
			consumers: bucket.consumers,
			definitions: select(bucket.names),
		}));
	const partitions = [...groups]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([name, group]) => ({
			name,
			roots: group.roots,
			definitions: select(
				[...group.references].filter((ref) => !shared.has(ref)),
			),
			usesShared: [...group.references].some((ref) => shared.has(ref)),
			reachableDefinitions: group.references.size,
		}));
	return { sharedDefinitions, sharedBlocks, partitions };
}

/** Emit synchronous getters: no JSON decoding until a root is requested. */
export function emitSplitRegistry(
	registry: Registry,
	groupFor: (root: string) => string,
	compactBlockNames = false,
) {
	const split = splitRegistry(registry, groupFor);
	if (compactBlockNames)
		for (const [index, block] of split.sharedBlocks.entries())
			block.name = String(index);
	const rootGroups = Object.fromEntries(
		split.partitions.flatMap((part) =>
			Object.keys(part.roots).map((name) => [name, part.name]),
		),
	);
	const encodedGroups = Object.fromEntries(
		split.partitions.map((part) => [
			part.name,
			JSON.stringify({
				roots: part.roots,
				definitions: part.definitions,
			}),
		]),
	);
	const encodedShared = Object.fromEntries(
		split.sharedBlocks.map((block) => [
			block.name,
			JSON.stringify(block.definitions),
		]),
	);
	const sharedGroups = Object.fromEntries(
		split.partitions.map((part) => [
			part.name,
			split.sharedBlocks
				.filter((block) => block.consumers.includes(part.name))
				.map((block) => block.name),
		]),
	);
	const sharedJsonBytes = Object.values(encodedShared).reduce(
		(n, text) => n + Buffer.byteLength(text),
		0,
	);
	const source = `// Experiment output: synchronous operation-level materialization, shared definitions decoded once.
import type { Constraint } from "common-utils";
type Group = { roots: Record<string, Constraint>; definitions: Record<string, Constraint> };
const runtime = /* @__PURE__ */ (() => {
const rootGroups: Record<string,string> = ${JSON.stringify(rootGroups)};
const encodedGroups: Record<string,string> = ${JSON.stringify(encodedGroups)};
const encodedShared: Record<string,string> = ${JSON.stringify(encodedShared)};
const needsShared: Record<string,string[]> = ${JSON.stringify(sharedGroups)};
const loadedBlocks = new Set<string>();
const loaded = new Map<string,Group>();
const definitions: Record<string,Constraint> = Object.create(null);
let sharedLoaded = false;
let decodedBytes = 0;
function load(name: string): Group {
 const existing = loaded.get(name); if(existing) return existing;
 for(const block of needsShared[name] ?? []) {
  if(loadedBlocks.has(block)) continue;
  const sharedText=encodedShared[block]!;
  Object.assign(definitions,JSON.parse(sharedText));
  decodedBytes += sharedText.length; sharedLoaded = true; loadedBlocks.add(block);
 }
 const text=encodedGroups[name]; if(text===undefined) throw new Error("Unknown operation group: "+name);
 const group=JSON.parse(text) as Group;
 decodedBytes += text.length;
 Object.assign(definitions,group.definitions);
 loaded.set(name,group);
 return group;
}
const roots: Record<string,Constraint> = Object.create(null);
for(const [root,group] of Object.entries(rootGroups)) {
 Object.defineProperty(roots,root,{enumerable:true,get:()=>load(group).roots[root]});
}
return {registry:{version:1 as const,roots,definitions},state:()=>({groups:[...loaded.keys()],blocks:[...loadedBlocks],sharedLoaded,definitions:Object.keys(definitions).length,decodedBytes})};
})();
export const operationRegistry=/* @__PURE__ */ (()=>runtime.registry)();
/** Internal experiment diagnostics; not re-exported by a package. */
export const operationRegistryState=/* @__PURE__ */ (()=>runtime.state)();
`;
	return {
		source,
		statistics: {
			originalJsonBytes: Buffer.byteLength(JSON.stringify(registry)),
			sharedJsonBytes,
			sharedBlocks: split.sharedBlocks.length,
			sharedDefinitions: Object.keys(split.sharedDefinitions).length,
			totalEncodedBytes:
				sharedJsonBytes +
				Object.values(encodedGroups).reduce(
					(n, text) => n + Buffer.byteLength(text),
					0,
				),
			groups: split.partitions.map((part) => ({
				name: part.name,
				roots: Object.keys(part.roots),
				ownDefinitions: Object.keys(part.definitions).length,
				reachableDefinitions: part.reachableDefinitions,
				usesShared: part.usesShared,
				jsonBytes: Buffer.byteLength(encodedGroups[part.name]!),
				firstUseJsonBytes:
					Buffer.byteLength(encodedGroups[part.name]!) +
					sharedGroups[part.name]!.reduce(
						(n, name) =>
							n + Buffer.byteLength(encodedShared[name]!),
						0,
					),
			})),
		},
	};
}

export function operationGroup(owner: string, name: string): string {
	if (owner === "dumling") return name.split("/").slice(0, 2).join("/");
	if (owner === "dumrel") {
		if (
			/knowledgeSettings|knowledgeRequestMask|knowledgeSelectionInput/.test(
				name,
			)
		)
			return "selection";
		if (name === "readingKnowledge" || name === "knowledgeChange")
			return "knowledge";
		return "relations";
	}
	if (owner === "dumgen") {
		if (/^segment|^memberIndices|^intakeOutput/.test(name))
			return "segmentation";
		if (
			/^grammar\//.test(name) ||
			name === "lemmaSchema" ||
			name === "attestationSchema"
		)
			return "grammar";
		if (/^knowledge/.test(name)) return "knowledge";
		if (/^target\/|^classify|^encounter/.test(name)) return "targeting";
		if (
			/^emoji|^generationInput$|^comparisonInput$|^readingSchema$/.test(
				name,
			)
		)
			return "reading";
	}
	throw new Error(`Unclassified validation root: ${owner}/${name}`);
}
