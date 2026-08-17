import type { PlannedChangeOp } from "../core/planned-changes";
import type { StoreRevision } from "../dto";
import type { SupportedLanguage } from "../dumling";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type DeepReadonly<T> = T extends Primitive
	? T
	: T extends (...args: never[]) => unknown
		? T
		: T extends readonly unknown[]
			? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
			: T extends object
				? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
				: T;

export type {
	PlannedChangeOp,
	ReadingPatchOp,
} from "../core/planned-changes";
export type { ChangePrecondition } from "../core/preconditions";

/**
 * A Dumdict-authored plan that a host adapter may apply inside its own
 * transaction together with related host writes.
 */
export type DumdictPlan<L extends SupportedLanguage> = {
	readonly baseRevision: StoreRevision;
	readonly changes: readonly DeepReadonly<PlannedChangeOp<L>>[];
};

export type CommitChangesRequest<L extends SupportedLanguage> = {
	readonly baseRevision: StoreRevision;
	readonly changes: readonly PlannedChangeOp<L>[];
};

export type CommitChangesResult =
	| { status: "committed"; nextRevision: StoreRevision }
	| {
			status: "conflict";
			code: CommitConflictCode;
			latestRevision?: StoreRevision;
			message?: string;
	  };

export type CommitConflictCode =
	| "revisionConflict"
	| "semanticPreconditionFailed";
