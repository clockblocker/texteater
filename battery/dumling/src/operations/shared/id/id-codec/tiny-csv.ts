import type { ApiResult, IdDecodeError } from "../../../api-shape.js";
import { idError } from "../id-errors.js";
import { csvRow, parseCsvRow } from "./readable-csv.js";
import {
	entityKindTokens,
	languageTokens,
	surfaceKindTokens,
} from "./tiny-tokens.js";

type TinyResult = ApiResult<string, IdDecodeError>;

function malformed(message: string): TinyResult {
	return { success: false, error: idError("MalformedId", message) };
}

function invalid(message: string): TinyResult {
	return { success: false, error: idError("InvalidPayload", message) };
}

function inverse<T extends Record<string, string>>(
	tokens: T,
): Record<string, keyof T & string> {
	return Object.fromEntries(
		Object.entries(tokens).map(([long, short]) => [short, long]),
	) as Record<string, keyof T & string>;
}

const languagesByToken = inverse(languageTokens);
const surfaceKindsByToken = inverse(surfaceKindTokens);
const entityKindsByToken = inverse(entityKindTokens);

export function readableCsvToTinyCsv(input: string): string {
	const parsed = parseCsvRow(input, { requireCanonical: true });
	if (!parsed.success) throw new Error(parsed.error.message);
	const fields = parsed.data;

	if (fields[0] === "Lemma") {
		const language =
			languageTokens[fields[1] as keyof typeof languageTokens];
		if (!language) throw new Error("Unsupported Lemma language");
		return csvRow([
			"v3",
			entityKindTokens.Lemma,
			language,
			...fields.slice(2),
		]);
	}
	if (fields[0] === "Selection") {
		return csvRow(["v3", entityKindTokens.Selection, fields[1], fields[2]]);
	}
	if (fields[0] !== "Surface") {
		throw new Error(
			"Readable CSV row must start with Lemma, Surface, or Selection",
		);
	}

	const language = languageTokens[fields[1] as keyof typeof languageTokens];
	const surfaceKind =
		surfaceKindTokens[fields[2] as keyof typeof surfaceKindTokens];
	if (!language || !surfaceKind) {
		throw new Error("Readable Surface CSV contains unsupported metadata");
	}
	return csvRow([
		"v3",
		entityKindTokens.Surface,
		language,
		surfaceKind,
		...fields.slice(3),
	]);
}

export function tinyCsvToReadableCsv(input: string): TinyResult {
	const parsed = parseCsvRow(input, { requireCanonical: true });
	if (!parsed.success) {
		return input.startsWith("v3,")
			? parsed
			: malformed("Base64url payload is not tiny CSV");
	}
	const fields = parsed.data;
	if (fields[0] !== "v3") {
		return fields[0]?.startsWith("v")
			? malformed(`Unsupported tiny CSV version ${fields[0]}`)
			: malformed("Base64url payload is not tiny CSV");
	}

	const kind = entityKindsByToken[fields[1] ?? ""];
	if (kind === "Lemma") {
		const language = languagesByToken[fields[2] ?? ""];
		return fields.length === 7 && language
			? {
					success: true,
					data: csvRow([kind, language, ...fields.slice(3)]),
				}
			: invalid("Tiny Lemma identity is invalid");
	}
	if (kind === "Selection") {
		return fields.length === 4
			? {
					success: true,
					data: csvRow([kind, fields[2], fields[3]]),
				}
			: invalid("Tiny Selection identity is invalid");
	}
	if (kind !== "Surface") return invalid("Tiny row kind is invalid");

	const language = languagesByToken[fields[2] ?? ""];
	const surfaceKind = surfaceKindsByToken[fields[3] ?? ""];
	const isInflection = surfaceKind === "Inflection";
	if (!language || !surfaceKind || fields.length !== (isInflection ? 7 : 6)) {
		return invalid("Tiny Surface identity metadata is invalid");
	}
	return {
		success: true,
		data: csvRow(["Surface", language, surfaceKind, ...fields.slice(4)]),
	};
}
