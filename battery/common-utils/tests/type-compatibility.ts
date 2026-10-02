import type { Equal, Expect, PrettifyDeep } from "../src";

type _EqualRecognizesIdenticalTypes = Expect<Equal<{ value: 1 }, { value: 1 }>>;
type _EqualRejectsDifferentTypes = Expect<
	Equal<Equal<{ value: 1 }, { value: 2 }>, false>
>;
type _PrettifyDeepExpandsNestedIntersections = Expect<
	Equal<
		PrettifyDeep<{ nested: { left: string } & { right: number } }>,
		{ nested: { left: string; right: number } }
	>
>;
