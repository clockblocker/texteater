import migrations from "@convex-dev/migrations/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
	env: {
		/** "1" allows the global wipes: clearing shared data, stripping analyses. */
		TF_DEMO_ADMIN: v.optional(v.string()),
		/** "1" honours requests to capture Resolution Inspector records. */
		TF_INSPECTION: v.optional(v.string()),
	},
});
app.use(migrations);
app.use(rateLimiter);

export default app;
