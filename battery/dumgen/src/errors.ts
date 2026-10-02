/**
 * The two ways a Dumgen operation fails without a bug (#552): no answer came
 * back, or one came back that Dumgen cannot use. They are the whole error
 * channel of Dumgen's Effects. Bad input, such as an unsupported language
 * or a blank Sentence, is a Defect, and so is a bug.
 */
import * as Data from "effect/Data";

/**
 * A transport call that brought no answer: the transport threw or rejected,
 * its deadline passed, or the provider refused. `cause` is what it threw.
 */
export class ProviderFailure extends Data.TaggedError("ProviderFailure")<{
	/** The request of the operation that failed (`segments`, `route`, …). */
	readonly stage: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

/**
 * An answer Dumgen cannot use: another model answered than the one it
 * named, or an answer is missing or of another type than its question.
 */
export class InvalidModelOutput extends Data.TaggedError("InvalidModelOutput")<{
	readonly stage: string;
	readonly message: string;
}> {}
