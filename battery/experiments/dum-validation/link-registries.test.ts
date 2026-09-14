import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ParsingError, parseValidationArtifact } from "common-utils";
import { validationOperations } from "dumling/validation";
import { DUM_DIFFERENTIAL_TARGETS } from "../../../tooling/dum-runtime-verification/differential-targets";
import { linkRegistries, type LinkInput } from "./link-registries";
import { preparePublishedRuntime } from "../../../tooling/dum-entrypoint-rss/published-runtime";
import { auditEntrypointReachability } from "../../../tooling/dum-entrypoint-rss/reachability";
import { auditDumDeclarationReachability } from "../../../tooling/dum-declaration-reachability";

const inputs = await Promise.all(
	["dumling", "dumrel", "dumgen"].map(async (owner) => ({
		owner,
		registry: JSON.parse(
			(await import(`../../${owner}/src/generated/validation`))
				.encodedValidation,
		) as LinkInput,
	})),
);
const linked = linkRegistries(inputs);
const repository = resolve(import.meta.dir, "../../..");

test.skipIf(
	!existsSync(
		join(repository, "battery/dumling/src/experiment-linked-registry.ts"),
	),
)(
	"published linked providers share real objects, stay schema-free, and reject incompatible versions",
	async () => {
		for (const specifier of [
			"dumling/compiled-validation",
			"dumrel/compiled-validation",
		]) {
			const reachability = await auditEntrypointReachability(specifier);
			expect(reachability.heavyweightDependencies).toEqual([]);
			expect(reachability.schemaEntrypoints).toEqual([]);
			expect(
				await auditDumDeclarationReachability({
					repositoryRoot: repository,
					entrypoints: [
						{
							specifier,
							classification: "operational",
							rationale: "Experimental provider",
							operation: {
								id: "linked-provider",
								description: "Shared validation",
							},
						},
					],
				}),
			).toEqual([]);
		}
		const root = await preparePublishedRuntime(repository);
		async function run(source: string) {
			const file = join(root, "linked-check.mjs");
			await writeFile(file, source);
			const child = Bun.spawn([process.execPath, file], {
				cwd: root,
				stdout: "pipe",
				stderr: "pipe",
			});
			const [out, err, exit] = await Promise.all([
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
				child.exited,
			]);
			expect(exit, err).toBe(0);
			return out.trim();
		}
		try {
			expect(
				await run(`
import {linkedRegistry as l} from "dumling/compiled-validation";
import {linkedRegistry as r} from "dumrel/compiled-validation";
import {parseUnit} from "dumling";
import {parseReadingKnowledge} from "dumrel";
import {validateEncounter} from "dumgen";
if(Object.getPrototypeOf(r.definitions)!==l.definitions)throw Error("Copied provider table");
let reads=0;
for(const [id,body] of Object.entries(l.definitions))Object.defineProperty(l.definitions,id,{get(){reads++;return body;}});
const lemma={unitKind:"Lemma",language:"de",family:"Lexeme",kind:"NOUN",canonicalForm:"Bank",coreFeatures:{gender:"Fem",hyph:null}};
if(!parseUnit(lemma).success||!reads)throw Error("Public Dumling parser has another table");
reads=0;
if(!parseReadingKnowledge({source:{unitKind:"Reading",lemma,emojiDescription:"🏦"},knowledge:{}}).success||!reads)throw Error("Dumrel did not reuse Dumling");
reads=0;
validateEncounter({sentence:{id:"probe",language:"de",segments:[{kind:"ResolvableText",text:"Bank"}]},target:{family:"Lexeme",kind:"NOUN",memberSegmentIndices:[0]}});
if(!reads)throw Error("Dumgen did not reuse Dumling");
console.log("shared");
`),
			).toBe("shared");
			for (const [provider, consumer] of [
				["dumling", "dumrel"],
				["dumrel", "dumgen"],
			]) {
				const file = join(
					root,
					`node_modules/${provider}/dist/experiment-linked-registry.js`,
				);
				const original = await readFile(file, "utf8");
				await writeFile(
					file,
					'export const artifactFingerprint="wrong-version"; export const linkedRegistry={version:1,roots:{},definitions:{}};',
				);
				try {
					expect(
						await run(
							`try { await import(${JSON.stringify(consumer)}); throw Error("Accepted incompatible provider"); } catch(error) { if(!error.message.includes(${JSON.stringify(`Incompatible ${provider} compiled validation artifact`)}))throw error; console.log("rejected"); }`,
						),
					).toBe("rejected");
				} finally {
					await writeFile(file, original);
				}
			}
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	},
);
const operations = {
	...validationOperations,
	"dumrel.normalize-text": (value: unknown) => ({
		value: (value as string).trim().normalize("NFC"),
	}),
};
const observable = (value: unknown) =>
	value instanceof ParsingError
		? { issues: value.issues, message: value.message }
		: { value };

test("linked rules preserve every canonical fixture and exact ordered errors across all three packages", () => {
	let comparisons = 0;
	for (const target of DUM_DIFFERENTIAL_TARGETS) {
		const [owner, name] = target.id.split(":");
		const entry = linked.find((entry) => entry.owner === owner);
		if (!entry) continue;
		for (const input of [
			...target.representativeValues,
			...target.propertyValues,
		]) {
			const actual = parseValidationArtifact(
				{
					version: 1,
					root: entry.runtime.roots[name!]!,
					definitions: entry.runtime.definitions,
				},
				input,
				operations,
			);
			expect(observable(actual), target.id).toEqual(
				observable(target.lightweight(input)),
			);
			comparisons++;
		}
	}
	expect(comparisons).toBeGreaterThan(9000);
});

test("shared constraints are the very same objects; each body has one owner and generation is deterministic", () => {
	const bodies = new Set<string>();
	for (const [index, entry] of linked.entries()) {
		for (const body of Object.values(entry.artifact.definitions)) {
			const key = JSON.stringify(body);
			expect(bodies.has(key)).toBe(false);
			bodies.add(key);
		}
		if (index) {
			const parent = linked[index - 1]!;
			expect(Object.getPrototypeOf(entry.runtime.definitions)).toBe(
				parent.runtime.definitions,
			);
			for (const [id, body] of Object.entries(
				parent.artifact.definitions,
			)) {
				expect(Object.hasOwn(entry.runtime.definitions, id)).toBe(
					false,
				);
				expect(entry.runtime.definitions[id]).toBe(body);
			}
		}
	}
	expect(linkRegistries(inputs).map((x) => x.encoded)).toEqual(
		linked.map((x) => x.encoded),
	);
});

const fixture = (
	definitions: LinkInput["definitions"],
	root: string,
): LinkInput => ({
	version: 1,
	definitions,
	roots: { x: ["ref", root] },
	operationSignatures: {},
});
test("recursive graphs share despite different node names; enum payloads are not references", () => {
	const a = fixture(
		{
			node: [
				"object",
				{
					tag: ["enum", ["ref", "missing"]],
					next: ["optional", ["ref", "node"]],
				},
				"strict",
			],
		},
		"node",
	);
	const b = fixture(
		{
			other: [
				"object",
				{
					tag: ["enum", ["ref", "missing"]],
					next: ["optional", ["ref", "other"]],
				},
				"strict",
			],
		},
		"other",
	);
	const [first, second] = linkRegistries([
		{ owner: "a", registry: a },
		{ owner: "b", registry: b },
	]);
	expect(second!.statistics.ownedDefinitions).toBe(0);
	expect(second!.runtime.roots.x).toEqual(first!.runtime.roots.x);
	const input = { tag: "ref", next: { tag: "missing" } };
	expect(
		parseValidationArtifact<unknown>(
			{
				version: 1,
				root: second!.runtime.roots.x!,
				definitions: second!.runtime.definitions,
			},
			input,
		),
	).toEqual(input);
});

test("field order, union order, checks and operation versions cannot silently merge", () => {
	const a = fixture(
		{ n: ["object", { a: ["string"], b: ["number"] }, "strip"] },
		"n",
	);
	const b = fixture(
		{ n: ["object", { b: ["number"], a: ["string"] }, "strip"] },
		"n",
	);
	expect(
		linkRegistries([
			{ owner: "a", registry: a },
			{ owner: "b", registry: b },
		])[1]!.statistics.ownedDefinitions,
	).toBe(1);
	const unionA = fixture({ n: ["union", [["string"], ["number"]]] }, "n");
	const unionB = fixture({ n: ["union", [["number"], ["string"]]] }, "n");
	expect(
		linkRegistries([
			{ owner: "a", registry: unionA },
			{ owner: "b", registry: unionB },
		])[1]!.statistics.ownedDefinitions,
	).toBe(1);
	const minA = fixture({ n: ["string", [["min", 1]]] }, "n");
	const minB = fixture({ n: ["string", [["min", 2]]] }, "n");
	expect(
		linkRegistries([
			{ owner: "a", registry: minA },
			{ owner: "b", registry: minB },
		])[1]!.statistics.ownedDefinitions,
	).toBe(1);
	a.operationSignatures = { normalize: { version: 1 } };
	b.operationSignatures = { normalize: { version: 2 } };
	expect(() =>
		linkRegistries([
			{ owner: "a", registry: a },
			{ owner: "b", registry: b },
		]),
	).toThrow("Incompatible operation");
	expect(() =>
		linkRegistries([
			{
				owner: "bad",
				registry: fixture({ a: ["ref", "b"], b: ["ref", "a"] }, "a"),
			},
		]),
	).toThrow("Unproductive reference cycle");
	expect(() =>
		linkRegistries([{ owner: "bad", registry: fixture({}, "missing") }]),
	).toThrow("Missing definition");
});

test("providers can be generated independently of downstream packages", () => {
	for (const count of [1, 2]) {
		const prefix = linkRegistries(inputs.slice(0, count));
		expect(
			prefix.map((x) => ({
				encoded: x.encoded,
				fingerprint: x.fingerprint,
			})),
		).toEqual(
			linked
				.slice(0, count)
				.map((x) => ({
					encoded: x.encoded,
					fingerprint: x.fingerprint,
				})),
		);
	}
});
