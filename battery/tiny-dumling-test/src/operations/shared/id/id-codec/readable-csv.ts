import type {
	Lemma,
	LemmaIdentity,
	SupportedLanguage,
	Surface,
	SurfaceIdentity,
} from "../../../../types/public-types.js";
import type { ApiResult, IdDecodeError } from "../../../api-shape.js";
import { isSupportedLanguage } from "../../language-inventory.js";
import { idError } from "../id-errors.js";

type CsvValue = string | number | boolean | null | undefined;
type CsvEntity<L extends SupportedLanguage> = Lemma<L> | Surface<L>;

type IdentityParser<L extends SupportedLanguage> = {
	lemma(input: unknown): ApiResult<Lemma<L>, { message: string }>;
	surface(input: unknown): ApiResult<Surface<L>, { message: string }>;
};

export type ReadableCsvDecodeSuccess<L extends SupportedLanguage> =
	| {
			kind: "Lemma";
			language: L;
			lemmaIdentity: LemmaIdentity<L>;
	  }
	| {
			kind: "Surface";
			language: L;
			surfaceIdentity: SurfaceIdentity<L>;
	  };

function invalidPayload(message: string): ApiResult<never, IdDecodeError> {
	return {
		success: false,
		error: idError("InvalidPayload", message),
	};
}

function csvField(value: CsvValue): string {
	const text = value == null ? "" : String(value);
	if (!/[",\r\n]/u.test(text)) return text;
	return `"${text.replaceAll('"', '""')}"`;
}

export function csvRow(fields: readonly CsvValue[]): string {
	return fields.map(csvField).join(",");
}

export function parseCsvRow(
	input: string,
	options: { requireCanonical?: boolean } = {},
): ApiResult<string[], IdDecodeError> {
	const fields: string[] = [];
	let field = "";
	let inQuotes = false;
	let closedQuote = false;

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];
		if (inQuotes) {
			if (character === '"') {
				if (input[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					inQuotes = false;
					closedQuote = true;
				}
			} else {
				field += character;
			}
			continue;
		}
		if (character === ",") {
			fields.push(field);
			field = "";
			closedQuote = false;
			continue;
		}
		if (closedQuote) return invalidPayload("CSV quotes must end a field");
		if (character === '"') {
			if (field.length > 0) {
				return invalidPayload(
					"CSV quotes must start at the beginning of a field",
				);
			}
			inQuotes = true;
			continue;
		}
		field += character;
	}

	if (inQuotes) {
		return invalidPayload("CSV row contains an unterminated quote");
	}
	fields.push(field);
	if (options.requireCanonical && csvRow(fields) !== input) {
		return invalidPayload("CSV row is not canonical");
	}
	return { success: true, data: fields };
}

function canonicalizeJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value
			.map(canonicalizeJsonValue)
			.sort((left, right) =>
				JSON.stringify(left).localeCompare(JSON.stringify(right)),
			);
	}
	if (typeof value !== "object" || value === null) return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, nested]) => [key, canonicalizeJsonValue(nested)]),
	);
}

function canonicalJson(value: unknown): string {
	return JSON.stringify(canonicalizeJsonValue(value));
}

function assertNoDuplicateValues(
	features: Record<string, unknown>,
	context: string,
) {
	for (const [key, value] of Object.entries(features)) {
		if (!Array.isArray(value)) continue;
		const values = value.map(String);
		if (new Set(values).size !== values.length) {
			throw new Error(`${context}.${key} contains duplicate values`);
		}
	}
}

export function assertEntityIdFeatureConstraints(
	entity: Lemma<SupportedLanguage> | Surface<SupportedLanguage>,
) {
	const lemma = "surfaceKind" in entity ? entity.lemma : entity;
	assertNoDuplicateValues(
		lemma.coreFeatures as Record<string, unknown>,
		"coreFeatures",
	);

	if ("surfaceKind" in entity && "inflectionalFeatures" in entity) {
		assertNoDuplicateValues(
			entity.inflectionalFeatures as Record<string, unknown>,
			"inflectionalFeatures",
		);
	}
}

function parseCanonicalJson(
	input: string,
	context: string,
): ApiResult<unknown, IdDecodeError> {
	let value: unknown;
	try {
		value = JSON.parse(input);
	} catch {
		return invalidPayload(`${context} must be valid JSON`);
	}
	if (canonicalJson(value) !== input) {
		return invalidPayload(`${context} JSON is not canonical`);
	}
	return { success: true, data: value };
}

function assertLanguageForNamespace<L extends SupportedLanguage>(
	namespaceLanguage: L,
	payloadLanguage: string,
): ApiResult<true, IdDecodeError> {
	if (!isSupportedLanguage(payloadLanguage)) {
		return {
			success: false,
			error: idError(
				"LanguageNotImplemented",
				`Language ${payloadLanguage} is not implemented`,
			),
		};
	}
	if (payloadLanguage !== namespaceLanguage) {
		return {
			success: false,
			error: idError(
				"LanguageMismatch",
				`Expected ID for ${namespaceLanguage}, received ${payloadLanguage}`,
			),
		};
	}
	return { success: true, data: true };
}

