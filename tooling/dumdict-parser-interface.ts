import type {
	ChangePrecondition,
	CommitChangesRequest,
	CommitChangesResult,
	DumdictPlan,
	LemmaRecord,
	PendingSemanticRelationLocator,
	PendingSemanticRelationRecord,
	PlannedChangeOp,
	ReadingEntry,
	ReadingPatchOp,
	SurfaceEntry,
} from "dumdict";
import type * as Dumling from "dumling/types";
import type { ParsingError } from "../battery/common-utils/src/index";

type Parsed<Value> = Value | ParsingError<Value>;

/** Frozen package-root parser contract for Dumdict's lightweight boundary. */
export interface DumdictParserInterface {
	readonly ParsingError: typeof import("../battery/common-utils/src/index").ParsingError;
	readonly parseAsLemmaRecord: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<LemmaRecord<L>>;
	readonly parseAsReadingEntry: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<ReadingEntry<L>>;
	readonly parseAsSurfaceEntry: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<SurfaceEntry<L>>;
	readonly parseAsPendingSemanticRelationLocator: <
		const L extends Dumling.Language,
	>(
		input: unknown,
		language: L,
	) => Parsed<PendingSemanticRelationLocator<L>>;
	readonly parseAsPendingSemanticRelationRecord: <
		const L extends Dumling.Language,
	>(
		input: unknown,
		language: L,
	) => Parsed<PendingSemanticRelationRecord<L>>;
	readonly parseAsChangePrecondition: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<ChangePrecondition<L>>;
	readonly parseAsReadingPatchOp: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<ReadingPatchOp<L>>;
	readonly parseAsPlannedChangeOp: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<PlannedChangeOp<L>>;
	readonly parseAsDumdictPlan: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<DumdictPlan<L>>;
	readonly parseAsCommitChangesRequest: <const L extends Dumling.Language>(
		input: unknown,
		language: L,
	) => Parsed<CommitChangesRequest<L>>;
	readonly parseAsCommitChangesResult: (
		input: unknown,
	) => Parsed<CommitChangesResult>;
}
