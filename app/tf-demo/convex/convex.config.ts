import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
	env: {
		/** "1" allows the global wipes: clearing shared data, stripping analyses. */
		TF_DEMO_ADMIN: v.optional(v.string()),
		/** "1" honours requests to capture Resolution Inspector records. */
		TF_INSPECTION: v.optional(v.string()),
		/** The TypeSafe key that Dumgen asks jev with, at intake and on a click. */
		TYPESAFE_API_KEY: v.optional(v.string()),
		/** The OpenAI key that Dumgen's `resolve.grammar` writes with through Luna. */
		OPENAI_API_KEY: v.optional(v.string()),
		/**
		 * Each model call's deadline on a click, in milliseconds; intake's
		 * 120 s until the first live click measurement sets it (#858).
		 */
		CLICK_CALL_DEADLINE_MS: v.optional(v.string()),
	},
});
app.use(rateLimiter);

export default app;