function lemmaIdentityFields<L extends SupportedLanguage>(lemma: Lemma<L>) {
	return [
		lemma.language,
		lemma.canonicalForm,
		lemma.family,
		lemma.kind,
		canonicalJson(lemma.coreFeatures),
	] as const;
}

export function entityToReadableCsv<L extends SupportedLanguage>(
	entity: CsvEntity<L>,
): string {
	if (!("surfaceKind" in entity)) {
		return csvRow(["Lemma", ...lemmaIdentityFields(entity)]);
	}

	return csvRow([
		"Surface",
		entity.language,
		entity.surfaceKind,
		entity.normalizedSurface,
		...("inflectionalFeatures" in entity
			? [canonicalJson(entity.inflectionalFeatures)]
			: []),
		canonicalJson(entity.lemma),
	]);
}

function decodeLemma<L extends SupportedLanguage>(
	namespaceLanguage: L,
	parse: IdentityParser<L>,
	fields: string[],
): ApiResult<LemmaIdentity<L>, IdDecodeError> {
	if (fields.length !== 6) {
		return invalidPayload("CSV row is not a valid Lemma identity");
	}
	const languageCheck = assertLanguageForNamespace(
		namespaceLanguage,
		fields[1] ?? "",
	);
	if (!languageCheck.success) return languageCheck;
	const coreFeatures = parseCanonicalJson(
		fields[5] ?? "",
		"Lemma coreFeatures",
	);
	if (!coreFeatures.success) return coreFeatures;
	const parsed = parse.lemma({
		language: namespaceLanguage,
		canonicalForm: fields[2] ?? "",
		family: fields[3] ?? "",
		kind: fields[4] ?? "",
		coreFeatures: coreFeatures.data,
	});
	return parsed.success
		? { success: true, data: parsed.data }
		: invalidPayload(`Lemma identity is invalid: ${parsed.error.message}`);
}

export function decodeReadableCsv<L extends SupportedLanguage>(
	namespaceLanguage: L,
	parse: IdentityParser<L>,
	input: string,
): ApiResult<ReadableCsvDecodeSuccess<L>, IdDecodeError> {
	const parsedRow = parseCsvRow(input, { requireCanonical: true });
	if (!parsedRow.success) return parsedRow;
	const fields = parsedRow.data;

	if (fields[0] === "Lemma") {
		const lemma = decodeLemma(namespaceLanguage, parse, fields);
		return lemma.success
			? {
					success: true,
					data: {
						kind: "Lemma",
						language: namespaceLanguage,
						lemmaIdentity: lemma.data,
					},
				}
			: lemma;
	}

	if (fields[0] !== "Surface") {
		return invalidPayload("CSV row must start with Lemma or Surface");
	}
	const isInflection = fields[2] === "Inflection";
	if (
		(!isInflection && fields[2] !== "Citation") ||
		fields.length !== (isInflection ? 6 : 5)
	) {
		return invalidPayload("CSV row is not a valid Surface identity");
	}
	const languageCheck = assertLanguageForNamespace(
		namespaceLanguage,
		fields[1] ?? "",
	);
	if (!languageCheck.success) return languageCheck;
	const inflectionalFeatures = isInflection
		? parseCanonicalJson(fields[4] ?? "", "Surface inflectionalFeatures")
		: undefined;
	if (inflectionalFeatures && !inflectionalFeatures.success) {
		return inflectionalFeatures;
	}
	const lemma = parseCanonicalJson(
		fields[isInflection ? 5 : 4] ?? "",
		"Surface lemma",
	);
	if (!lemma.success) return lemma;

	const parsedSurface = parse.surface({
		language: namespaceLanguage,
		normalizedSurface: fields[3] ?? "",
		spelling: "Canonical",
		surfaceKind: fields[2],
		surfaceFeatures: null,
		lemma: lemma.data,
		...(isInflection
			? { inflectionalFeatures: inflectionalFeatures?.data }
			: {}),
	});
	if (!parsedSurface.success) {
		return invalidPayload(
			`Surface identity is invalid: ${parsedSurface.error.message}`,
		);
	}

	const canonicalSurface = parsedSurface.data;
	const surfaceIdentity = {
		language: namespaceLanguage,
		surfaceKind: canonicalSurface.surfaceKind,
		normalizedSurface: canonicalSurface.normalizedSurface,
		...("inflectionalFeatures" in canonicalSurface
			? {
					inflectionalFeatures: canonicalSurface.inflectionalFeatures,
				}
			: {}),
		lemma: canonicalSurface.lemma as Lemma<L>,
	} as SurfaceIdentity<L>;

	return {
		success: true,
		data: {
			kind: "Surface",
			language: namespaceLanguage,
			surfaceIdentity,
		},
	};
}
