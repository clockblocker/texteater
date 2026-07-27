import type { ApiResult, IdDecodeError } from "../../api-shape";
import { idError } from "../id-errors";
import { csvRow, parseCsvRow } from "./readable-csv";
import {
	type FeatureNameTokenKey,
	entityKindTokens,
	featureNameTokens,
	featureValueTokens,
	inverseEntityKindTokens,
	inverseFeatureNameTokens,
	inverseFeatureValueTokens,
	inverseLanguageTokens,
	inverseLemmaKindTokens,
	inverseLemmaSubKindTokens,
	inverseSurfaceKindTokens,
	languageTokens,
	lemmaKindTokens,
	lemmaSubKindTokens,
	rawStringFeatureNames,
	surfaceKindTokens,
} from "./tiny-tokens";

type TinyResult = ApiResult<string, IdDecodeError>;

function malformed(message: string): TinyResult {
	return {
		success: false,
		error: idError("MalformedId", message),
	};
}

function invalid(message: string): TinyResult {
	return {
		success: false,
		error: idError("InvalidPayload", message),
	};
}

function encodeRawFeatureValue(value: string): string {
	return `~${encodeURIComponent(value)}`;
}

function decodeRawFeatureValue(value: string): string | undefined {
	if (!value.startsWith("~")) {
		return undefined;
	}

	try {
		return decodeURIComponent(value.slice(1));
	} catch {
		return undefined;
	}
}

function encodeFeatureValue(key: FeatureNameTokenKey, value: string): string {
	const tokens = featureValueTokens[key] as Record<string, string>;
	const token = tokens[value];
	if (token !== undefined) {
		return token;
	}

	if (rawStringFeatureNames.has(key)) {
		return encodeRawFeatureValue(value);
	}

	throw new Error(`No tiny token for ${key}=${value}`);
}

function decodeFeatureValue(
	key: FeatureNameTokenKey,
	token: string,
): string | undefined {
	const values = inverseFeatureValueTokens[key] as Record<string, string>;
	const value = values[token];
	if (value !== undefined) {
		return value;
	}

	if (rawStringFeatureNames.has(key)) {
		return decodeRawFeatureValue(token);
	}

	return undefined;
}

function encodeFeatureSet(input: string): string {
	if (input === "") {
		return "";
	}

	return input
		.split("|")
		.map((pair) => {
			const [key, valueText] = pair.split("=") as [
				FeatureNameTokenKey,
				string,
			];
			const keyToken = featureNameTokens[key];
			if (keyToken === undefined) {
				throw new Error(`No tiny token for feature ${key}`);
			}

			const valueTokens = valueText
				.split("+")
				.map((value) => encodeFeatureValue(key, value));
			return `${keyToken}=${valueTokens.join("+")}`;
		})
		.join("|");
}

function decodeFeatureSet(input: string): string | undefined {
	if (input === "") {
		return "";
	}

	const pairs: string[] = [];
	for (const pair of input.split("|")) {
		const [nameToken, valueText] = pair.split("=") as [string, string];
		const key = inverseFeatureNameTokens[nameToken] as
			| FeatureNameTokenKey
			| undefined;
		if (key === undefined || valueText === undefined) {
			return undefined;
		}

		const values: string[] = [];
		for (const valueToken of valueText.split("+")) {
			const value = decodeFeatureValue(key, valueToken);
			if (value === undefined) {
				return undefined;
			}
			values.push(value);
		}

		pairs.push(`${key}=${values.join("+")}`);
	}

	return pairs.join("|");
}

function readableLemmaFieldsToTiny(fields: string[]): string[] {
	const [, language, lemmaKind, lemmaSubKind, lemma, meaning, features] =
		fields as [string, string, string, string, string, string, string];

	const languageToken =
		languageTokens[language as keyof typeof languageTokens];
	const lemmaKindToken =
		lemmaKindTokens[lemmaKind as keyof typeof lemmaKindTokens];
	const lemmaSubKindToken =
		lemmaSubKindTokens[lemmaSubKind as keyof typeof lemmaSubKindTokens];

	if (
		languageToken === undefined ||
		lemmaKindToken === undefined ||
		lemmaSubKindToken === undefined
	) {
		throw new Error(
			"Readable CSV contains an unsupported tiny token value",
		);
	}

	return [
		entityKindTokens.Lemma,
		languageToken,
		lemmaKindToken,
		lemmaSubKindToken,
		lemma,
		meaning,
		encodeFeatureSet(features),
	];
}

