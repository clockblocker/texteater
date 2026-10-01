import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { projectSemanticRelations } from "dumrel";
import { semanticRelationProjectionSchema } from "dumrel/schema";
import type * as Dumrel from "dumrel/types";
import { houseLemma, prefixLemma } from "./fixtures.js";

function reading(
	form: string,
	emoji = "🐾",
): Dumling.Reading<"de", "Lexeme", "NOUN"> {
	return {
		unitKind: "Reading",
		lemma: { ...houseLemma, canonicalForm: form },
		emojiDescription: emoji,
	};
}
/** A Foreign Reading has no Emoji Description (ADR 0045). */
function emojiOf(value: Dumling.Reading): string | undefined {
	return "emojiDescription" in value ? value.emojiDescription : undefined;
}
const dog = reading("Hund");
const animal = reading("Tier");
const brute = reading("Tier", "😈");
const hound = reading("Hündchen");
function project(
	entries: readonly Dumrel.ReadingWithKnowledge[],
	options: Parameters<typeof projectSemanticRelations>[1] = {},
) {
	const result = projectSemanticRelations(entries, options);
	if (!result.success) throw result.error;
	for (const edge of result.value)
		expect(semanticRelationProjectionSchema.safeParse(edge).success).toBe(
			true,
		);
	return result.value;
}

test("a Lemma target closes only when its Lemma has exactly one Reading", () => {
	const source = {
		reading: dog,
		knowledge: { semanticRelations: { hypernym: [animal.lemma] } },
	};
	const direct: Dumrel.SemanticRelationProjection = {
		source: dog,
		relation: "hypernym",
		target: animal.lemma,
		provenance: "direct",
	};
	const inverse: Dumrel.SemanticRelationProjection = {
		source: animal,
		relation: "hyponym",
		target: dog.lemma,
		provenance: "inferred",
	};
	const single = [source, { reading: animal, knowledge: {} }];
	expect(project(single)).toEqual([direct, inverse]);
	// A homonymous Lemma adds no inverse to any of its Readings.
	expect(project([...single, { reading: brute, knowledge: {} }])).toEqual([
		direct,
	]);
	// The dictionary-wide count decides, not the Readings one call supplies.
	expect(
		project(single, {
			readingCounts: [{ lemma: animal.lemma, readingCount: 2 }],
		}),
	).toEqual([direct]);
	expect(project([source])).toEqual([direct]);
});

test("a Canonical Form counts without case, as Lemma identity does (system ADR 0002)", () => {
	const duplicate = projectSemanticRelations([
		{ reading: dog, knowledge: {} },
		{ reading: reading("HUND"), knowledge: {} },
	]);
	expect(duplicate.success).toBe(false);
	if (!duplicate.success)
		expect(duplicate.error.issues[0]?.path).toEqual([1, "reading"]);
	const shouted = { ...animal.lemma, canonicalForm: "TIER" };
	expect(
		project([
			{
				reading: dog,
				knowledge: { semanticRelations: { hypernym: [shouted] } },
			},
			{ reading: animal, knowledge: {} },
		]),
	).toEqual([
		{
			source: dog,
			relation: "hypernym",
			target: shouted,
			provenance: "direct",
		},
		{
			source: animal,
			relation: "hyponym",
			target: dog.lemma,
			provenance: "inferred",
		},
	]);
});

test("reading counts must be valid, unique, and cover the supplied Readings", () => {
	const entries = [
		{ reading: animal, knowledge: {} },
		{ reading: brute, knowledge: {} },
	];
	for (const [readingCounts, path] of [
		[[{ lemma: animal.lemma, readingCount: 1 }], "readingCount"],
		[[{ lemma: animal.lemma, readingCount: 2.5 }], "readingCount"],
		[
			[
				{ lemma: dog.lemma, readingCount: 1 },
				{ lemma: dog.lemma, readingCount: 1 },
			],
			"lemma",
		],
		[[{ lemma: dog, readingCount: 1 }], "lemma"],
	] as const) {
		const result = projectSemanticRelations(entries, {
			readingCounts: readingCounts as never,
		});
		expect(result.success).toBe(false);
		if (!result.success)
			expect(result.error.issues[0]?.path.slice(0, 3)).toEqual([
				"readingCounts",
				readingCounts.length - 1,
				path,
			]);
	}
	const decomposed = reading(" Hu\u0308ndchen ").lemma;
	expect(
		project(
			[
				{
					reading: dog,
					knowledge: {
						semanticRelations: { synonym: [hound.lemma] },
					},
				},
				{ reading: hound, knowledge: {} },
			],
			{ readingCounts: [{ lemma: decomposed, readingCount: 2 }] },
		),
	).toHaveLength(1);
});

