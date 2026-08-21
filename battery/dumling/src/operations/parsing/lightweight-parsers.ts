import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
	type ValidationArtifact,
} from "common-utils";
import {
	encodedDumlingValidationArtifacts,
	type GeneratedDumlingValidationRouteKey,
} from "../../generated/validation-artifacts.js";
import type {
	Attestation,
	Lemma,
	LemmaFamilyFor,
	LemmaFamilyForSurfaceKind,
	LemmaKindFor,
	Reading,
	SupportedLanguage,
	Surface,
	SurfaceKindFor,
} from "../../types/public-types.js";
import { canonicalizeNullableProperties } from "../shared/parse/canonicalize-nullable.js";
import { dumlingValidationOperations } from "./validation-operations.js";
import {
	attestationValidationRoute,
	type CanonicalDumlingValidationRouteKey,
	type CompatibilityDumlingValidationRoute,
	type DumlingValidationRouteOutput,
	lemmaValidationRoute,
	type OperationalDumlingValidationRoute,
	readingValidationRoute,
	surfaceValidationRoute,
} from "./validation-routes.js";

export { ParsingError };

type Parsed<Output> = Output | ParsingError<Output>;

export function parseAsLemma<
	const L extends SupportedLanguage,
	const F extends LemmaFamilyFor<L>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	family: F & LemmaFamilyFor<NoInfer<L>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Lemma<L, F, K>> {
	return parseDumlingRoute(
		input,
		lemmaValidationRoute(language, family, kind),
		false,
	) as Parsed<Lemma<L, F, K>>;
}

export function parseAsSurface<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	surfaceKind: SK & SurfaceKindFor<NoInfer<L>>,
	family: F & LemmaFamilyForSurfaceKind<NoInfer<L>, NoInfer<SK>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Surface<L, SK, F, K>> {
	return parseDumlingRoute(
		input,
		surfaceValidationRoute(language, surfaceKind, family, kind as never),
		false,
	) as Parsed<Surface<L, SK, F, K>>;
}

export function parseAsAttestation<
	const L extends SupportedLanguage,
	const SK extends SurfaceKindFor<L>,
	const F extends LemmaFamilyForSurfaceKind<L, SK>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	surfaceKind: SK & SurfaceKindFor<NoInfer<L>>,
	family: F & LemmaFamilyForSurfaceKind<NoInfer<L>, NoInfer<SK>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Attestation<L, SK, F, K>> {
	return parseDumlingRoute(
		input,
		attestationValidationRoute(
			language,
			surfaceKind,
			family,
			kind as never,
		),
		false,
	) as Parsed<Attestation<L, SK, F, K>>;
}

export function parseAsReading<
	const L extends SupportedLanguage,
	const F extends LemmaFamilyFor<L>,
	const K extends LemmaKindFor<L, F>,
>(
	input: unknown,
	language: L,
	family: F & LemmaFamilyFor<NoInfer<L>>,
	kind: K & LemmaKindFor<NoInfer<L>, NoInfer<F>>,
): Parsed<Reading<L, F, K>> {
	return parseDumlingRoute(
		input,
		readingValidationRoute(language, family, kind),
		false,
	) as Parsed<Reading<L, F, K>>;
}

export function parseDumlingRoute<
	Route extends
		| OperationalDumlingValidationRoute<GeneratedDumlingValidationRouteKey>
		| CompatibilityDumlingValidationRoute<unknown>,
>(
	input: unknown,
	route: Route,
	canonicalizeNullable: boolean,
): Parsed<DumlingValidationRouteOutput<Route>> {
	type Output = DumlingValidationRouteOutput<Route>;
	const artifact = decodeDumlingValidationArtifact(route);
	if (artifact === undefined) {
		return new ParsingError<Output>([
			{
				code: "custom",
				message: `Unsupported Dumling validation route: ${route.key}`,
				path: [],
			},
		]);
	}
	return parseValidationArtifact(
		artifact,
		canonicalizeNullable
			? canonicalizeNullableProperties(
					artifact.root,
					artifact.definitions ?? {},
					input,
				)
			: input,
		dumlingValidationOperations,
	);
}

function decodeDumlingValidationArtifact<
	Route extends
		| OperationalDumlingValidationRoute<GeneratedDumlingValidationRouteKey>
		| CompatibilityDumlingValidationRoute<unknown>,