function tinyLemmaFieldsToReadable(fields: string[]): string[] | undefined {
	const [kind, language, lemmaKind, lemmaSubKind, lemma, meaning, features] =
		fields as [string, string, string, string, string, string, string];

	if (kind !== entityKindTokens.Lemma) {
		return undefined;
	}

	const decodedLanguage = inverseLanguageTokens[language] ?? language;
	const decodedLemmaKind = inverseLemmaKindTokens[lemmaKind];
	const decodedLemmaSubKind = inverseLemmaSubKindTokens[lemmaSubKind];
	const decodedFeatures = decodeFeatureSet(features);

	if (
		decodedLanguage === undefined ||
		decodedLemmaKind === undefined ||
		decodedLemmaSubKind === undefined ||
		decodedFeatures === undefined
	) {
		return undefined;
	}

	return [
		"Lemma",
		decodedLanguage,
		decodedLemmaKind,
		decodedLemmaSubKind,
		lemma,
		meaning,
		decodedFeatures,
	];
}

export function readableCsvToTinyCsv(input: string): string {
	const parsed = parseCsvRow(input, { requireCanonical: true });
	if (!parsed.success) {
		throw new Error(parsed.error.message);
	}

	const fields = parsed.data;
	if (fields[0] === "Lemma") {
		return csvRow(["v1", ...readableLemmaFieldsToTiny(fields)]);
	}

	if (fields[0] === "Selection") {
		const hasSelectionFeatures = fields[2] !== "Surface";
		const surfaceOffset = hasSelectionFeatures ? 3 : 2;
		const tinySurface = parseCsvRow(
			readableCsvToTinyCsv(csvRow(fields.slice(surfaceOffset))),
			{
				requireCanonical: true,
			},
		);
		if (!tinySurface.success) {
			throw new Error(tinySurface.error.message);
		}

		return csvRow(
			hasSelectionFeatures
				? [
						"v1",
						entityKindTokens.Selection,
						fields[1],
						encodeFeatureSet(fields[2] ?? ""),
						...tinySurface.data.slice(1),
					]
				: [
						"v1",
						entityKindTokens.Selection,
						fields[1],
						...tinySurface.data.slice(1),
					],
		);
	}

	if (fields[0] !== "Surface") {
		throw new Error(
			"Readable CSV row must start with Lemma, Surface, or Selection",
		);
	}

	const surfaceKindToken =
		surfaceKindTokens[fields[1] as keyof typeof surfaceKindTokens];
	if (surfaceKindToken === undefined) {
		throw new Error("Readable CSV contains an unsupported surface kind");
	}

	if (fields[1] === "Citation") {
		const hasSurfaceFeatures = fields[3] !== "Lemma";
		return csvRow(
			hasSurfaceFeatures
				? [
						"v1",
						entityKindTokens.Surface,
						surfaceKindToken,
						fields[2],
						encodeFeatureSet(fields[3] ?? ""),
						...readableLemmaFieldsToTiny(fields.slice(4)),
					]
				: [
						"v1",
						entityKindTokens.Surface,
						surfaceKindToken,
						fields[2],
						...readableLemmaFieldsToTiny(fields.slice(3)),
					],
		);
	}

	const hasSurfaceFeatures = fields.length === 12;
	return csvRow(
		hasSurfaceFeatures
			? [
					"v1",
					entityKindTokens.Surface,
					surfaceKindToken,
					fields[2],
					encodeFeatureSet(fields[3] ?? ""),
					encodeFeatureSet(fields[4] ?? ""),
					...readableLemmaFieldsToTiny(fields.slice(5)),
				]
			: [
					"v1",
					entityKindTokens.Surface,
					surfaceKindToken,
					fields[2],
					encodeFeatureSet(fields[3] ?? ""),
					...readableLemmaFieldsToTiny(fields.slice(4)),
				],
	);
}

