import { expect, test } from "bun:test";
import { readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { validationRegistry as units } from "dumling/compiled-validation";
import { validationOperations } from "dumling/validation";
import { validationRegistry as knowledge } from "dumrel/compiled-validation";
import { ParsingError, parseValidationArtifact } from "dumval/runtime";
import { encodedDumdictValidationArtifacts } from "../../battery/dumdict/src/generated/validation-artifacts";
import { dumdictValidationOperations } from "../../battery/dumdict/src/parsing/validation-operations";
import { encodedValidation as production } from "../../battery/dumgen/src/generated/validation";
import { encodedValidation as linguistic } from "../../battery/dumling/src/generated/validation";
import { encodedValidation as relations } from "../../battery/dumrel/src/generated/validation";
import { preparePublishedRuntime } from "../dum-entrypoint-rss/published-runtime";
import { DUM_DIFFERENTIAL_TARGETS } from "../dum-runtime-verification/differential-targets";

const operations = {
	...validationOperations,
	"dumrel.normalize-text": (value: unknown) => ({
		value: (value as string).trim().normalize("NFC"),
	}),
};
const original = Object.fromEntries(
	Object.entries({
		dumling: linguistic,
		dumrel: relations,
		dumdict: encodedDumdictValidationArtifacts,
		dumgen: production,
	}).map(([owner, encoded]) => [owner, JSON.parse(encoded)]),
);
const observe = (value: unknown) =>
	value instanceof ParsingError
		? { issues: value.issues, message: value.message }
		: { value };
test("production linked validators preserve all canonical values and exact errors from the original compiler graphs", () => {
	let values = 0;
	for (const target of DUM_DIFFERENTIAL_TARGETS) {
		const separator = target.id.indexOf(":");
		const owner = target.id.slice(0, separator),
			name = target.id.slice(separator + 1),
			registry = original[owner];
		for (const input of [
			...target.representativeValues,
			...target.propertyValues,
		]) {
			const reference = parseValidationArtifact(
				{
					version: 1,
					root: registry.roots[name],
					definitions: registry.definitions,
				},
				input,
				owner === "dumdict" ? dumdictValidationOperations : operations,
			);
			expect(observe(target.lightweight(input)), target.id).toEqual(
				observe(reference),
			);
			values++;
		}
	}
	expect(values).toBeGreaterThan(11000);
});

test("providers share readonly objects and package builds reject incompatible provider versions", async () => {
	expect(Object.isFrozen(units)).toBe(true);
	expect(Object.isFrozen(knowledge)).toBe(true);
	expect("definitions" in units).toBe(false);
	expect("definitions" in knowledge).toBe(false);
	const root = await preparePublishedRuntime(
		resolve(import.meta.dir, "../.."),
	);
	async function run(source: string) {
		const path = join(root, "check.mjs");
		await writeFile(path, source);
		const child = Bun.spawn([process.execPath, path], {
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
import {validationRegistry as a} from "dumling/compiled-validation";
import {validationRegistry as b} from "dumrel/compiled-validation";
import {ParsingError as e} from "dumval/runtime";
import {ParsingError as c} from "common-utils";
import {ParsingError as l,parseUnit} from "dumling";
import {ParsingError as r} from "dumrel";
if("definitions" in a||"definitions" in b||e!==c||e!==l||e!==r)throw Error("Duplicated runtime or provider");
if(!(parseUnit({}).error instanceof e))throw Error("Wrong error identity");
console.log("shared");
`),
		).toBe("shared");
		for (const [provider, consumer] of [
			["dumling", "dumrel"],
			["dumrel", "dumgen"],
			["dumrel", "dumdict/runtime"],
		]) {
			const path = join(
				root,
				`node_modules/${provider}/dist/generated/linked-validation.js`,
			);
			const source = await readFile(path, "utf8");
			await writeFile(
				path,
				'export const validationRegistry={version:1,fingerprint:"mismatch",roots:{},definitions:{}};',
			);
			try {
				expect(
					await run(
						`try {await import(${JSON.stringify(consumer)});throw Error("Accepted mismatch");}catch(e){if(!e.message.includes("Incompatible compiled validation provider"))throw e;console.log("rejected");}`,
					),
				).toBe("rejected");
			} finally {
				await writeFile(path, source);
			}
		}
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
