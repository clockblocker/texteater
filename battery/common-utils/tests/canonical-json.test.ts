import { describe, expect, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { canonicalJson } from "../src/index.js";

describe("canonicalJson key order", () => {
	test("sorts keys at every depth, whatever order they were written in", () => {
		const left = { b: 1, a: { d: [{ y: 1, x: 2 }], c: null } };
		const right = { a: { c: null, d: [{ x: 2, y: 1 }] }, b: 1 };
		expect(canonicalJson(left)).toBe(
			'{"a":{"c":null,"d":[{"x":2,"y":1}]},"b":1}',
		);
		expect(canonicalJson(right)).toBe(canonicalJson(left));
	});

	test("orders by UTF-16 code unit, not by locale", () => {
		expect(canonicalJson({ a: 1, B: 2, _: 3, Z: 4, "": 5 })).toBe(
			'{"":5,"B":2,"Z":4,"_":3,"a":1}',
		);
		expect(canonicalJson({ ä: 1, z: 2, Ä: 3 })).toBe('{"z":2,"Ä":3,"ä":1}');
	});

	test("matches RFC 8785's sorting example", () => {
		// RFC 8785 section 3.2.3: keys holding U+20AC, U+000D, U+FB33,
		// "1", U+1F600 and U+0080 sort by their UTF-16 code units, so the
		// astral U+1F600 (a surrogate pair from 0xD83D) sorts before U+FB33.
		const value = {
			"€": "Euro Sign",
			"\r": "Carriage Return",
			דּ: "Hebrew Letter Dalet With Dagesh",
			"1": "One",
			"\u{1f600}": "Emoji: Grinning Face",
			"\u0080": "Control",
			ö: "Latin Small Letter O With Diaeresis",
		};
		// Read the keys off the text: Object.keys would put "1" first.
		const keys = [...canonicalJson(value).matchAll(/"([^"]*)":"/gu)].map(
			([, key]) => JSON.parse(`"${key}"`),
		);
		expect(keys).toEqual([
			"\r",
			"1",
			"\u0080",
			"\u00f6",
			"\u20ac",
			"\u{1f600}",
			"\ufb33",
		]);
	});

	test("keeps array order", () => {
		expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
	});
});

describe("canonicalJson values", () => {
	test("writes JSON's own types as JSON.stringify writes them", () => {
		expect(canonicalJson(null)).toBe("null");
		expect(canonicalJson(true)).toBe("true");
		expect(canonicalJson(false)).toBe("false");
		expect(canonicalJson(0)).toBe("0");
		expect(canonicalJson(-0)).toBe("0");
		expect(canonicalJson(1e21)).toBe("1e+21");
		expect(canonicalJson(0.1 + 0.2)).toBe("0.30000000000000004");
		expect(canonicalJson('a"b\\c\n\u0001')).toBe(
			JSON.stringify('a"b\\c\n\u0001'),
		);
		expect(canonicalJson("\ud800")).toBe('"\\ud800"');
		expect(canonicalJson({})).toBe("{}");
		expect(canonicalJson([])).toBe("[]");
	});

	test("leaves out members holding undefined, as JSON.stringify does", () => {
		expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
		expect(canonicalJson({ a: undefined })).toBe(canonicalJson({}));
		expect(canonicalJson({ nested: { a: undefined } })).toBe(
			'{"nested":{}}',
		);
	});

	test("accepts null-prototype objects and objects from another realm", () => {
		const bare = Object.assign(Object.create(null), { b: 2, a: 1 });
		expect(canonicalJson(bare)).toBe('{"a":1,"b":2}');
		const foreign = runInNewContext("({ b: [2], a: { c: 1 } })");
		expect(canonicalJson(foreign)).toBe('{"a":{"c":1},"b":[2]}');
	});

	test("writes a shared but acyclic object at each place it appears", () => {
		const shared = { x: 1 };
		expect(canonicalJson({ a: shared, b: [shared] })).toBe(
			'{"a":{"x":1},"b":[{"x":1}]}',
		);
	});

	test("ignores symbol keys, as JSON.stringify does", () => {
		expect(canonicalJson({ [Symbol("s")]: 1, a: 2 })).toBe('{"a":2}');
	});
});

describe("canonicalJson rejects what JSON can't hold", () => {
	test.each([
		["undefined", undefined, "undefined at $"],
		["NaN", Number.NaN, "NaN at $"],
		["Infinity", Number.POSITIVE_INFINITY, "Infinity at $"],
		["-Infinity", Number.NEGATIVE_INFINITY, "-Infinity at $"],
		["a bigint", 1n, "a bigint at $"],
		["a function", () => 1, "a function at $"],
		["a symbol", Symbol("s"), "a symbol at $"],
		["a Date", new Date(0), "a Date object at $"],
		["a Map", new Map(), "a Map object at $"],
		["a Set", new Set(), "a Set object at $"],
		["a class instance", new (class Point {})(), "a Point object at $"],
	])("%s", (_name, value, message) => {
		expect(() => canonicalJson(value)).toThrow(TypeError);
		expect(() => canonicalJson(value)).toThrow(
			`Canonical JSON cannot hold ${message}`,
		);
	});

	test("undefined as an array element or a hole", () => {
		expect(() => canonicalJson([1, undefined])).toThrow(
			"Canonical JSON cannot hold undefined at $[1]",
		);
		// biome-ignore lint/suspicious/noSparseArray: the hole is the case
		expect(() => canonicalJson([1, , 3])).toThrow(
			"Canonical JSON cannot hold undefined at $[1]",
		);
	});

	test("names the path of a nested value", () => {
		expect(() =>
			canonicalJson({ a: [{ "b-c": { d: Number.NaN } }] }),
		).toThrow('Canonical JSON cannot hold NaN at $.a[0]["b-c"].d');
	});

	test("a cycle", () => {
		const cyclic: Record<string, unknown> = { a: 1 };
		cyclic.self = { back: cyclic };
		expect(() => canonicalJson(cyclic)).toThrow(
			"Canonical JSON cannot hold a cycle at $.self.back",
		);
		const loop: unknown[] = [];
		loop.push(loop);
		expect(() => canonicalJson(loop)).toThrow(
			"Canonical JSON cannot hold a cycle at $[0]",
		);
	});
});