export function tinyCsvToReadableCsv(input: string): TinyResult {
	const parsed = parseCsvRow(input, { requireCanonical: true });
	if (!parsed.success) {
		if (input.startsWith("v1,")) {
			return parsed;
		}
		return malformed("Base64url payload is not tiny CSV");
	}

	const fields = parsed.data;
	if (fields[0] !== "v1") {
		if (fields[0]?.startsWith("v")) {
			return malformed(`Unsupported tiny CSV version ${fields[0]}`);
		}
		return malformed("Base64url payload is not tiny CSV");
	}

	const payload = fields.slice(1);
	const entityKind = inverseEntityKindTokens[payload[0] ?? ""];

	if (entityKind === "Lemma") {
		if (payload.length !== 7) {
			return invalid("Tiny Lemma rows must contain 8 fields");
		}

		const readable = tinyLemmaFieldsToReadable(payload);
		if (readable === undefined) {
			return invalid("Tiny Lemma row contains an unknown token");
		}

		return {
			success: true,
			data: csvRow(readable),
		};
	}

	if (entityKind === "Selection") {
		if (payload.length < 12) {
			return invalid("Tiny Selection rows are missing surface fields");
		}

		const hasSelectionFeatures = payload[2] !== entityKindTokens.Surface;
		const selectionFeatures = hasSelectionFeatures
			? decodeFeatureSet(payload[2] ?? "")
			: undefined;
		if (hasSelectionFeatures && selectionFeatures === undefined) {
			return invalid(
				"Tiny Selection row contains an unknown feature token",
			);
		}

		const surface = tinyCsvToReadableCsv(
			csvRow(["v1", ...payload.slice(hasSelectionFeatures ? 3 : 2)]),
		);
		if (!surface.success) {
			return surface;
		}

		const parsedSurface = parseCsvRow(surface.data, {
			requireCanonical: true,
		});
		if (!parsedSurface.success) {
			return parsedSurface;
		}

		if (parsedSurface.data[0] !== "Surface") {
			return invalid("Tiny Selection rows must contain a Surface row");
		}

		return {
			success: true,
			data: csvRow(
				selectionFeatures === undefined
					? ["Selection", payload[1], ...parsedSurface.data]
					: [
							"Selection",
							payload[1],
							selectionFeatures,
							...parsedSurface.data,
						],
			),
		};
	}

	if (entityKind !== "Surface") {
		return invalid("Tiny row kind is invalid");
	}

	const surfaceKind = inverseSurfaceKindTokens[payload[1] ?? ""];
	if (surfaceKind === undefined) {
		return invalid("Tiny Surface row contains an unknown surface token");
	}

	if (surfaceKind === "Citation") {
		if (payload.length !== 10 && payload.length !== 11) {
			return invalid(
				"Tiny Citation surface rows must contain 11 or 12 fields",
			);
		}

		const hasSurfaceFeatures = payload.length === 11;
		const surfaceFeatures = hasSurfaceFeatures
			? decodeFeatureSet(payload[3] ?? "")
			: undefined;
		const lemma = tinyLemmaFieldsToReadable(
			payload.slice(hasSurfaceFeatures ? 4 : 3),
		);
		if (
			lemma === undefined ||
			(hasSurfaceFeatures && surfaceFeatures === undefined)
		) {
			return invalid(
				"Tiny Citation surface row contains an unknown token",
			);
		}

		return {
			success: true,
			data: csvRow(
				surfaceFeatures === undefined
					? ["Surface", "Citation", payload[2], ...lemma]
					: [
							"Surface",
							"Citation",
							payload[2],
							surfaceFeatures,
							...lemma,
						],
			),
		};
	}

	if (payload.length !== 11 && payload.length !== 12) {
		return invalid(
			"Tiny Inflection surface rows must contain 12 or 13 fields",
		);
	}

	const hasSurfaceFeatures = payload.length === 12;
	const surfaceFeatures = hasSurfaceFeatures
		? decodeFeatureSet(payload[3] ?? "")
		: undefined;
	const features = decodeFeatureSet(
		payload[hasSurfaceFeatures ? 4 : 3] ?? "",
	);
	const lemma = tinyLemmaFieldsToReadable(
		payload.slice(hasSurfaceFeatures ? 5 : 4),
	);
	if (
		features === undefined ||
		lemma === undefined ||
		(hasSurfaceFeatures && surfaceFeatures === undefined)
	) {
		return invalid("Tiny Inflection surface row contains an unknown token");
	}

	return {
		success: true,
		data: csvRow(
			surfaceFeatures === undefined
				? ["Surface", "Inflection", payload[2], features, ...lemma]
				: [
						"Surface",
						"Inflection",
						payload[2],
						surfaceFeatures,
						features,
						...lemma,
					],
		),
	};
}