>(
	route: Route,
): ValidationArtifact<DumlingValidationRouteOutput<Route>> | undefined {
	const rootPayload = rootPayloadFor(route.key);
	if (rootPayload === undefined) return undefined;
	return decodeArtifactPayload(rootPayload, route.key);
}

function decodeArtifactPayload<Output>(
	rootPayload: string,
	label: string,
): ValidationArtifact<Output> {
	const definitionCache: Record<string, Constraint> = Object.create(null);
	const definitions = new Proxy(definitionCache, {
		get(target, property) {
			if (typeof property !== "string") return undefined;
			const cached = target[property];
			if (cached !== undefined) return cached;
			const index = definitionIndex(property);
			const payload = definitionPayloadAt(index, property);
			const constraint = decodeConstraintPayload(payload, property);
			target[property] = constraint;
			return constraint;
		},
	});

	return {
		definitions,
		root: decodeConstraintPayload(rootPayload, label),
		version: encodedDumlingValidationArtifacts.version,
	};
}

/** Internal verification seam: output remains the canonical route union. */
export function decodeDumlingValidationArtifactForRouteKey(
	route: CanonicalDumlingValidationRouteKey,
): ValidationArtifact<unknown> | undefined {
	const rootPayload = rootPayloadFor(route);
	if (rootPayload === undefined) return undefined;
	return decodeArtifactPayload(rootPayload, route);
}

function rootPayloadFor(route: string): string | undefined {
	const marker = `\n${route}\0`;
	const markerStart =
		encodedDumlingValidationArtifacts.routeIndexPayload.indexOf(marker);
	if (markerStart < 0) return undefined;
	const offsetStart = markerStart + marker.length;
	const payloadStart = readFixedWidthHex(
		encodedDumlingValidationArtifacts.routeIndexPayload,
		offsetStart,
	);
	const payloadLength = readFixedWidthHex(
		encodedDumlingValidationArtifacts.routeIndexPayload,
		offsetStart + encodedDumlingValidationArtifacts.offsetWidth,
	);
	const payloadEnd = payloadStart + payloadLength;
	if (payloadEnd > encodedDumlingValidationArtifacts.rootPayloadBlob.length) {
		throw new RangeError(
			`Corrupt generated Dumling route offset: ${route}`,
		);
	}
	return encodedDumlingValidationArtifacts.rootPayloadBlob.slice(
		payloadStart,
		payloadEnd,
	);
}

function definitionPayloadAt(index: number, reference: string): string {
	const width = encodedDumlingValidationArtifacts.offsetWidth;
	const offsetStart = index * width;
	if (
		offsetStart + width * 2 >
		encodedDumlingValidationArtifacts.definitionOffsetPayload.length
	) {
		throw new ReferenceError(
			`Unknown generated Dumling validation reference: ${reference}`,
		);
	}
	const payloadStart = readFixedWidthHex(
		encodedDumlingValidationArtifacts.definitionOffsetPayload,
		offsetStart,
	);
	const payloadEnd = readFixedWidthHex(
		encodedDumlingValidationArtifacts.definitionOffsetPayload,
		offsetStart + width,
	);
	if (
		payloadEnd <= payloadStart ||
		payloadEnd >
			encodedDumlingValidationArtifacts.definitionPayloadBlob.length
	) {
		throw new RangeError(
			`Corrupt generated Dumling definition offset: ${reference}`,
		);
	}
	return encodedDumlingValidationArtifacts.definitionPayloadBlob.slice(
		payloadStart,
		payloadEnd,
	);
}

function readFixedWidthHex(payload: string, offset: number): number {
	const encoded = payload.slice(
		offset,
		offset + encodedDumlingValidationArtifacts.offsetWidth,
	);
	if (!/^[0-9a-f]{6}$/.test(encoded)) {
		throw new TypeError(
			`Corrupt generated Dumling payload offset: ${encoded}`,
		);
	}
	return Number.parseInt(encoded, 16);
}

function definitionIndex(reference: string): number {
	const match = /^n(0|[1-9]\d*)$/.exec(reference);
	if (match === null) {
		throw new ReferenceError(
			`Invalid generated Dumling validation reference: ${reference}`,
		);
	}
	return Number(match[1]);
}

function decodeConstraintPayload(payload: string, label: string): Constraint {
	const decoded: unknown = JSON.parse(payload);
	if (!Array.isArray(decoded) || typeof decoded[0] !== "string") {
		throw new TypeError(
			`Corrupt generated Dumling validation constraint: ${label}`,
		);
	}
	return decoded as unknown as Constraint;
}
