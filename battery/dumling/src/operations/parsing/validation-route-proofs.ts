import type { z } from "zod";
import type {
	buildReadingSchemaFor,
	schemasFor,
} from "../../schemas/public-schemas.js";
import type {
	CanonicalDumlingValidationRouteKey,
	CanonicalDumlingValidationRouteOutput,
} from "./validation-routes.js";

type ActualSchemaRegistry = typeof schemasFor;
type SchemaGetter = () => z.ZodType;

interface DumlingValidationSchemaRoute<
	Key extends string,
	Schema extends z.ZodType,
> {
	readonly key: Key;
	readonly schema: Schema;
}

type LemmaSchemaRoutes = {
	[Language in keyof ActualSchemaRegistry & string]: {
		[Family in keyof ActualSchemaRegistry[Language]["entity"]["Lemma"] &
			string]: {
			[Kind in keyof ActualSchemaRegistry[Language]["entity"]["Lemma"][Family] &
				string]: ActualSchemaRegistry[Language]["entity"]["Lemma"][Family][Kind] extends infer Getter extends
				SchemaGetter
				? DumlingValidationSchemaRoute<
						`Lemma:${Language}/${Family}/${Kind}`,
						ReturnType<Getter>
					>
				: never;
		}[keyof ActualSchemaRegistry[Language]["entity"]["Lemma"][Family] &
			string];
	}[keyof ActualSchemaRegistry[Language]["entity"]["Lemma"] & string];
}[keyof ActualSchemaRegistry & string];

type EntitySchemaRoutes<Entity extends "Attestation" | "Surface"> = {
	[Language in keyof ActualSchemaRegistry & string]: {
		[SurfaceKind in keyof ActualSchemaRegistry[Language]["entity"][Entity] &
			string]: {
			[Family in keyof ActualSchemaRegistry[Language]["entity"][Entity][SurfaceKind] &
				string]: {
				[Kind in keyof ActualSchemaRegistry[Language]["entity"][Entity][SurfaceKind][Family] &
					string]: ActualSchemaRegistry[Language]["entity"][Entity][SurfaceKind][Family][Kind] extends infer Getter extends
					SchemaGetter
					? DumlingValidationSchemaRoute<
							`${Entity}:${Language}/${SurfaceKind}/${Family}/${Kind}`,
							ReturnType<Getter>
						>
					: never;
			}[keyof ActualSchemaRegistry[Language]["entity"][Entity][SurfaceKind][Family] &
				string];
		}[keyof ActualSchemaRegistry[Language]["entity"][Entity][SurfaceKind] &
			string];
	}[keyof ActualSchemaRegistry[Language]["entity"][Entity] & string];
}[keyof ActualSchemaRegistry & string];

type ReadingSchemaRoutes = LemmaSchemaRoutes extends infer Route
	? Route extends DumlingValidationSchemaRoute<
			`Lemma:${infer Coordinates}`,
			infer Schema
		>
		? DumlingValidationSchemaRoute<
				`Reading:${Coordinates}`,
				ReturnType<typeof buildReadingSchemaFor<z.output<Schema>>>
			>
		: never
	: never;

export type CanonicalDumlingValidationSchemaRoute =
	| EntitySchemaRoutes<"Attestation">
	| LemmaSchemaRoutes
	| ReadingSchemaRoutes
	| EntitySchemaRoutes<"Surface">;

export type CanonicalDumlingValidationSchemaRegistry = {
	[Route in CanonicalDumlingValidationSchemaRoute as Route["key"]]: Route["schema"];
};

type SchemaRouteKey = CanonicalDumlingValidationSchemaRoute["key"];
export type CanonicalDumlingValidationSchemaForRoute<
	Key extends SchemaRouteKey,
> = Extract<CanonicalDumlingValidationSchemaRoute, { key: Key }>["schema"];
export type ProveCanonicalDumlingValidationSchemaRoute<
	Key extends SchemaRouteKey,
	Schema extends CanonicalDumlingValidationSchemaForRoute<Key>,
> = Equal<Schema, CanonicalDumlingValidationSchemaForRoute<Key>>;
export type CanonicalDumlingValidationOutputForRoute<
	Key extends SchemaRouteKey,
> = z.output<CanonicalDumlingValidationSchemaForRoute<Key>>;
export type ProveCanonicalDumlingValidationOutputRoute<
	Key extends SchemaRouteKey,
	Output extends CanonicalDumlingValidationOutputForRoute<Key>,
> = Equal<Output, CanonicalDumlingValidationOutputForRoute<Key>>;

type Equal<Left, Right> =
	(<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
		? true
		: false;
type RouteBindingFailure =
	CanonicalDumlingValidationSchemaRoute extends infer Route
		? Route extends DumlingValidationSchemaRoute<infer Key, infer Schema>
			? Key extends CanonicalDumlingValidationRouteKey
				? Equal<z.input<Schema>, unknown> extends true
					? Equal<
							z.output<Schema>,
							CanonicalDumlingValidationRouteOutput<Key>
						> extends true
						? never
						: Key
					: Key
				: Key
			: never
		: never;
type OperationalRouteWithoutSchema = Exclude<
	CanonicalDumlingValidationRouteKey,
	SchemaRouteKey
>;
type AssertNever<T extends never> = T;
type _CanonicalSchemaRouteBindingsAreExact = AssertNever<RouteBindingFailure>;
type _EveryOperationalRouteHasASchema =
	AssertNever<OperationalRouteWithoutSchema>;
