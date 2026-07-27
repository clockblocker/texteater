import { describe, expect, it } from "bun:test";
import { dumling } from "../../src";
import { schemasFor } from "../../src/schema";
import type { Lemma, Selection } from "../../src/types";

function encodeBase64Url(value: string) {
	return Buffer.from(value, "utf8")
		.toString("base64")
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/u, "");
}

describe("API", () => {
	it("creates, converts, extracts, and describes german entities", () => {
		const lemma = dumling.de.create.lemma({
			language: "he",
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🌊",
		});

		const surface = dumling.de.convert.lemma.toSurface(
			lemma as Lemma<"de", "Lexeme", "NOUN">,
		);
		const selection: Selection<"de"> =
			dumling.de.convert.surface.toSelection(surface, {
				spelledSelection: "See",
			});

		expect(lemma.language).toBe("de");
		expect(surface.normalizedFullSurface).toBe("See");
		expect(selection.selectionFeatures).toBeUndefined();
		expect(dumling.de.extract.lemma(selection)).toBe(lemma);
		expect(dumling.de.describe.as.lemma(selection)).toEqual({
			language: "de",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
		});
		expect(dumling.de.describe.as.surface(lemma)).toEqual({
			language: "de",
			surfaceKind: "Citation",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
		});
		expect(dumling.de.describe.as.selection(surface)).toEqual({
			language: "de",
			surfaceKind: "Citation",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
		});
		expect(String(dumling.de.describe.asCsv.lemma(selection))).toBe(
			"Lemma,de,Lexeme,NOUN",
		);
		expect(String(dumling.de.describe.asCsv.surface(lemma))).toBe(
			"Surface,de,Citation,Lexeme,NOUN",
		);
		expect(String(dumling.de.describe.asCsv.selection(surface))).toBe(
			"Selection,de,Citation,Lexeme,NOUN",
		);
	});

	it("ignores caller-supplied namespace-implied fields in create operations", () => {
		const lemma = dumling.de.create.lemma({
			language: "he",
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "🌊",
		});

		const citationSurface = dumling.de.create.surface.citation({
			language: "he",
			surfaceKind: "Inflection",
			normalizedFullSurface: "See",
			lemma: {
				...lemma,
				language: "he",
			},
		} as unknown as Parameters<
			typeof dumling.de.create.surface.citation
		>[0]);

		const typoSelection = dumling.de.create.selection({
			language: "he",
			selectionFeatures: { orthography: "Typo" },
			spelledSelection: "Sse",

			surface: {
				...citationSurface,
				language: "en",
			},
		} as unknown as Parameters<typeof dumling.de.create.selection>[0]);

		expect(lemma.language).toBe("de");
		expect(citationSurface.language).toBe(citationSurface.lemma.language);
		expect(citationSurface.surfaceKind).toBe("Citation");
		expect(typoSelection.language).toBe(typoSelection.surface.language);
		expect(typoSelection.selectionFeatures).toEqual({
			orthography: "Typo",
		});
	});

	it("uses the current selection defaults in conversions", () => {
		const lemma = dumling.de.create.lemma({
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "🌊",
		});

		const fromLemma = dumling.de.convert.lemma.toSelection(lemma);
		const fromSurface = dumling.de.convert.surface.toSelection(
			dumling.de.convert.lemma.toSurface(lemma),
		);

		expect(fromLemma.selectionFeatures).toBeUndefined();
		expect(fromLemma.spelledSelection).toBe("See");
		expect(fromSurface).toEqual(fromLemma);
	});

	it("rejects empty public feature bags in create and convert operations", () => {
		const lemma = dumling.de.create.lemma({
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "🌊",
		});
		const citationSurface = dumling.de.create.surface.citation({
			lemma,
			normalizedFullSurface: "See",
		});
		const verbLemma = dumling.de.create.lemma({
			canonicalLemma: "gehen",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🚶",
		});

		expect(() =>
			dumling.de.create.surface.citation({
				lemma,
				normalizedFullSurface: "See",
				surfaceFeatures: {},
			}),
		).toThrow("surfaceFeatures must contain at least one marked value");
		expect(() =>
			dumling.de.create.surface.inflection({
				lemma: verbLemma,
				normalizedFullSurface: "geht",
				surfaceFeatures: {},
				inflectionalFeatures: {
					number: "Sing",
					person: "3",
					tense: "Pres",
					verbForm: "Fin",
				},
			}),
		).toThrow("surfaceFeatures must contain at least one marked value");
		expect(() =>
			dumling.de.create.selection({
				surface: citationSurface,
				spelledSelection: "See",
				selectionFeatures: {},
			}),
		).toThrow("selectionFeatures must contain at least one marked value");
		expect(() =>
			dumling.de.convert.lemma.toSelection(lemma, {
				selectionFeatures: {},
			}),
		).toThrow("selectionFeatures must contain at least one marked value");
		expect(() =>
			dumling.de.convert.surface.toSelection(citationSurface, {
				selectionFeatures: {},
			}),
		).toThrow("selectionFeatures must contain at least one marked value");
	});

	it("encodes citation surfaces to the readable ID CSV row shape", () => {
		const lemma = dumling.de.create.lemma({
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
			},
			meaningInEmojis: "🌊",
		});
		const surface = dumling.de.convert.lemma.toSurface(lemma);

		expect(String(dumling.de.id.encode.asCsv(surface))).toBe(
			"Surface,Citation,see,Lemma,de,Lexeme,NOUN,see,🌊,gender=Masc",
		);
	});

	it("parses readable citation surface CSV rows through the language schema", () => {
		const parsed = dumling.de.id.decode.asSurface(
			"Surface,Citation,See,Lemma,de,Lexeme,NOUN,See,🌊,gender=Masc",
		);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			throw new Error(parsed.error.message);
		}
		expect(parsed.data.surface).toEqual({
			language: "de",
			normalizedFullSurface: "see",
			surfaceKind: "Citation",
			lemma: {
				language: "de",
				canonicalLemma: "see",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: {
					gender: "Masc",
				},
				meaningInEmojis: "🌊",
			},
		});
	});

	it("round-trips inflection surfaces with readable CSV feature sets", () => {
		const lemma = dumling.en.create.lemma({
			canonicalLemma: "run",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {},
			meaningInEmojis: "🏃",
		});
		const surface = dumling.en.create.surface.inflection({
			lemma,
			normalizedFullSurface: "ran",
			inflectionalFeatures: {
				tense: "Past",
				verbForm: "Fin",
			},
		});

		const csv = dumling.en.id.encode.asCsv(surface);
		const parsed = dumling.en.id.decode.asSurface(csv);

		expect(String(csv)).toBe(
			"Surface,Inflection,ran,tense=Past|verbForm=Fin,Lemma,en,Lexeme,VERB,run,🏃,",
		);
		expect(parsed).toEqual({
			success: true,
			data: {
				format: "csv",
				language: "en",
				kind: "Surface",
				surface,
			},
		});
	});

	it("encodes readable CSV IDs as base64url tiny CSV IDs", () => {
		const surface = dumling.de.convert.lemma.toSurface(
			dumling.de.create.lemma({
				canonicalLemma: "See",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: {
					gender: "Masc",
				},
				meaningInEmojis: "🌊",
			}),
		);
		const encoded = dumling.de.id.encode.asBase64Url(surface);
		const parsed = dumling.de.id.decode.asSurface(encoded);

		expect(encoded).not.toContain("=");
		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			throw new Error(parsed.error.message);
		}
		expect(parsed.data.format).toBe("base64url");
		expect(parsed.data.surface.normalizedFullSurface).toBe("see");
	});

	it("parses normalized german DTOs and exposes schema leaves", () => {
		const parsedLemma = dumling.de.parse.lemma({
			language: "de",
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				gender: "Masc",
				unexpected: "x",
			},
			meaningInEmojis: "🌊",
		});

		expect(parsedLemma.success).toBe(true);
		if (!parsedLemma.success) {
			throw new Error(parsedLemma.error.message);
		}
		expect(parsedLemma.data.canonicalLemma).toBe("see");
		expect(parsedLemma.data.inherentFeatures).toEqual({
			gender: "Masc",
		});

		const parsedSelection = dumling.de.parse.selection({
			language: "de",
			spelledSelection: "See",

			surface: {
				language: "de",
				normalizedFullSurface: "See",
				surfaceKind: "Citation",
				lemma: parsedLemma.data,
			},
		});

		expect(parsedSelection.success).toBe(true);
		expect(
			schemasFor.de.entity.Selection.Citation.Lexeme.NOUN().safeParse(
				parsedSelection.success ? parsedSelection.data : undefined,
			).success,
		).toBe(true);
	});

	it("rejects known-but-context-illegal inherent feature keys", () => {
		const result = dumling.de.parse.lemma({
			language: "de",
			canonicalLemma: "See",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {
				tense: "Past",
			},
			meaningInEmojis: "🌊",
		});

		expect(result.success).toBe(false);
		if (result.success) {
			throw new Error("expected invalid parse result");
		}
		expect(result.error.code).toBe("InvalidInput");
	});

	it("rejects empty inflectional features after stripping unknown keys", () => {
		const result = dumling.de.parse.surface({
			language: "de",
			normalizedFullSurface: "Ging",
			surfaceKind: "Inflection",
			lemma: {
				language: "de",
				canonicalLemma: "gehen",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {},
				meaningInEmojis: "🚶",
			},
			inflectionalFeatures: {
				unknown: "x",
			},
		});

		expect(result.success).toBe(false);
		if (result.success) {
			throw new Error("expected invalid parse result");
		}
		expect(result.error.code).toBe("InvalidInput");
		expect(
			result.error.issues?.some((issue) =>
				issue.includes("inflectionalFeatures"),
			),
		).toBe(true);
	});

	it("rejects known-but-illegal german verbal inflection keys", () => {
		const result = dumling.de.parse.surface({
			language: "de",
			normalizedFullSurface: "gehen",
			surfaceKind: "Inflection",
			lemma: {
				language: "de",
				canonicalLemma: "gehen",
				lemmaKind: "Lexeme",
				lemmaSubKind: "VERB",
				inherentFeatures: {},
				meaningInEmojis: "🚶",
			},
			inflectionalFeatures: {
				verbForm: "Inf",
				gender: "Masc",
			},
		});

		expect(result.success).toBe(false);
		if (result.success) {
			throw new Error("expected invalid parse result");
		}
		expect(result.error.code).toBe("InvalidInput");
	});

	it("round-trips german ids and exposes english and hebrew language behavior", () => {
		const selection = dumling.de.parse.selection({
			language: "de",
			selectionFeatures: { orthography: "Typo", coverage: "Partial" },
			spelledSelection: "Sse",

			surface: {
				language: "de",
				normalizedFullSurface: "See",
				surfaceKind: "Citation",
				lemma: {
					language: "de",
					canonicalLemma: "see",
					lemmaKind: "Lexeme",
					lemmaSubKind: "NOUN",
					inherentFeatures: {
						gender: "Masc",
					},
					meaningInEmojis: "🌊",
				},
			},
		});

		expect(selection.success).toBe(true);
		if (!selection.success) {
			throw new Error(selection.error.message);
		}

		const id = dumling.de.id.encode.asBase64Url(selection.data);
		const decoded = dumling.de.id.decode.any(id);
		const decodedAs = dumling.de.id.decode.asSelection(id);

		expect(decoded.success).toBe(true);
		expect(decodedAs.success).toBe(true);
		if (!decoded.success || !decodedAs.success) {
			throw new Error("expected successful decode");
		}
		expect(decoded.data.kind).toBe("Selection");
		expect(decodedAs.data.selection).toEqual(selection.data);

		const englishLemma = dumling.en.create.lemma({
			canonicalLemma: "see",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
			inherentFeatures: {},
			meaningInEmojis: "👀",
		});
		expect(englishLemma.language).toBe("en");
		expect(dumling.en.parse.lemma(englishLemma)).toEqual({
			success: true,
			data: englishLemma,
		});
		expect(
			schemasFor.en.entity.Selection.Citation.Lexeme.NOUN().safeParse(
				dumling.en.convert.lemma.toSelection(englishLemma),
			).success,
		).toBe(true);

		const hebrewLemma = dumling.he.create.lemma({
			canonicalLemma: "כתב",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
			inherentFeatures: {
				hebBinyan: "PAAL",
			},
			meaningInEmojis: "✍️",
		});
		expect(hebrewLemma.language).toBe("he");
		expect(dumling.he.parse.lemma(hebrewLemma)).toEqual({
			success: true,
			data: hebrewLemma,
		});
		expect(
			schemasFor.he.entity.Selection.Citation.Lexeme.VERB().safeParse(
				dumling.he.convert.lemma.toSelection(hebrewLemma),
			).success,
		).toBe(true);
	});

	it("reports decode failures for malformed ids and mismatched entity kinds", () => {
		expect(dumling.de.id.decode.any("dumling:%")).toEqual({
			success: false,
			error: {
				code: "MalformedId",
				message: "ID is not valid base64url",
			},
		});

		expect(dumling.de.id.decode.any(encodeBase64Url("not tiny"))).toEqual({
			success: false,
			error: {
				code: "MalformedId",
				message: "Base64url payload is not tiny CSV",
			},
		});

		const invalidPayloadId = encodeBase64Url("v1,l,de,l,n,see");

		expect(dumling.de.id.decode.any(invalidPayloadId)).toEqual({
			success: false,
			error: {
				code: "InvalidPayload",
				message: "Tiny Lemma rows must contain 8 fields",
			},
		});

		const selection = dumling.de.convert.lemma.toSelection(
			dumling.de.create.lemma({
				canonicalLemma: "See",
				lemmaKind: "Lexeme",
				lemmaSubKind: "NOUN",
				inherentFeatures: {},
				meaningInEmojis: "🌊",
			}),
		);
		const selectionId = dumling.de.id.encode.asBase64Url(selection);

		expect(dumling.de.id.decode.asLemma(selectionId)).toEqual({
			success: false,
			error: {
				code: "EntityMismatch",
				message: "Expected Lemma, received Selection",
			},
		});
	});
});
