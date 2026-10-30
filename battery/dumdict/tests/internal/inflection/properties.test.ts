import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";

import type { LemmaSlice } from "../../../src";
import { projectLemmaTables } from "../../../src/inflection";
import {
	jedem,
	jeder,
	lemmaOf,
	nounSurface,
	paradigmOf,
	readingOf,
	sliceOf,
	verbSurface,
} from "../../support/inflection-fixtures";
import { toyPack } from "../../support/toy-inflection-pack";

/** A small seeded generator, so a failing case replays. */
function random(seed: number) {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

function shuffled<T>(items: readonly T[], next: () => number): T[] {
	const copy = [...items];
	for (let index = copy.length - 1; index > 0; index -= 1) {
		const other = Math.floor(next() * (index + 1));
		[copy[index], copy[other]] = [copy[other] as T, copy[index] as T];
	}
	return copy;
}

/** The same slice as a set: everything reordered, some of it repeated. */
function permuted(slice: LemmaSlice<"de">, seed: number): LemmaSlice<"de"> {
	const next = random(seed);
	const repeat = <T>(items: readonly T[]) =>
		shuffled([...items, ...items.filter(() => next() < 0.3)], next);
	const paradigm = slice.lemmaRecord.paradigm;
	const dimensions = Object.entries(paradigm?.dimensions ?? {}) as [
		string,
		Dumrel.ParadigmDimension,
	][];
	return {
		lemmaRecord: {
			lemma: slice.lemmaRecord.lemma,
			...(paradigm && {
				paradigm: {
					dimensions: Object.fromEntries(
						shuffled(dimensions, next).map(([name, dimension]) => [
							name,
							{
								variants: shuffled(dimension.variants, next),
								licences: Object.fromEntries(
									shuffled(
										Object.entries(dimension.licences),
										next,
									).map(([reading, ids]) => [
										reading,
										shuffled(ids, next),
									]),
								),
							},
						]),
					),
				},
			}),
		},
		readingEntries: repeat(
			slice.readingEntries.map((entry) => ({
				...entry,
				attestationLinks: repeat(entry.attestationLinks),
			})),
		),
		ownedSurfaceEntries: repeat(slice.ownedSurfaceEntries),
		pendingRelations: [],
	};
}

const senden = lemmaOf("VERB", "senden");
const mail = readingOf(senden, "📨");
const radio = readingOf(senden, "📡");
const third = { person: "3", number: "Sing" } as const;
const bank = lemmaOf("NOUN", "Bank");
const bench = readingOf(bank, "🪑");
const money = readingOf(bank, "🏦");
const everyone = readingOf(jeder as Dumling.Lemma<"de">, "👥");

const slices: Record<string, LemmaSlice<"de">> = {
	"senden, partial overlap with a conflict and a passive": sliceOf({
		lemma: senden,
		paradigm: paradigmOf(senden, {
			preterite: {
				variants: ["sandte", "sendete"],
				licences: [
					[mail, ["sandte", "sendete"]],
					[radio, ["sendete"]],
				],
			},
			pastParticiple: { variants: ["gesandt", "gesendet"] },
		}),
		readings: [mail, radio],
		occurrences: [
			["r1", radio, verbSurface(senden, "sendete", third)],
			["r2", mail, verbSurface(senden, "sandte", third)],
			["r3", radio, verbSurface(senden, "sandte", third)],
			["r4", mail, verbSurface(senden, "gesandt", "Participle")],
			[
				"r5",
				mail,
				verbSurface(senden, "gesendet wurde", {
					...third,
					passive: true,
				}),
			],
			[
				"r6",
				radio,
				verbSurface(senden, "sendete", { ...third, mood: "Sub" }),
			],
		],
	}),
	"Bank, conditioned with an undescribed form": sliceOf({
		lemma: bank,
		paradigm: paradigmOf(bank, {
			plural: {
				variants: ["Bänke", "Banken"],
				licences: [
					[bench, ["Bänke"]],
					[money, ["Banken"]],
				],
			},
		}),
		readings: [bench, money],
		occurrences: [
			["r1", bench, nounSurface(bank, "Bänken", "Dat", "Plur")],
			["r2", bench, nounSurface(bank, "Banken", "Acc", "Plur")],
			["r3", money, nounSurface(bank, "Banke", "Nom", "Plur")],
			["r4", money, nounSurface(bank, "Bank", "Nom", "Sing")],
		],
		kept: [nounSurface(bank, "Bank", null, "Sing")],
	}),
	"jeder, a Surface Syncretism": sliceOf({
		lemma: jeder as Dumling.Lemma<"de">,
		readings: [everyone],
		occurrences: [["r1", everyone, jedem as Dumling.Surface<"de">]],
	}),
};

describe("projectLemmaTables is a function of sets", () => {
	for (const [name, slice] of Object.entries(slices)) {
		const view = projectLemmaTables(toyPack(), slice);

		test(`${name}: order and repeats never change the view`, () => {
			for (let seed = 1; seed <= 40; seed += 1)
				expect(
					projectLemmaTables(toyPack(), permuted(slice, seed)),
				).toEqual(view);
		});

		test(`${name}: projecting again gives the same plain data`, () => {
			expect(projectLemmaTables(toyPack(), slice)).toEqual(view);
			expect(JSON.parse(JSON.stringify(view))).toEqual(view);
		});

		test(`${name}: derives once per Licence Group`, () => {
			const pack = toyPack();
			projectLemmaTables(pack, slice);
			expect(pack.derivations).toBe(view.groups.length);
		});
	}

	test("the senden slice shows each rule at once", () => {
		const view = projectLemmaTables(
			toyPack(),
			slices[
				"senden, partial overlap with a conflict and a passive"
			] as LemmaSlice<"de">,
		);
		expect(view.groups).toHaveLength(2);
		expect(view.conflicts.map((conflict) => conflict.ref)).toEqual(["r3"]);
		expect(
			view.surfaces.map((line) => [line.form.letters, line.inCore]),
		).toEqual([
			["gesandt", true],
			["gesendet wurde", false],
			["sandte", true],
			["sendete", true],
			["sendete", false],
		]);
	});
});
