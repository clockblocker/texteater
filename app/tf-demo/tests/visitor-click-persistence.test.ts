import { expect, test } from "bun:test";
import { makeSurfaceId } from "dumdict";
import { readingFingerprint } from "dumling";
import { applyDumdictPlanInTransaction } from "../convex/dumdictStorage";
import { lemmaKeyFor } from "../convex/model/linguisticKeys";
import {
	persistResolvedClick,
	persistUnresolvedClick,
} from "../convex/persistence";

test("a host-composed empty Dumdict plan does not advance revision", async () => {
	let patches = 0;
	let inserts = 0;
	const range = { eq: () => range };
	const ctx = {
		db: {
			query() {
				return {
					withIndex(
						_name: string,
						build: (value: typeof range) => unknown,
					) {
						build(range);
						return {
							async unique() {
								return {
									_id: "state-1",
									key: "global",
									revision: 7,
								};
							},
						};
					},
				};
			},
			async patch() {
				patches += 1;
			},
			async insert() {
				inserts += 1;
			},
		},
	};

	const result = await applyDumdictPlanInTransaction(ctx as never, {
		baseRevision: "convex-2",
		changes: [],
	});

	expect(result).toEqual({ status: "committed", nextRevision: "convex-7" });
	expect(patches).toBe(0);
	expect(inserts).toBe(0);
});

test("the storage adapter rejects a malformed internal plan before writes", async () => {
	let queries = 0;
	let inserts = 0;
	const ctx = {
		db: {
			query() {
				queries += 1;
				return {
					withIndex() {
						return this;
					},
					unique() {
						return null;
					},
				};
			},
			insert() {
				inserts += 1;
			},
		},
	};

	await expect(
		applyDumdictPlanInTransaction(ctx as never, {
			baseRevision: "convex-0",
			changes: [
				{
					type: "createLemma",
					record: {},
					preconditions: [],
				},
			],
		}),
	).rejects.toThrow();
	expect(queries).toBe(1);
	expect(inserts).toBe(0);
});

