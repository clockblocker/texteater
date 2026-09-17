import { createTypeSafeExecutor, noul } from "promptsmith/typesafe";

const TYPESAFE_API_KEY = process.env.TYPESAFE_TOKEN?.trim();

if (!TYPESAFE_API_KEY) {
	throw new Error("TYPESAFE_TOKEN is not set");
}

const execute = createTypeSafeExecutor({ apiKey: TYPESAFE_API_KEY });
const response = await execute({
	state: {
		message: "The TypeSafe SDK is connected and ready to use.",
	},
	questions: {
		isPositive: noul("Does `message` express a positive sentiment?", {
			true: "The message is positive or optimistic.",
			false: "The message is neutral or negative.",
		}),
	},
});

console.log(
	JSON.stringify(
		{
			model: response.model,
			positiveProbability: response.answers.isPositive.noul,
			usage: response.usage,
		},
		null,
		2,
	),
);