test("Burg gets nothing through the homonymous Lemma Schloss", () => {
	const burg = reading("Burg", "🏰");
	const castle = reading("Schloss", "🏰");
	const lock = reading("Schloss", "🔒");
	const building = reading("Gebäude", "🏢");
	const device = reading("Vorrichtung", "⚙️");
	const entries = [
		{
			reading: burg,
			knowledge: { semanticRelations: { synonym: [castle.lemma] } },
		},
		{
			reading: castle,
			knowledge: { semanticRelations: { hypernym: [building.lemma] } },
		},
		{
			reading: lock,
			knowledge: { semanticRelations: { hypernym: [device.lemma] } },
		},
		{ reading: building, knowledge: {} },
		{ reading: device, knowledge: {} },
	];
	const edges = project(entries);
	expect(edges).not.toContainEqual(
		expect.objectContaining({
			source: burg,
			relation: "hypernym",
			target: device.lemma,
		}),
	);
	expect(edges).not.toContainEqual(
		expect.objectContaining({
			source: lock,
			relation: "hyponym",
			target: burg.lemma,
		}),
	);
	expect(
		edges.filter((edge) => edge.source.lemma.canonicalForm === "Burg"),
	).toEqual([
		{
			source: burg,
			relation: "synonym",
			target: castle.lemma,
			provenance: "direct",
		},
	]);
	// With Schloss a single-Reading Lemma, closure still runs through it.
	const single = project(entries.filter((entry) => entry.reading !== lock));
	expect(single).toContainEqual({
		source: burg,
		relation: "hypernym",
		target: building.lemma,
		provenance: "inferred",
	});
	expect(single).toContainEqual({
		source: castle,
		relation: "synonym",
		target: burg.lemma,
		provenance: "inferred",
	});
	expect(single).toContainEqual({
		source: building,
		relation: "hyponym",
		target: burg.lemma,
		provenance: "inferred",
	});
});

test("exact targets never expand to unrelated Readings and inverse encoding follows source mode", () => {
	const source = {
		reading: dog,
		knowledge: {
			semanticRelations: {
				targetKind: "reading" as const,
				synonym: [animal],
			},
		},
	};
	const entries = [
		source,
		{
			reading: animal,
			knowledge: {
				semanticRelations: { targetKind: "reading" as const },
			},
		},
		{ reading: brute, knowledge: {} },
	];
	expect(project(entries)).toEqual([
		{
			source: dog,
			relation: "synonym",
			target: animal,
			provenance: "direct",
		},
		{
			source: animal,
			relation: "synonym",
			target: dog,
			provenance: "inferred",
		},
	]);
	expect(
		project([source, { reading: animal, knowledge: {} }]),
	).toContainEqual({
		source: animal,
		relation: "synonym",
		target: dog.lemma,
		provenance: "inferred",
	});
});

test("an inverse onto a homonymous Lemma joins no synonym component", () => {
	const source = reading("Tier", "🐕");
	const edges = project([
		{
			reading: source,
			knowledge: {
				semanticRelations: { targetKind: "reading", synonym: [animal] },
			},
		},
		{ reading: animal, knowledge: {} },
		{
			reading: brute,
			knowledge: { semanticRelations: { targetKind: "reading" } },
		},
	]);
	// The inverse from animal targets the Lemma Tier, whose three Readings
	// make it homonymous, so brute stays outside the component.
	expect(edges).toEqual([
		{
			source,
			relation: "synonym",
			target: animal,
			provenance: "direct",
		},
	]);
});

test("all inverse pairs, synonym substitution, and direct provenance", () => {
	const inverses = {
		synonym: "synonym",
		nearSynonym: "nearSynonym",
		antonym: "antonym",
		nearAntonym: "nearAntonym",
		hypernym: "hyponym",
		holonym: "meronym",
	} as const;
	for (const [relation, inverse] of Object.entries(inverses)) {
		const entries = [
			{
				reading: dog,
				knowledge: {
					semanticRelations: { [relation]: [animal.lemma] },
				},
			},
			{ reading: animal, knowledge: {} },
		];
		expect(project(entries)).toContainEqual({
			source: animal,
			relation: inverse,
			target: dog.lemma,
			provenance: "inferred",
		});
	}
	const edges = project([
		{
			reading: dog,
			knowledge: {
				semanticRelations: {
					synonym: [hound.lemma],
					hypernym: [animal.lemma],
					nearAntonym: [brute.lemma],
				},
			},
		},
		{
			reading: hound,
			knowledge: { semanticRelations: { hypernym: [animal.lemma] } },
		},
		{ reading: animal, knowledge: {} },
	]);
	expect(edges).toContainEqual({
		source: hound,
		relation: "hypernym",
		target: animal.lemma,
		provenance: "direct",
	});
	expect(edges).not.toContainEqual({
		source: hound,
		relation: "nearAntonym",
		target: brute.lemma,
		provenance: "inferred",
	});
	expect(edges).toContainEqual({
		source: animal,
		relation: "hyponym",
		target: hound.lemma,
		provenance: "inferred",
	});
});

