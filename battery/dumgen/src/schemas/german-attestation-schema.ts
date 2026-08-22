import { dangerouslyHeavySchemasForAbout100MiBRss as schemasFor } from "dumling/dangerously-heavy-schema-tree";
import { z } from "zod";

type GermanAttestationSchemaTree =
	(typeof schemasFor)["de"]["entity"]["Attestation"];
type SchemaGetter = () => z.ZodType;

interface GermanAttestationSchemaRoute<
	Key extends string,
	Schema extends z.ZodType,
> {
	readonly key: Key;
	readonly schema: Schema;
}

type GermanAttestationSchemaRoutes = {
	[SurfaceKind in keyof GermanAttestationSchemaTree & string]: {
		[Family in keyof GermanAttestationSchemaTree[SurfaceKind] & string]: {
			[Kind in keyof GermanAttestationSchemaTree[SurfaceKind][Family] &
				string]: GermanAttestationSchemaTree[SurfaceKind][Family][Kind] extends infer Getter extends
				SchemaGetter
				? GermanAttestationSchemaRoute<
						`${SurfaceKind}/${Family}/${Kind}`,
						ReturnType<Getter>
					>
				: never;
		}[keyof GermanAttestationSchemaTree[SurfaceKind][Family] & string];
	}[keyof GermanAttestationSchemaTree[SurfaceKind] & string];
}[keyof GermanAttestationSchemaTree & string];

export type CanonicalGermanAttestationRouteKey =
	GermanAttestationSchemaRoutes["key"];

export type CanonicalGermanAttestationSchemaRegistry = {
	[Route in GermanAttestationSchemaRoutes as Route["key"]]: Route["schema"];
};

type CanonicalGermanAttestationSchemaForRoute<
	Key extends CanonicalGermanAttestationRouteKey,
> = CanonicalGermanAttestationSchemaRegistry[Key];

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;

export type ProveCanonicalGermanAttestationSchemaRoute<
	Key extends CanonicalGermanAttestationRouteKey,
	Schema extends CanonicalGermanAttestationSchemaForRoute<Key>,
> = Equal<Schema, CanonicalGermanAttestationSchemaForRoute<Key>>;

function collectCanonicalGermanAttestationSchemas(): CanonicalGermanAttestationSchemaRegistry {
	const entries: Array<readonly [string, z.ZodType]> = [];
	const collect = (
		branch: unknown,
		coordinates: readonly string[] = [],
	): void => {
		if (typeof branch === "function") {
			entries.push([coordinates.join("/"), branch()]);
			return;
		}
		if (branch === null || typeof branch !== "object") {
			throw new TypeError(
				`Invalid German Attestation schema node at ${coordinates.join("/")}.`,
			);
		}
		for (const [coordinate, child] of Object.entries(branch))
			collect(child, [...coordinates, coordinate]);
	};
	collect(schemasFor.de.entity.Attestation);

	// The registry type is derived from Dumling's actual `typeof schemasFor`.
	// Dynamic traversal loses indexed keys; this is the sole reconstruction
	// after every runtime key and schema came from that same canonical tree.
	return Object.fromEntries(
		entries,
	) as CanonicalGermanAttestationSchemaRegistry;
}

export const canonicalGermanAttestationSchemas =
	collectCanonicalGermanAttestationSchemas();

const [firstGermanAttestationSchema, secondGermanAttestationSchema, ...rest] =
	Object.values(canonicalGermanAttestationSchemas);
if (
	firstGermanAttestationSchema === undefined ||
	secondGermanAttestationSchema === undefined
) {
	throw new Error(
		"Dumling must expose at least two German Attestation schemas for Grammatical Results.",
	);
}

export const germanAttestationSchema = z.union([
	firstGermanAttestationSchema,
	secondGermanAttestationSchema,
	...rest,
]);
