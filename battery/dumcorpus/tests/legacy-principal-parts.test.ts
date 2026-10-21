import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findSpecRecord, loadSpecRecords } from "../src/index.js";
import { currentRecordJson } from "../src/legacy-principal-parts.js";

const recordsRoot = fileURLToPath(new URL("../records/", import.meta.url));

/** A record whose one target stored its principal parts as Knowledge. */
const legacy = {
	targets: [
		{
			reading: {
				emojiDescription: "🚆👋",
				knowledge: {
					conjugationClass: ["Strong"],
					preterite: ["fuhr ab"],
					presentSingular: {
						first: ["fahre ab"],
						second: ["fährst ab"],
						third: ["fährt ab"],
					},
					definition: "losfahren",
				},
				coverage: {
					conjugationClass: "Authored",
					preterite: "Authored",
					presentSingular: "Authored",
					definition: "Authored",
				},
			},
		},
		{
			reading: {
				emojiDescription: "🚂",
				knowledge: { plural: "NoPlural" },
			},
		},
	],
};

test("a record over the file-token limit reads its pre-ADR 0048 principal parts as Paradigm forms", () => {
	expect(currentRecordJson(legacy, 20_001)).toEqual({
		record: {
			targets: [
				{
					reading: {
						emojiDescription: "🚆👋",
						knowledge: { definition: "losfahren" },
						coverage: {
							definition: "Authored",
							paradigm: {
								preterite: "Authored",
								present1: "Authored",
								present2: "Authored",
								present3: "Authored",
							},
						},
						paradigm: {
							preterite: ["fuhr ab"],
							present1: ["fahre ab"],
							present2: ["fährst ab"],
							present3: ["fährt ab"],
						},
					},
				},
				{
					reading: {
						emojiDescription: "🚂",
						knowledge: {},
						paradigm: { plural: ["NoPlural"] },
					},
				},
			],
		},
	});
	expect(legacy.targets[1]?.reading.knowledge).toEqual({
		plural: "NoPlural",
	});
});

test("a record under the limit must hold the current shape, so the old one can't spread", () => {
	expect(currentRecordJson(legacy, 20_000)).toMatchObject({
		issue: expect.stringContaining("reading.paradigm"),
	});
	const current = {
		targets: [{ reading: { paradigm: { plural: ["Banken"] } } }],
	};
	expect(currentRecordJson(current, 100)).toEqual({ record: current });
});

test("every record that still holds principal parts as Knowledge is over the limit, and loads with its Paradigm forms", () => {
	const legacyAspects = [
		"plural",
		"conjugationClass",
		"preterite",
		"presentSingular",
		"pastParticiple",
		"subjunctivePast",
	];
	const holds = (value: unknown) =>
		typeof value === "object" &&
		value !== null &&
		legacyAspects.some((aspect) => aspect in value);
	const holders = readdirSync(recordsRoot, {
		recursive: true,
		encoding: "utf8",
	})
		.filter((path) => path.endsWith(".json"))
		.filter((path) => {
			const json = JSON.parse(
				readFileSync(join(recordsRoot, path), "utf8"),
			);
			return (json.targets ?? []).some(
				(target: {
					reading?: { knowledge?: unknown; coverage?: unknown };
				}) =>
					holds(target.reading?.knowledge) ||
					holds(target.reading?.coverage),
			);
		});
	expect(holders.length).toBeGreaterThan(0);
	for (const path of holders)
		expect([
			path,
			readFileSync(join(recordsRoot, path)).byteLength > 20_000,
		]).toEqual([path, true]);
	const record = findSpecRecord(
		loadSpecRecords(),
		"de/alfred-neigte-das-haupt-leer-laechelnd-wie-zum",
	);
	expect(record?.targets[2]?.paradigm?.plural).toBeDefined();
	expect(record?.targets[2]?.knowledge).not.toHaveProperty("plural");
});
