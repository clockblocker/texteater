import { describe, expect, test } from "bun:test";
import { dangerouslyHeavyCompactEmojiSequencePatternForAbout100MiBRss as compactEmojiSequencePattern } from "dumling/dangerously-heavy-schema-tree";
import {
	actualDumlingCompatibilityValidationRouteKeys,
	compileDumdictValidationArtifacts,
} from "../../codegen/validation-artifacts";
import { encodedDumdictValidationArtifacts } from "../../src/generated/validation-artifacts";
import {
	COMPACT_EMOJI_PATTERN_TOKEN,
	collectCompactConstraintStringTable,
	compactExternalStringSignature,
	decodeCompactConstraintPayload,
	encodeCompactConstraintPayload,
	readCompactIndexedPayload,
	replaceCompactStringWithExternalToken,
	resolveCompactExternalString,
} from "../../src/parsing/compact-validation-payload";
import { decodeDumdictValidationArtifact } from "../../src/parsing/lightweight-parsers";

describe("compact Dumdict validation payload", () => {
	test("emits every actual Dumling compatibility leaf exactly once", () => {
		const emittedCompatibilityRoutes =
			encodedDumdictValidationArtifacts.routeIndexPayload
				.split("\n")
				.slice(1)
				.map((entry) => entry.slice(0, entry.indexOf("\0")))
				.filter((route) => route.startsWith("internal:dumling:"))
				.toSorted();
		expect(emittedCompatibilityRoutes).toEqual(
			actualDumlingCompatibilityValidationRouteKeys,
		);
		expect(emittedCompatibilityRoutes).toHaveLength(360);
		expect(new Set(emittedCompatibilityRoutes).size).toBe(360);
	});

	test("deterministically round-trips every definition and public/private root", () => {
		const compiled = compileDumdictValidationArtifacts();
		const operations = compiled.requiredOperations;
		const constraints = [
			...Object.values(compiled.definitions),
			...Object.values(compiled.roots),
		];
		const externalSource = compactEmojiSequencePattern.source;
		const stringTable = collectCompactConstraintStringTable(constraints, [
			externalSource,
		]);
		expect(stringTable.some((value) => value.length > 1_000)).toBe(false);
		const signatures = {
			[COMPACT_EMOJI_PATTERN_TOKEN]: compactExternalStringSignature(
				externalSource,
				compactEmojiSequencePattern.flags,
			),
		};
		const maximumReferenceIndex =
			Object.keys(compiled.definitions).length - 1;
		for (const constraint of constraints) {
			const first = replaceCompactStringWithExternalToken(
				encodeCompactConstraintPayload(
					constraint,
					operations,
					stringTable,
				),
				externalSource,
				COMPACT_EMOJI_PATTERN_TOKEN,
			);
			const decoded = decodeCompactConstraintPayload(first, operations, {
				externalString: (token, context) =>
					resolveCompactExternalString(
						token,
						context,
						signatures,
						() => externalSource,
					),
				maximumReferenceIndex,
				stringTable,
			});
			expect(decoded).toEqual(constraint);
			expect(
				replaceCompactStringWithExternalToken(
					encodeCompactConstraintPayload(
						decoded,
						operations,
						stringTable,
					),
					externalSource,
					COMPACT_EMOJI_PATTERN_TOKEN,
				),
			).toBe(first);
		}
	});

	test("fails closed for missing, unknown, and mismatched external regex tokens", () => {
		const payload = `["p",["s"],[["g",["x","${COMPACT_EMOJI_PATTERN_TOKEN}"],""]]]`;
		expect(() =>
			decodeCompactConstraintPayload(payload, [], {
				maximumReferenceIndex: 0,
			}),
		).toThrow("No resolver");
		expect(() =>
			resolveCompactExternalString("unknown", "", {}, () => "value"),
		).toThrow("Unknown compact external-string token");
		expect(() =>
			resolveCompactExternalString(
				COMPACT_EMOJI_PATTERN_TOKEN,
				"",
				{ [COMPACT_EMOJI_PATTERN_TOKEN]: "v1:corrupt" },
				() => compactEmojiSequencePattern.source,
			),
		).toThrow("signature mismatch");
	});

	test("rejects unknown opcodes, operation indexes, references, and string-table entries", () => {
		const operations = ["known.operation"] as const;
		expect(() =>
			decodeCompactConstraintPayload('["!"]', operations, {
				maximumReferenceIndex: 0,
			}),
		).toThrow("opcode");
		expect(() =>
			decodeCompactConstraintPayload(
				'["p",["s"],[["x",1]]]',
				operations,
				{
					maximumReferenceIndex: 0,
				},
			),
		).toThrow("operation");
		expect(() =>
			decodeCompactConstraintPayload('["r",1]', operations, {
				maximumReferenceIndex: 0,
			}),
		).toThrow("reference");
		expect(() =>
			decodeCompactConstraintPayload('["l",["t",1]]', operations, {
				maximumReferenceIndex: 0,
				stringTable: ["known"],
			}),
		).toThrow("string-table index is out of range");
		expect(() =>
			decodeCompactConstraintPayload('["l",["t",{}]]', operations, {
				maximumReferenceIndex: 0,
				stringTable: ["known"],
			}),
		).toThrow("must be a finite number");
		expect(() =>
			decodeCompactConstraintPayload(
				'["u",[["s"]],"extra"]',
				operations,
				{ maximumReferenceIndex: 0 },
			),
		).toThrow("union constraint");
	});

	test("fails closed for malformed, overlapping, and out-of-range indexed payload boundaries", () => {
		const read = (
			overrides: Partial<
				Parameters<typeof readCompactIndexedPayload>[0]
			> = {},
		) =>
			readCompactIndexedPayload({
				index: 0,
				indexPayload: "00",
				label: "n0",
				offsetPayload: "0002",
				offsetWidth: 2,
				payloadBlob: "ok",
				...overrides,
			});
		expect(read()).toBe("ok");
		expect(() => read({ index: 1 })).toThrow(
			"Unknown compact payload index",
		);
		expect(() => read({ indexPayload: "01" })).toThrow(
			"Unknown compact payload index",
		);
		expect(() => read({ indexPayload: "!0" })).toThrow(
			"Corrupt compact payload offset",
		);
		expect(() =>
			read({ offsetPayload: "0201", payloadBlob: "abc" }),
		).toThrow("Corrupt compact payload boundary");
		expect(() =>
			read({ offsetPayload: "0202", payloadBlob: "abc" }),
		).toThrow("Corrupt compact payload boundary");
		expect(() => read({ offsetPayload: "0003" })).toThrow(
			"Corrupt compact payload boundary",
		);
		expect(() => read({ offsetWidth: 0 })).toThrow("positive integer");
	});

	test("shares lazy definitions and decoded roots across parser calls", () => {
		const first = decodeDumdictValidationArtifact("parseAsReadingEntry:en");
		const second = decodeDumdictValidationArtifact(
			"parseAsReadingEntry:en",
		);
		const other = decodeDumdictValidationArtifact("parseAsLemmaRecord:de");
		expect(first.definitions).toBe(second.definitions);
		expect(first.definitions).toBe(other.definitions);
		expect(first.root).toBe(second.root);
		expect(Object.isFrozen(first.root)).toBe(true);
		const referenced = first.definitions?.n0;
		expect(Object.isFrozen(referenced)).toBe(true);
		const compiled = compileDumdictValidationArtifacts();
		for (const [reference, constraint] of Object.entries(
			compiled.definitions,
		)) {
			expect(first.definitions?.[reference]).toEqual(constraint);
			expect(Object.isFrozen(first.definitions?.[reference])).toBe(true);
		}
		const payloadReferences = new Map<string, string>();
		let duplicate: readonly [string, string] | undefined;
		for (const [reference, constraint] of Object.entries(
			compiled.definitions,
		)) {
			const payload = JSON.stringify(constraint);
			const firstReference = payloadReferences.get(payload);
			if (firstReference !== undefined) {
				duplicate = [firstReference, reference];
				break;
			}
			payloadReferences.set(payload, reference);
		}
		if (duplicate === undefined)
			throw new Error("Expected duplicate compiled definitions.");
		expect(first.definitions?.[duplicate[0]]).toBe(
			first.definitions?.[duplicate[1]],
		);
		for (let attempt = 0; attempt < 2; attempt += 1) {
			expect(() =>
				decodeDumdictValidationArtifact(
					"missing" as "parseAsReadingEntry:en",
				),
			).toThrow("Unknown generated Dumdict parser root");
		}
	});
});
