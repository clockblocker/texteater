import { type TestOptions, test } from "bun:test";
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import { TestClock } from "effect/testing";

/** @public Reusable `bun:test` Effect test registration helper. */
export interface EffectTest<R = never> {
	<A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	): void;
	readonly only: <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	) => void;
	readonly skip: <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	) => void;
	readonly failing: <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	) => void;
	readonly each: <const T>(
		cases: readonly T[],
	) => <A, E>(
		name: string,
		body: (item: T) => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	) => void;
	readonly layer: <R2, LE>(
		layer: Layer.Layer<R2, LE, R>,
	) => EffectTest<R | R2>;
}

const makeEffectTest = <R = never, BaseE = never>(
	wrap: <A, E>(
		effect: Effect.Effect<A, E, R | Scope.Scope>,
	) => Effect.Effect<A, E | BaseE, never>,
): EffectTest<R> => {
	const run = <A, E>(
		effect: Effect.Effect<A, E, R | Scope.Scope>,
	): Promise<A> => Effect.runPromise(wrap(effect));

	const register = <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	): void => {
		test(name, () => run(body()), options);
	};
	register.only = <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	): void => {
		test.only(name, () => run(body()), options);
	};
	register.skip = <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	): void => {
		test.skip(name, () => run(body()), options);
	};
	register.failing = <A, E>(
		name: string,
		body: () => Effect.Effect<A, E, R | Scope.Scope>,
		options?: number | TestOptions,
	): void => {
		test.failing(name, () => run(body()), options);
	};
	register.each =
		<const T>(cases: readonly T[]) =>
		<A, E>(
			name: string,
			body: (item: T) => Effect.Effect<A, E, R | Scope.Scope>,
			options?: number | TestOptions,
		): void => {
			test.each(cases.map((item) => [item] as const))(
				name,
				(item) => run(body(item)),
				options,
			);
		};
	register.layer = <R2, LE>(
		layer: Layer.Layer<R2, LE, R>,
	): EffectTest<R | R2> =>
		makeEffectTest<R | R2, BaseE | LE>((effect) =>
			wrap(Effect.scoped(effect).pipe(Effect.provide(layer))),
		);

	return register;
};

/**
 * Registers a `bun:test` test running an Effect with a fresh `TestClock` and
 * automatic `Scope` finalization.
 */
export const testEffect: EffectTest = makeEffectTest((effect) =>
	Effect.scoped(effect).pipe(Effect.provide(TestClock.layer())),
);

/**
 * Registers a `bun:test` test running an Effect with the live `Clock` and
 * automatic `Scope` finalization (for wall-clock, filesystem, or subprocess tests).
 */
export const testLive: EffectTest = makeEffectTest((effect) =>
	Effect.scoped(effect),
);
