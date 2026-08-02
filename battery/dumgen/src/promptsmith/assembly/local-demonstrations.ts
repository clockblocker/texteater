import { stableJson } from "../../lib/stable-json";
import type {
	LocalDemonstration,
	LocalDemonstrations,
	ParsedLocalDemonstration,
	PromptInputSchema,
	PromptOutputSchema,
} from "./contracts";

export type LocalDemonstrationState = {
	readonly inputSchema: PromptInputSchema;
	readonly outputSchema: PromptOutputSchema;
	readonly entries: readonly {
		readonly id: string;
		readonly value: ParsedLocalDemonstration<
			PromptInputSchema,
			PromptOutputSchema
		>;
		readonly exactFingerprint: string;
		readonly contaminationKeys: readonly string[];
	}[];
};

const localDemonstrationStates = new WeakMap<object, LocalDemonstrationState>();

export function defineLocalDemonstrations<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
>(args: {
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly cases: readonly LocalDemonstration<
		import("zod").input<InputSchema>,
		import("zod").input<OutputSchema>
	>[];
}): LocalDemonstrations<InputSchema, OutputSchema> {
	const entries = args.cases.map((demonstration, index) => {
		const id = `local demonstration ${index + 1}`;
		const parsedInput = args.inputSchema.safeParse(demonstration.input);
		if (!parsedInput.success) {
			throw new Error(`${id} has invalid input.`, {
				cause: parsedInput.error,
			});
		}
		const parsedOutput = args.outputSchema.safeParse(
			demonstration.idealOutput,
		);
		if (!parsedOutput.success) {
			throw new Error(`${id} has invalid ideal output.`, {
				cause: parsedOutput.error,
			});
		}
		const explanation = demonstration.explanation?.trim();
		if (explanation !== undefined && explanation.length === 0) {
			throw new Error(`${id} has an empty explanation.`);
		}
		const contaminationKeys = normalizeContaminationKeys(
			id,
			demonstration.contaminationKeys,
		);
		const value = deepFreeze({
			input: parsedInput.data,
			idealOutput: parsedOutput.data,
			...(explanation === undefined ? {} : { explanation }),
			...(contaminationKeys.length === 0 ? {} : { contaminationKeys }),
		}) as ParsedLocalDemonstration<InputSchema, OutputSchema>;
		return Object.freeze({
			id,
			value,
			exactFingerprint: stableJson(parsedInput.data),
			contaminationKeys,
		});
	});
	const demonstrations = Object.freeze({
		cases: Object.freeze(entries.map(({ value }) => value)),
	});
	localDemonstrationStates.set(demonstrations, {
		inputSchema: args.inputSchema,
		outputSchema: args.outputSchema,
		entries: Object.freeze(entries),
	});
	return demonstrations;
}

export function getLocalDemonstrationState(
	demonstrations: LocalDemonstrations,
): LocalDemonstrationState | undefined {
	return localDemonstrationStates.get(demonstrations);
}

export function normalizeContaminationKeys(
	location: string,
	keys: readonly string[] | undefined,
): readonly string[] {
	if (keys === undefined) return Object.freeze([]);
	const seen = new Set<string>();
	const result: string[] = [];
	for (const rawKey of keys) {
		if (typeof rawKey !== "string" || rawKey.trim().length === 0) {
			throw new Error(`${location} has an invalid contamination key.`);
		}
		const key = rawKey.trim();
		if (seen.has(key)) {
			throw new Error(`${location} repeats contamination key "${key}".`);
		}
		seen.add(key);
		result.push(key);
	}
	return Object.freeze(result);
}

function deepFreeze<T>(value: T): T {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		for (const nested of Object.values(value)) deepFreeze(nested);
		Object.freeze(value);
	}
	return value;
}