test("synonym substitution retains a single-Reading Lemma target absent from the inventory", () => {
	const entries = [
		{
			reading: dog,
			knowledge: {
				semanticRelations: {
					synonym: [hound.lemma],
					hypernym: [animal.lemma],
				},
			},
		},
		{ reading: hound, knowledge: {} },
	];
	const substituted = {
		source: hound,
		relation: "hypernym",
		target: animal.lemma,
		provenance: "inferred",
	} as const;
	expect(
		project(entries, {
			readingCounts: [{ lemma: animal.lemma, readingCount: 1 }],
		}),
	).toContainEqual(substituted);
	// Without a count, a Lemma with no supplied Reading reaches no Reading.
	expect(project(entries)).not.toContainEqual(substituted);
});

test("empty, self, and cyclic inventories terminate without inferred self edges", () => {
	expect(project([])).toEqual([]);
	expect(
		project([
			{
				reading: dog,
				knowledge: {
					semanticRelations: { synonym: [dog.lemma, dog.lemma] },
				},
			},
		]),
	).toEqual([
		{
			source: dog,
			relation: "synonym",
			target: dog.lemma,
			provenance: "direct",
		},
	]);
});

test("a small independent reachability oracle covers every directed three-Reading synonym graph", () => {
	const readings = [dog, animal, hound] as const;
	const pairs = [
		[0, 1],
		[0, 2],
		[1, 0],
		[1, 2],
		[2, 0],
		[2, 1],
	] as const;
	for (let mask = 0; mask < 64; mask++) {
		const direct = pairs.filter((_, index) => (mask & (1 << index)) !== 0);
		const reachable = readings.map((_, a) =>
			readings.map(
				(_, b) =>
					a === b ||
					direct.some(
						([x, y]) =>
							(x === a && y === b) || (x === b && y === a),
					),
			),
		);
		for (let via = 0; via < 3; via++)
			for (const row of reachable)
				for (let b = 0; b < 3; b++)
					row[b] ||= Boolean(row[via] && reachable[via]?.[b]);
		const actual = project(
			readings.map((reading, source) => ({
				reading,
				knowledge: {
					semanticRelations: {
						targetKind: "reading",
						synonym: direct
							.filter(([a]) => a === source)
							.map(([, b]) => readings[b]),
					},
				},
			})),
		);
		const expected = pairs
			.filter(([a, b]) => reachable[a]?.[b])
			.map(
				([a, b]): Dumrel.SemanticRelationProjection => ({
					source: readings[a],
					relation: "synonym",
					target: readings[b],
					provenance: direct.some(([x, y]) => x === a && y === b)
						? "direct"
						: "inferred",
				}),
			);
		expect(actual).toHaveLength(expected.length);
		for (const edge of expected) expect(actual).toContainEqual(edge);
	}
});

test("normalization and structural equality detect duplicate sources and exact targets", () => {
	const composed = reading("Hündchen");
	const decomposed = reading(" Hu\u0308ndchen ");
	const duplicate = projectSemanticRelations([
		{ reading: composed, knowledge: {} },
		{ reading: decomposed, knowledge: {} },
	]);
	expect(duplicate.success).toBe(false);
	if (!duplicate.success)
		expect(duplicate.error.issues[0]?.path).toEqual([1, "reading"]);
	const reordered = {
		emojiDescription: dog.emojiDescription,
		lemma: dog.lemma,
		unitKind: "Reading" as const,
	};
	expect(
		projectSemanticRelations([
			{ reading: dog, knowledge: {} },
			{ reading: reordered, knowledge: {} },
		]).success,
	).toBe(false);
	expect(
		project([
			{
				reading: dog,
				knowledge: {
					semanticRelations: {
						targetKind: "reading",
						synonym: [decomposed],
					},
				},
			},
			{
				reading: composed,
				knowledge: { semanticRelations: { targetKind: "reading" } },
			},
		]),
	).toContainEqual({
		source: dog,
		relation: "synonym",
		target: composed,
		provenance: "direct",
	});
});

