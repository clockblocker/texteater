import type {
	Lemma,
	Selection,
	SupportedLanguage,
	Surface,
} from "../../../types/public-types";
import type { ApiResult, IdDecodeError, LanguageApi } from "../../api-shape";
import { idError } from "../id-errors";
import { isSupportedLanguage } from "../language-inventory";
import { featureNameTokens } from "./tiny-tokens";

type CsvValue = string | number | boolean | null | undefined;
type IdEntity<L extends SupportedLanguage> = Lemma<L> | Surface<L>;
type CsvEntity<L extends SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Selection<L>;

const surfaceFeatureNames = new Set(["historicalStatus"]);

export type ReadableCsvDecodeSuccess<L extends SupportedLanguage> =
	| {
			kind: "Lemma";
			language: L;
			lemma: Lemma<L>;
	  }
	| {
			kind: "Surface";
			language: L;
			surface: Surface<L>;
	  }
	| {
			kind: "Selection";
			language: L;
			selection: Selection<L>;
	  };

function invalidPayload(message: string): ApiResult<never, IdDecodeError> {
	return {
		success: false,
		error: idError("InvalidPayload", message),
	};
}

function csvField(value: CsvValue): string {
	const text = value == null ? "" : String(value);

	if (!/[",\r\n]/u.test(text)) {
		return text;
	}

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

		if (closedQuote) {
			return invalidPayload("CSV quotes must end a field");
		}

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

	return {
		success: true,
		data: fields,
	};
}

function parseCanonicalCsvRowOrThrow(input: string): string[] {
	const parsed = parseCsvRow(input, { requireCanonical: true });
	if (!parsed.success) {
		throw new Error(parsed.error.message);
	}

	return parsed.data;
}

function assertNoFeatureDelimiters(value: string, context: string) {
	if (/[|=+]/u.test(value)) {
		throw new Error(`${context} must not contain |, =, or +`);
	}
}

function valuesForFeature(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.map((entry) => String(entry));
	}

	return [String(value)];
}

function assertNoDuplicateValues(
	features: Record<string, unknown>,
	context: string,
) {
	for (const [key, value] of Object.entries(features)) {
		const values = valuesForFeature(value);
		if (new Set(values).size !== values.length) {
			throw new Error(`${context}.${key} contains duplicate values`);
		}
	}
}

export function assertEntityIdFeatureConstraints(
	entity:
		| Lemma<SupportedLanguage>
		| Surface<SupportedLanguage>
		| Selection<SupportedLanguage>,
) {
	if ("surface" in entity) {
		assertEntityIdFeatureConstraints(entity.surface);
		return;
	}

	const lemma = "surfaceKind" in entity ? entity.lemma : entity;
	assertNoDuplicateValues(
		lemma.inherentFeatures as Record<string, unknown>,
		"inherentFeatures",
	);

	if ("surfaceKind" in entity && "inflectionalFeatures" in entity) {
		assertNoDuplicateValues(
			entity.inflectionalFeatures as Record<string, unknown>,
			"inflectionalFeatures",
		);
	}
}

export function formatFeatureSet(features: Record<string, unknown>): string {
	const pairs = Object.entries(features)
		.filter(([, value]) => value !== undefined)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, rawValue]) => {
			assertNoFeatureDelimiters(key, `Feature key ${key}`);
			const values = valuesForFeature(rawValue).sort((left, right) =>
				left.localeCompare(right),
			);

			if (new Set(values).size !== values.length) {
				throw new Error(`Feature ${key} contains duplicate values`);
			}

			for (const value of values) {
				assertNoFeatureDelimiters(value, `Feature value ${key}`);
			}

			return `${key}=${values.join("+")}`;
		});

	return pairs.join("|");
}