test("stores occurrence membership and a minimal resolved Click", async () => {
	const sentenceId = "sentence-1";
	const segmentId = "segment-1";
	const lemmaId = "lemma-1";
	const readingId = "reading-1";
	const surfaceId = "surface-1";
	const lemma = {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const surface = {
		language: "de",
		normalizedSurface: "Banken",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
		lemma,
	} as const;
	const readingValue = { lemma, emojiDescription: "🏦" } as const;
	const readingKey = readingFingerprint(readingValue);
	const surfaceKey = makeSurfaceId("de", surface);
	const rows: Record<string, unknown> = {
		segments: {
			_id: segmentId,
			sentenceId,
			index: 0,
			kind: "ResolvableText",
			text: "Banken",
		},
		visitorClicks: null,
		readings: {
			_id: readingId,
			lemmaId,
			readingKey,
			emojiDescription: readingValue.emojiDescription,
		},
		surfaces: { _id: surfaceId, lemmaId, surfaceKey },
		lemmas: { _id: lemmaId, lemmaKey: lemmaKeyFor(lemma) },
	};
	const documents: Record<string, unknown> = {
		[sentenceId]: { _id: sentenceId, segmentedSentenceId: "segmented-1" },
		[lemmaId]: {
			...rows.lemmas,
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		},
		[readingId]: { ...rows.readings, emojiDescription: "🏦" },
		[surfaceId]: {
			...rows.surfaces,
			language: "de",
			normalizedSurface: "Banken",
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", number: "Plur" },
		},
	};
	const indexRange = {
		eq() {
			return indexRange;
		},
	};
	let insertedClick: unknown;
	let insertedAttestation: unknown;
	let patchedMembership: unknown;
	const ctx = {
		db: {
			async get(id: string) {
				return documents[id] ?? null;
			},
			query(table: string) {
				let indexName = "";
				return {
					withIndex(
						name: string,
						build: (range: typeof indexRange) => unknown,
					) {
						indexName = name;
						build(indexRange);
						return {
							async unique() {
								return rows[table] ?? null;
							},
							async take() {
								if (table !== "segments") return [];
								return indexName === "by_attestation_id" &&
									patchedMembership
									? [
											{
												...(rows.segments as object),
												...(patchedMembership as object),
											},
										]
									: [rows.segments];
							},
						};
					},
				};
			},
			async insert(table: string, value: unknown) {
				if (table === "attestations") {
					insertedAttestation = value;
					documents["attestation-1"] = {
						_id: "attestation-1",
						...(value as object),
					};
				}
				if (table === "visitorClicks") insertedClick = value;
				return table === "attestations" ? "attestation-1" : "click-1";
			},
			async patch(id: string, value: unknown) {
				if (id === segmentId) patchedMembership = value;
			},
		},
	};
	const handler = (
		persistResolvedClick as unknown as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;

	await handler(ctx, {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId,
		clickedSegmentIndex: 0,
		reading: readingValue,
		readingKey,
		dictionaryPlan: { baseRevision: "convex-0", changes: [] },
		occurrence: {
			memberSegmentIndices: [0],
			attestation: {
				members: [{ attested: "Banken", orthography: "Typo" }],
				realizationCoverage: "Full",
				surface,
			},
			surfaceKey,
			lemmaKey: lemmaKeyFor(lemma),
		},
	});

	expect(insertedAttestation).toEqual({
		surfaceId,
		readingId,
		realizationCoverage: "Full",
	});
	expect(patchedMembership).toEqual({
		attestationMembership: {
			attestationId: "attestation-1",
			orthography: "Typo",
		},
	});
	expect(insertedClick).toEqual({
		requestId: "request-1",
		visitorId: "visitor-1",
		segmentId,
		attestationId: "attestation-1",
		clickedAt: expect.any(Number),
	});
});

function existingOccurrenceHarness(
	winnerMemberIndices: readonly number[] = [0],
) {
	const winnerMembers = new Set(winnerMemberIndices);
	const lemmaValue = {
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const lemma = {
		_id: "lemma-1",
		lemmaKey: lemmaKeyFor(lemmaValue),
		...lemmaValue,
	};
	const surfaceValue = {
		language: "de",
		normalizedSurface: "Banken",
		spelling: "Canonical",
		surfaceKind: "Inflection",
		surfaceFeatures: null,
		inflectionalFeatures: { case: "Nom", number: "Plur" },
		lemma: lemmaValue,
	} as const;
	const surface = {
		_id: "surface-1",
		surfaceKey: makeSurfaceId("de", surfaceValue),
		lemmaId: lemma._id,
		...surfaceValue,
	};
	const readingValue = { lemma: lemmaValue, emojiDescription: "🏦" } as const;
	const reading = {
		_id: "reading-1",
		readingKey: readingFingerprint(readingValue),
		lemmaId: lemma._id,
		emojiDescription: readingValue.emojiDescription,
	};
	const sentence = {
		_id: "sentence-1",
		segmentedSentenceId: "segmented-1",
	};
	const attestation = {
		_id: "attestation-1",
		surfaceId: surface._id,
		readingId: reading._id,
		realizationCoverage: "Full",
	};
	const segments = [
		{
			_id: "segment-0",
			sentenceId: sentence._id,
			index: 0,
			kind: "ResolvableText",
			text: "sind",
			...(winnerMembers.has(0)
				? {
						attestationMembership: {
							attestationId: attestation._id,
							orthography: "Standard" as const,
						},
					}
				: {}),
		},
		{
			_id: "segment-1",
			sentenceId: sentence._id,
			index: 1,
			kind: "Whitespace",
			text: " ",
		},
		{
			_id: "segment-2",
			sentenceId: sentence._id,
			index: 2,
			kind: "ResolvableText",
			text: "geöffnet",
			...(winnerMembers.has(2)
				? {
						attestationMembership: {
							attestationId: attestation._id,
							orthography: "Standard" as const,
						},
					}
				: {}),
		},
	];
	const documents: Record<string, unknown> = {
		[lemma._id]: lemma,
		[surface._id]: surface,
		[reading._id]: reading,
		[sentence._id]: sentence,
		[attestation._id]: attestation,
	};
	const inserted: Array<{ table: string; value: unknown }> = [];
	const ctx = {
		db: {
			async get(id: string) {
				return documents[id] ?? null;
			},
			query(table: string) {
				const conditions: Record<string, unknown> = {};
				const range = {
					eq(field: string, value: unknown) {
						conditions[field] = value;
						return range;
					},
				};
				const matchingSegments = () =>
					segments.filter((segment) =>
						Object.entries(conditions).every(([field, value]) => {
							if (
								field === "attestationMembership.attestationId"
							) {
								return (
									segment.attestationMembership
										?.attestationId === value
								);
							}
							return (
								segment[field as keyof typeof segment] === value
							);
						}),
					);
				return {
					withIndex(
						_name: string,
						build: (value: typeof range) => unknown,
					) {
						build(range);
						return {
							async unique() {
								if (table === "segments")
									return matchingSegments()[0] ?? null;
								if (table === "visitorClicks") return null;
								return null;
							},
							async take() {
								return table === "segments"
									? matchingSegments()
									: [];
							},
						};
					},
				};
			},
			async insert(table: string, value: unknown) {
				inserted.push({ table, value });
				return table === "visitorClicks" ? "click-1" : `${table}-new`;
			},
			async patch() {
				throw new Error("Existing memberships must remain immutable.");
			},
		},
	};
	return { ctx, inserted, lemmaValue, readingValue, surfaceValue };
}

test("clicked membership reuses the winner even when the losing proposal has fewer members", async () => {
	const { ctx, inserted, lemmaValue, readingValue, surfaceValue } =
		existingOccurrenceHarness([0, 2]);
	const handler = (
		persistResolvedClick as unknown as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;

	const result = await handler(ctx, {
		requestId: "request-overlap",
		visitorId: "visitor-2",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
		reading: readingValue,
		readingKey: readingFingerprint(readingValue),
		dictionaryPlan: {
			baseRevision: "stale",
			changes: [
				{
					type: "createLemma",
					record: { lemma: lemmaValue },
					preconditions: [
						{ kind: "revisionMatches", revision: "stale" },
					],
				},
			],
		},
		occurrence: {
			memberSegmentIndices: [2],
			attestation: {
				members: [{ attested: "geöffnet", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: surfaceValue,
			},
			surfaceKey: makeSurfaceId("de", surfaceValue),
			lemmaKey: lemmaKeyFor(lemmaValue),
		},
	});

	expect(result).toMatchObject({
		status: "Reused",
		attestationId: "attestation-1",
		occurrence: { reading: { emojiDescription: "🏦" } },
	});
	expect(inserted.map(({ table }) => table)).toEqual(["visitorClicks"]);
});

test("an unresolved model loser records and returns the committed winner", async () => {
	const { ctx, inserted } = existingOccurrenceHarness([0, 2]);
	const handler = (
		persistUnresolvedClick as unknown as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;

	const result = await handler(ctx, {
		requestId: "request-unresolved-race",
		visitorId: "visitor-3",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
	});

	expect(result).toMatchObject({
		status: "Reused",
		attestationId: "attestation-1",
		occurrence: {
			grammatical: {
				interaction: { memberSegmentIndices: [0, 2] },
			},
		},
	});
	expect(inserted).toEqual([
		expect.objectContaining({
			table: "visitorClicks",
			value: expect.objectContaining({
				attestationId: "attestation-1",
				segmentId: "segment-2",
			}),
		}),
	]);
});

test("partial overlap reports the committed membership and writes nothing", async () => {
	const { ctx, inserted, lemmaValue, readingValue, surfaceValue } =
		existingOccurrenceHarness();
	const handler = (
		persistResolvedClick as unknown as {
			_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
		}
	)._handler;

	const result = await handler(ctx, {
		requestId: "request-partial",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 2,
		reading: readingValue,
		readingKey: readingFingerprint(readingValue),
		dictionaryPlan: {
			baseRevision: "stale",
			changes: [
				{
					type: "createLemma",
					record: { lemma: lemmaValue },
					preconditions: [
						{ kind: "revisionMatches", revision: "stale" },
					],
				},
			],
		},
		occurrence: {
			memberSegmentIndices: [0, 2],
			attestation: {
				members: [
					{ attested: "sind", orthography: "Standard" },
					{ attested: "geöffnet", orthography: "Standard" },
				],
				realizationCoverage: "Full",
				surface: surfaceValue,
			},
			surfaceKey: makeSurfaceId("de", surfaceValue),
			lemmaKey: lemmaKeyFor(lemmaValue),
		},
	});

	expect(result).toEqual({
		status: "MembershipConflict",
		code: "partialOverlap",
		message:
			"Proposed Attestation members partially overlap committed membership.",
		conflictingAttestationIds: ["attestation-1"],
	});
	expect(inserted).toEqual([]);
});
