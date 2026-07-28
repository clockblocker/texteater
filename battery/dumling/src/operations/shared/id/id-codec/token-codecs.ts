import { codecBuilder4 } from "codec-builder-library";
import { z } from "zod";
import {
	entityKindTokens,
	type FeatureNameTokenKey,
	featureNameTokens,
	featureValueTokens,
	languageTokens,
	lemmaKindTokens,
	lemmaSubKindTokens,
	surfaceKindTokens,
} from "./tiny-tokens.js";

type TokenMap = Readonly<Record<string, string>>;
type TokenMapKey<Tokens extends TokenMap> = keyof Tokens & string;
type TokenMapValue<Tokens extends TokenMap> = Tokens[keyof Tokens] & string;
type TokenCodec<Tokens extends TokenMap> = z.ZodCodec<
	z.ZodEnum<{ [Key in TokenMapKey<Tokens>]: Key }>,
	z.ZodEnum<{ [Value in TokenMapValue<Tokens>]: Value }>
>;

function enumFromValues<const Values extends readonly string[]>(
	values: Values,
): z.ZodEnum<{ [Value in Values[number]]: Value }> {
	if (values.length === 0) {
		throw new Error("Cannot build a token codec from an empty token map");
	}

	return z.enum(
		Object.fromEntries(values.map((value) => [value, value])) as {
			[Value in Values[number]]: Value;
		},
	);
}

function buildTokenCodec<const Tokens extends TokenMap>(
	name: string,
	tokens: Tokens,
): TokenCodec<Tokens> {
	const longValues = Object.keys(tokens) as TokenMapKey<Tokens>[];
	const shortValues = Object.values(tokens) as TokenMapValue<Tokens>[];
	const inverse = new Map<string, TokenMapKey<Tokens>>();

	for (const long of longValues) {
		const short = tokens[long];
		if (short === undefined) {
			throw new Error(`Missing ${name} token for ${long}`);
		}
		if (inverse.has(short)) {
			throw new Error(`${name} token collision for ${short}`);
		}
		inverse.set(short, long);
	}

	const longSchema = enumFromValues(longValues);
	const shortSchema = enumFromValues(shortValues);

	return z.codec(longSchema, shortSchema, {
		decode(long) {
			return tokens[long] as TokenMapValue<Tokens>;
		},
		encode(short) {
			const long = inverse.get(short);
			if (long === undefined) {
				throw new Error(`Unknown ${name} token ${short}`);
			}
			return long;
		},
	});
}

const entityKindTokenCodec = buildTokenCodec("entity kind", entityKindTokens);
const featureNameTokenCodec = buildTokenCodec(
	"feature name",
	featureNameTokens,
);
const languageTokenCodec = buildTokenCodec("language", languageTokens);
const lemmaKindTokenCodec = buildTokenCodec("lemma kind", lemmaKindTokens);
const lemmaSubKindTokenCodec = buildTokenCodec(
	"lemma subkind",
	lemmaSubKindTokens,
);
const surfaceKindTokenCodec = buildTokenCodec(
	"surface kind",
	surfaceKindTokens,
);
const finiteFeatureValueTokenCodecs = new Map<
	FeatureNameTokenKey,
	TokenCodec<TokenMap>
>();

for (const key of Object.keys(featureValueTokens) as FeatureNameTokenKey[]) {
	const tokens = featureValueTokens[key] as TokenMap;
	if (Object.keys(tokens).length > 0) {
		finiteFeatureValueTokenCodecs.set(
			key,
			buildTokenCodec(`${key} feature value`, tokens),
		);
	}
}

const noOp = codecBuilder4.fieldCodec.noOp;

export const lemmaFieldTokenCodec = codecBuilder4.buildStrictFieldAdapterCodec(
	z.object({
		entityKind: entityKindTokenCodec.in,
		language: languageTokenCodec.in,
		lemmaKind: lemmaKindTokenCodec.in,
		lemmaSubKind: lemmaSubKindTokenCodec.in,
		lemma: z.string(),
		meaning: z.string(),
		features: z.string(),
	}),
	{
		entityKind: entityKindTokenCodec,
		language: languageTokenCodec,
		lemmaKind: lemmaKindTokenCodec,
		lemmaSubKind: lemmaSubKindTokenCodec,
		lemma: noOp,
		meaning: noOp,
		features: noOp,
	},
);

export const surfaceHeaderTokenCodec =
	codecBuilder4.buildStrictFieldAdapterCodec(
		z.object({
			entityKind: entityKindTokenCodec.in,
			surfaceKind: surfaceKindTokenCodec.in,
		}),
		{
			entityKind: entityKindTokenCodec,
			surfaceKind: surfaceKindTokenCodec,
		},
	);

export function encodeEntityKind(
	entityKind: z.input<typeof entityKindTokenCodec>,
) {
	return entityKindTokenCodec.decode(entityKind);
}

export function decodeEntityKind(token: string) {
	const parsed = entityKindTokenCodec.out.safeParse(token);
	return parsed.success
		? entityKindTokenCodec.encode(parsed.data)
		: undefined;
}

export function encodeFeatureName(featureName: FeatureNameTokenKey) {
	return featureNameTokenCodec.decode(featureName);
}

export function decodeFeatureName(token: string) {
	const parsed = featureNameTokenCodec.out.safeParse(token);
	return parsed.success
		? featureNameTokenCodec.encode(parsed.data)
		: undefined;
}

export function encodeFiniteFeatureValue(
	key: FeatureNameTokenKey,
	value: string,
): string | undefined {
	const codec = finiteFeatureValueTokenCodecs.get(key);
	if (codec === undefined) {
		return undefined;
	}

	const parsed = codec.in.safeParse(value);
	return parsed.success ? codec.decode(parsed.data) : undefined;
}

export function decodeFiniteFeatureValue(
	key: FeatureNameTokenKey,
	token: string,
): string | undefined {
	const codec = finiteFeatureValueTokenCodecs.get(key);
	if (codec === undefined) {
		return undefined;
	}

	const parsed = codec.out.safeParse(token);
	return parsed.success ? codec.encode(parsed.data) : undefined;
}