function parseFeatureSet(
	input: string,
): ApiResult<Record<string, unknown>, IdDecodeError> {
	if (input === "") {
		return { success: true, data: {} };
	}

	const features: Record<string, unknown> = {};
	const pairs = input.split("|");
	const keys: string[] = [];

	for (const pair of pairs) {
		const separator = pair.indexOf("=");
		if (separator <= 0 || separator === pair.length - 1) {
			return invalidPayload("Feature pair must be key=value");
		}

		const key = pair.slice(0, separator);
		const valueText = pair.slice(separator + 1);

		if (/[|=+]/u.test(key)) {
			return invalidPayload(
				`Feature key ${key} must not contain |, =, or +`,
			);
		}

		if (!(key in featureNameTokens)) {
			return invalidPayload(`Unknown feature key ${key}`);
		}

		if (key in features) {
			return invalidPayload(`Duplicate feature key ${key}`);
		}

		const values = valueText.split("+");
		if (values.some((value) => value.length === 0)) {
			return invalidPayload(`Feature ${key} has an empty value`);
		}
		for (const value of values) {
			if (/[|=+]/u.test(value)) {
				return invalidPayload(
					`Feature value ${key} must not contain |, =, or +`,
				);
			}
		}
		if (new Set(values).size !== values.length) {
			return invalidPayload(`Feature ${key} contains duplicate values`);
		}

		const sortedValues = [...values].sort((left, right) =>
			left.localeCompare(right),
		);
		if (sortedValues.join("+") !== values.join("+")) {
			return invalidPayload(`Feature ${key} values are not sorted`);
		}

		keys.push(key);
		features[key] = values.length === 1 ? values[0] : values;
	}

	const sortedKeys = [...keys].sort((left, right) =>
		left.localeCompare(right),
	);
	if (sortedKeys.join("|") !== keys.join("|")) {
		return invalidPayload("Feature keys are not sorted");
	}

	return {
		success: true,
		data: features,
	};
}

function parseMarkedFeatureSet(
	input: string,
	context: string,
): ApiResult<Record<string, unknown>, IdDecodeError> {
	const parsed = parseFeatureSet(input);
	if (!parsed.success) {
		return parsed;
	}

	if (Object.keys(parsed.data).length === 0) {
		return invalidPayload(`${context} must contain at least one feature`);
	}

	return parsed;
}

function isSurfaceFeatureSet(features: Record<string, unknown>): boolean {
	return Object.keys(features).every((key) => surfaceFeatureNames.has(key));
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

	return {
		success: true,
		data: true,
	};
}

function parseLemmaFields<L extends SupportedLanguage>(
	namespaceLanguage: L,
	fields: string[],
	parse: LanguageApi<L>["parse"],
): ApiResult<Lemma<L>, IdDecodeError> {
	if (fields.length !== 7 || fields[0] !== "Lemma") {
		return invalidPayload("CSV row is not a Lemma row");
	}

	const [
		,
		payloadLanguage,
		lemmaKind,
		lemmaSubKind,
		canonicalLemma,
		meaningInEmojis,
		inherentFeaturesField,
	] = fields as [string, string, string, string, string, string, string];

	const languageCheck = assertLanguageForNamespace(
		namespaceLanguage,
		payloadLanguage,
	);
	if (!languageCheck.success) {
		return languageCheck;
	}

	const inherentFeatures = parseFeatureSet(inherentFeaturesField);
	if (!inherentFeatures.success) {
		return inherentFeatures;
	}

	const parsed = parse.lemma({
		language: payloadLanguage,
		lemmaKind,
		lemmaSubKind,
		canonicalLemma,
		meaningInEmojis,
		inherentFeatures: inherentFeatures.data,
	});

	if (!parsed.success) {
		return invalidPayload(parsed.error.message);
	}

	return parsed;
}

