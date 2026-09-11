import type { z } from "zod";
import type {
	Brand,
	DistributiveOmit,
	DistributivePick,
	Equal,
	Expect,
	ExpectFalse,
	IsAny,
	LooseAutocomplete,
	ParsingError,
	ParsingIssue,
	PrettifyDeep,
	Replace,
	ReplaceMany,
	ValueOf,
} from "../src";

type SuggestedOrCustom = LooseAutocomplete<"suggested">;
type _SuggestedLiteralIsAccepted = Expect<
	"suggested" extends SuggestedOrCustom ? true : false
>;
type _CustomLiteralIsAccepted = Expect<
	"custom" extends SuggestedOrCustom ? true : false
>;

type ExampleUnion =
	| { kind: "left"; left: string }
	| { kind: "right"; right: number };
type _EqualRecognizesIdenticalTypes = Expect<Equal<{ value: 1 }, { value: 1 }>>;
type _EqualRejectsDifferentTypes = ExpectFalse<
	Equal<{ value: 1 }, { value: 2 }>
>;
// biome-ignore lint/suspicious/noExplicitAny: any is the input under test.
type _IsAnyRecognizesAny = Expect<Equal<IsAny<any>, true>>;
type _IsAnyRejectsUnknown = ExpectFalse<IsAny<unknown>>;
type _ValueOfProducesPropertyUnion = Expect<
	Equal<ValueOf<{ left: "a"; right: "b" }>, "a" | "b">
>;
type _PrettifyDeepExpandsNestedIntersections = Expect<
	Equal<
		PrettifyDeep<{ nested: { left: string } & { right: number } }>,
		{ nested: { left: string; right: number } }
	>
>;
type _ReplaceChangesOneProperty = Expect<
	Equal<
		Replace<{ left: string; right: number }, "right", boolean>,
		{ left: string; right: boolean }
	>
>;
type _ReplaceManyChangesSeveralProperties = Expect<
	Equal<
		ReplaceMany<
			{ center: null; left: string; right: number },
			{ left: boolean; right: bigint }
		>,
		{ center: null; left: boolean; right: bigint }
	>
>;
type _DistributiveOmitPreservesUnionMembers = Expect<
	Equal<
		DistributiveOmit<ExampleUnion, "kind">,
		{ left: string } | { right: number }
	>
>;
type _DistributivePickPreservesUnionMembers = Expect<
	Equal<
		DistributivePick<ExampleUnion, "kind" | "left" | "right">,
		ExampleUnion
	>
>;
type ExampleId = Brand<string, "ExampleId">;
type _BrandRetainsItsValueType = Expect<
	ExampleId extends string ? true : false
>;
type _BrandRejectsAnUnbrandedValue = ExpectFalse<
	string extends ExampleId ? true : false
>;

type _IssuesRemainStructurallyCompatible = Expect<
	ParsingIssue extends z.ZodIssue ? true : false
>;

type ParsingErrorProjection = Pick<ParsingError, "issues" | "message" | "name">;
type ZodErrorProjection = Pick<z.ZodError, "issues" | "message" | "name">;
type _ErrorProjectionRemainsStructurallyCompatible = Expect<
	ParsingErrorProjection extends ZodErrorProjection ? true : false
>;