test("invalid inventory fails as a whole with contextual paths", () => {
	for (const knowledge of [
		{ semanticRelations: { targetKind: "reading", synonym: [animal] } },
		{ semanticRelations: { synonym: [prefixLemma] } },
		{
			semanticRelations: {
				targetKind: "reading",
				synonym: [animal],
				hypernym: [dog.lemma],
			},
		},
	]) {
		const result = projectSemanticRelations([
			{ reading: dog, knowledge: knowledge as Dumrel.ReadingKnowledge },
			{ reading: hound, knowledge: {} },
		]);
		expect(result.success).toBe(false);
		if (!result.success) expect(result.error.issues[0]?.path[0]).toBe(0);
		expect(result).not.toHaveProperty("value");
	}
});

test("a requested source gets exactly its edges from the whole projection", () => {
	const entries: readonly Dumrel.ReadingWithKnowledge[] = [
		{
			reading: dog,
			knowledge: {
				semanticRelations: {
					synonym: [hound.lemma],
					hypernym: [animal.lemma],
					nearAntonym: [brute.lemma],
				},
			},
		},
		{
			reading: hound,
			knowledge: { semanticRelations: { hypernym: [animal.lemma] } },
		},
		{ reading: animal, knowledge: {} },
		{
			reading: brute,
			knowledge: {
				semanticRelations: { targetKind: "reading", synonym: [animal] },
			},
		},
	];
	const whole = project(entries);
	for (const { reading } of entries) {
		const result = projectSemanticRelations(entries, { source: reading });
		if (!result.success) throw result.error;
		expect(result.value).toEqual(
			whole.filter(
				(edge) =>
					edge.source.lemma.canonicalForm ===
						reading.lemma.canonicalForm &&
					emojiOf(edge.source) === emojiOf(reading),
			),
		);
	}
	const missing = projectSemanticRelations(entries, {
		source: reading("Katze"),
	});
	expect(missing.success).toBe(false);
	if (!missing.success)
		expect(missing.error.issues[0]?.path).toEqual(["source"]);
});

// Convex allows a query one second of user code; a relation neighbourhood of
// fifty Readings must project in a small share of it.
function projectedWithinBudget(
	entries: readonly Dumrel.ReadingWithKnowledge[],
	options: Parameters<typeof projectSemanticRelations>[1] = {},
) {
	const started = performance.now();
	const result = projectSemanticRelations(entries, options);
	expect(performance.now() - started).toBeLessThan(200);
	if (!result.success) throw result.error;
	return result.value;
}

test("fifty Readings of one homonymous synonym Lemma project within budget", () => {
	const source = {
		reading: dog,
		knowledge: { semanticRelations: { synonym: [animal.lemma] } },
	};
	const senses = Array.from({ length: 50 }, (_, index) => ({
		reading: reading("Tier", String.fromCodePoint(0x1f400 + index)),
		knowledge: {},
	}));
	expect(projectedWithinBudget([source, ...senses])).toHaveLength(1);
});

test("a synonym component with hundreds of edges projects within budget", () => {
	const synonyms = Array.from({ length: 5 }, (_, index) =>
		reading(`Hund${index}`),
	);
	const outside: Dumling.Lemma[] = [];
	const hypernyms = (prefix: string, count: number) => {
		const lemmas = Array.from(
			{ length: count },
			(_, index) => reading(`${prefix}${index}`).lemma,
		);
		outside.push(...lemmas);
		return lemmas;
	};
	const entries = [
		{
			reading: dog,
			knowledge: {
				semanticRelations: {
					synonym: synonyms.map((synonym) => synonym.lemma),
					hypernym: hypernyms("Quelle", 10),
				},
			},
		},
		...synonyms.map((synonym, index) => ({
			reading: synonym,
			knowledge: {
				semanticRelations: {
					hypernym: hypernyms(`Ober${index}-`, 49),
				},
			},
		})),
	];
	expect(
		projectedWithinBudget(entries, {
			readingCounts: outside.map((lemma) => ({ lemma, readingCount: 1 })),
		}).filter(
			(edge) =>
				edge.source.lemma.canonicalForm === "Hund" &&
				edge.relation === "hypernym",
		),
	).toHaveLength(10 + 5 * 49);
});
