import { expect, test } from "bun:test";
import { lemmaIdentityKey, readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { applyParadigmChanges, isFree, paradigmChangesFor } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { loadSpecRecords, rules } from "../src/index.js";

const doubletRule = rules.find(
	(rule) => rule.id === "de/meaning-conditioned-paradigm-doublets",
);
/** The Lemmas the Rule names: the meaning-conditioned doublets, then the free controls. */
const doublets = [
	"Bank",
	"Mutter",
	"Wort",
	"Strauß",
	"Druck",
	"Gesicht",
	"schleifen",
	"bewegen",
	"hängen",
	"senden",
	"wenden",
	"schaffen",
	"erschrecken",
	"wiegen",
];
const freeControls = new Set(["melken", "Pizza"]);
const named = new Set([...doublets, ...freeControls]);

/** One gold Lemma: its Readings and what each licenses, per dimension. */
type GoldLemma = {
	readonly lemma: Dumling.Lemma;
	readonly licences: Map<
		string,
		{
			readonly reading: Dumling.Reading;
			readonly paradigm: Partial<
				Record<Dumrel.DimensionId, readonly string[]>
			>;
		}
	>;
};

/** The named Lemmas' targets in the doublet Rule's records, pooled by Lemma. */
function goldLemmas(): Map<string, GoldLemma> {
	const listed = new Set(doubletRule?.records ?? []);
	const lemmas = new Map<string, GoldLemma>();
	for (const record of loadSpecRecords()) {
		if (!listed.has(record.id)) continue;
		for (const target of record.targets) {
			if (target.reading === undefined || target.paradigm === undefined)
				continue;
			const { lemma } = target.reading;
			if (!named.has(lemma.canonicalForm)) continue;
			const key = lemmaIdentityKey(lemma);
			const gold = lemmas.get(key) ?? { lemma, licences: new Map() };
			gold.licences.set(readingIdentityKey(target.reading), {
				reading: target.reading,
				paradigm: target.paradigm,
			});
			lemmas.set(key, gold);
		}
	}
	return lemmas;
}

/** The Lemma Paradigm the gold Readings' Licences pool into (ADR 0048). */
function pooledParadigm(gold: GoldLemma): Dumrel.LemmaParadigm {
	const readings = [...gold.licences.values()].map(({ reading }) => reading);
	const changes = [...gold.licences.values()].flatMap(
		({ reading, paradigm }) =>
			Object.entries(paradigm).flatMap(([dimension, values]) =>
				paradigmChangesFor({
					reading,
					dimension: dimension as Dumrel.DimensionId,
					values: values ?? [],
					provenance: "Authored",
				}),
			),
	);
	const applied = applyParadigmChanges({
		lemma: gold.lemma,
		readings,
		paradigm: { dimensions: {} },
		changes,
	});
	if (!applied.success) throw new Error(applied.error.message);
	return applied.value;
}

test("the doublet Rule lists gold for every doublet and free control it names", () => {
	expect(doubletRule).toBeDefined();
	const names = [...goldLemmas().values()]
		.map(({ lemma }) => lemma.canonicalForm)
		.sort();
	expect(names).toEqual([...named].sort());
});

test("a doublet's senses condition its Paradigm, and a free control's every sense takes every variant (ADR 0048)", () => {
	for (const gold of goldLemmas().values()) {
		const name = gold.lemma.canonicalForm;
		const paradigm = pooledParadigm(gold);
		const readings = [...gold.licences.keys()];
		const free = freeControls.has(name);
		expect({ name, free: isFree(paradigm, readings) }).toEqual({
			name,
			free,
		});
		if (free)
			expect({
				name,
				alternatives: Object.values(paradigm.dimensions).some(
					(dimension) => (dimension?.variants.length ?? 0) > 1,
				),
			}).toEqual({ name, alternatives: true });
		else
			expect({ name, senses: readings.length >= 2 }).toEqual({
				name,
				senses: true,
			});
	}
});