export function entityToReadableCsv<L extends SupportedLanguage>(
	entity: CsvEntity<L>,
): string {
	const lemmaFields = (lemma: Lemma<L>) => [
		"Lemma",
		lemma.language,
		lemma.lemmaKind,
		lemma.lemmaSubKind,
		lemma.canonicalLemma,
		lemma.meaningInEmojis,
		formatFeatureSet(lemma.inherentFeatures as Record<string, unknown>),
	];

	if ("surface" in entity) {
		const selectionFeatures = entity.selectionFeatures
			? formatFeatureSet(
					entity.selectionFeatures as Record<string, unknown>,
				)
			: "";
		return csvRow(
			selectionFeatures === ""
				? [
						"Selection",
						entity.spelledSelection,
						...parseCanonicalCsvRowOrThrow(
							entityToReadableCsv(entity.surface as Surface<L>),
						),
					]
				: [
						"Selection",
						entity.spelledSelection,
						selectionFeatures,
						...parseCanonicalCsvRowOrThrow(
							entityToReadableCsv(entity.surface as Surface<L>),
						),
					],
		);
	}

	if (!("surfaceKind" in entity)) {
		return csvRow(lemmaFields(entity));
	}

	const surfaceFields = [
		"Surface",
		entity.surfaceKind,
		entity.normalizedFullSurface,
	];

	const surfaceFeatures = entity.surfaceFeatures
		? formatFeatureSet(entity.surfaceFeatures as Record<string, unknown>)
		: "";
	if (surfaceFeatures !== "") {
		surfaceFields.push(surfaceFeatures);
	}

	if (entity.surfaceKind === "Inflection") {
		surfaceFields.push(
			formatFeatureSet(
				(entity as unknown as { inflectionalFeatures: unknown })
					.inflectionalFeatures as Record<string, unknown>,
			),
		);
	}

	return csvRow([...surfaceFields, ...lemmaFields(entity.lemma as Lemma<L>)]);
}

