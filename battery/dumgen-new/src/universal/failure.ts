export type DumgenFailureTag =
	| "InvalidInput"
	| "ProviderFailure"
	| "InvalidModelOutput"
	| "Unresolved"
	| "NotImplemented"
	| "CatalogMiss";
class Failure<Tag extends DumgenFailureTag> extends Error {
	constructor(
		readonly _tag: Tag,
		readonly stage: string,
		message: string,
		readonly route?: string,
	) {
		super(message);
		this.name = _tag;
	}
}

/** Discriminated failures remain narrowable with Effect.catchTag. */
export type DumgenFailure = {
	[Tag in DumgenFailureTag]: Failure<Tag>;
}[DumgenFailureTag];
export const DumgenFailure = Failure;
