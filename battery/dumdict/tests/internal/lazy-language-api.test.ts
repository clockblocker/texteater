import { describe, expect, test } from "bun:test";
import { runRepresentativeOperation } from "../../../../tooling/dum-entrypoint-rss/operations";
import { createLazyLanguageApiRecord } from "../../src/lazy-language-api";
import { applyDumdictKnowledgeChange } from "../../src/runtime";

describe("lazy language API record", () => {
	test("keeps ordered enumerable keys and constructs each language at most once", () => {
		const constructed: string[] = [];
		const lazy = createLazyLanguageApiRecord(["de", "en", "he"] as const, {
			de: () => {
				constructed.push("de");
				return Object.freeze({ language: "de" as const });
			},
			en: () => {
				constructed.push("en");
				return Object.freeze({ language: "en" as const });
			},
			he: () => {
				constructed.push("he");
				return Object.freeze({ language: "he" as const });
			},
		});
		expect(Object.keys(lazy.record)).toEqual(["de", "en", "he"]);
		expect(constructed).toEqual([]);
		const en = lazy.get("en");
		expect(lazy.record.en).toBe(en);
		expect(lazy.get("en")).toBe(en);
		expect(constructed).toEqual(["en"]);
		expect(
			Object.entries(lazy.record).map(([language]) => language),
		).toEqual(["de", "en", "he"]);
		expect(constructed).toEqual(["en", "de", "he"]);
	});

	test("the root representative operation does not initialize a facade language", async () => {
		const constructed: string[] = [];
		const lazy = createLazyLanguageApiRecord(["de", "en", "he"] as const, {
			de: () => constructed.push("de"),
			en: () => constructed.push("en"),
			he: () => constructed.push("he"),
		});
		await runRepresentativeOperation("dumdict.apply-knowledge-change", {
			applyDumdictKnowledgeChange,
			dumling: lazy.record,
			getLanguageApi: lazy.get,
		});
		expect(constructed).toEqual([]);
	});
});