export function decodeReadableCsv<L extends SupportedLanguage>(
	namespaceLanguage: L,
	parse: LanguageApi<L>["parse"],
	input: string,
): ApiResult<ReadableCsvDecodeSuccess<L>, IdDecodeError> {
	const parsedRow = parseCsvRow(input, { requireCanonical: true });
	if (!parsedRow.success) {
		return parsedRow;
	}

	const fields = parsedRow.data;
	if (fields[0] === "Lemma") {
		const lemma = parseLemmaFields(namespaceLanguage, fields, parse);
		if (!lemma.success) {
			return lemma;
		}

		return {
			success: true,
			data: {
				kind: "Lemma",
				language: namespaceLanguage,
				lemma: lemma.data,
			},
		};
	}

	if (fields[0] === "Selection") {
		if (fields.length < 12) {
			return invalidPayload(
				"Selection CSV rows are missing surface fields",
			);
		}

		const hasSelectionFeatures = fields[2] !== "Surface";
		const surfaceOffset = hasSelectionFeatures ? 3 : 2;
		const selectionFeaturesField = hasSelectionFeatures
			? fields[2]
			: undefined;
		const surface = decodeReadableCsv(
			namespaceLanguage,
			parse,
			csvRow(fields.slice(surfaceOffset)),
		);
		if (!surface.success) {
			return surface;
		}

		if (surface.data.kind !== "Surface") {
			return invalidPayload(
				"Selection CSV rows must contain a Surface row",
			);
		}

		let selectionFeatures: Record<string, unknown> | undefined;
		if (selectionFeaturesField !== undefined) {
			const parsedSelectionFeatures = parseMarkedFeatureSet(
				selectionFeaturesField,
				"selectionFeatures",
			);
			if (!parsedSelectionFeatures.success) {
				return parsedSelectionFeatures;
			}
			if (isSurfaceFeatureSet(parsedSelectionFeatures.data)) {
				return invalidPayload(
					"Selection feature bag may only contain selection features",
				);
			}
			selectionFeatures = parsedSelectionFeatures.data;
		}

		const parsedSelection = parse.selection({
			language: namespaceLanguage,
			selectionFeatures,
			spelledSelection: fields[1],
			surface: surface.data.surface,
		});
		if (!parsedSelection.success) {
			return invalidPayload(parsedSelection.error.message);
		}

		return {
			success: true,
			data: {
				kind: "Selection",
				language: namespaceLanguage,
				selection: parsedSelection.data,
			},
		};
	}

	if (fields[0] !== "Surface") {
		return invalidPayload(
			"CSV row must start with Lemma, Surface, or Selection",
		);
	}

	if (fields[1] === "Citation") {
		if (fields.length !== 10 && fields.length !== 11) {
			return invalidPayload(
				"Citation surface CSV rows must contain 10 or 11 fields",
			);
		}

		let surfaceFeatures: Record<string, unknown> | undefined;
		let lemmaOffset = 3;
		if (fields[3] !== "Lemma") {
			const parsedSurfaceFeatures = parseMarkedFeatureSet(
				fields[3] ?? "",
				"surfaceFeatures",
			);
			if (!parsedSurfaceFeatures.success) {
				return parsedSurfaceFeatures;
			}
			if (!isSurfaceFeatureSet(parsedSurfaceFeatures.data)) {
				return invalidPayload(
					"Citation surface feature bag may only contain surface features",
				);
			}
			surfaceFeatures = parsedSurfaceFeatures.data;
			lemmaOffset = 4;
		}

		const lemma = parseLemmaFields(
			namespaceLanguage,
			fields.slice(lemmaOffset),
			parse,
		);
		if (!lemma.success) {
			return lemma;
		}

		const parsed = parse.surface({
			language: namespaceLanguage,
			surfaceKind: fields[1],
			normalizedFullSurface: fields[2],
			surfaceFeatures,
			lemma: lemma.data,
		});
		if (!parsed.success) {
			return invalidPayload(parsed.error.message);
		}

		return {
			success: true,
			data: {
				kind: "Surface",
				language: namespaceLanguage,
				surface: parsed.data,
			},
		};
	}

	if (fields[1] === "Inflection") {
		if (fields.length !== 11 && fields.length !== 12) {
			return invalidPayload(
				"Inflection surface CSV rows must contain 11 or 12 fields",
			);
		}

		let surfaceFeatures: Record<string, unknown> | undefined;
		let inflectionalFeaturesField = fields[3] ?? "";
		let lemmaOffset = 4;
		if (fields.length === 12) {
			const parsedSurfaceFeatures = parseMarkedFeatureSet(
				fields[3] ?? "",
				"surfaceFeatures",
			);
			if (!parsedSurfaceFeatures.success) {
				return parsedSurfaceFeatures;
			}
			if (!isSurfaceFeatureSet(parsedSurfaceFeatures.data)) {
				return invalidPayload(
					"Inflection surface feature bag may only contain surface features",
				);
			}
			surfaceFeatures = parsedSurfaceFeatures.data;
			inflectionalFeaturesField = fields[4] ?? "";
			lemmaOffset = 5;
		}

		const inflectionalFeatures = parseFeatureSet(inflectionalFeaturesField);
		if (!inflectionalFeatures.success) {
			return inflectionalFeatures;
		}

		const lemma = parseLemmaFields(
			namespaceLanguage,
			fields.slice(lemmaOffset),
			parse,
		);
		if (!lemma.success) {
			return lemma;
		}

		const parsed = parse.surface({
			language: namespaceLanguage,
			surfaceKind: fields[1],
			normalizedFullSurface: fields[2],
			surfaceFeatures,
			inflectionalFeatures: inflectionalFeatures.data,
			lemma: lemma.data,
		});
		if (!parsed.success) {
			return invalidPayload(parsed.error.message);
		}

		return {
			success: true,
			data: {
				kind: "Surface",
				language: namespaceLanguage,
				surface: parsed.data,
			},
		};
	}

	return invalidPayload("CSV surfaceKind is invalid");
}
