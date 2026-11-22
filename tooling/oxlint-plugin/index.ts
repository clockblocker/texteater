import noInlineSchemaCompile from "./rules/no-inline-schema-compile.ts";
import noPollingLoopInTests from "./rules/no-polling-loop-in-tests.ts";
import noRealTimeWaitInTests from "./rules/no-real-time-wait-in-tests.ts";
import noUnreasonedStateSync from "./rules/no-unreasoned-state-sync.ts";
import noWallClockInTests from "./rules/no-wall-clock-in-tests.ts";
import preferCatchTags from "./rules/prefer-catch-tags.ts";
import { definePlugin } from "./types.ts";

export default definePlugin({
	meta: {
		name: "textfresser",
	},
	rules: {
		"no-inline-schema-compile": noInlineSchemaCompile,
		"no-polling-loop-in-tests": noPollingLoopInTests,
		"no-real-time-wait-in-tests": noRealTimeWaitInTests,
		"no-unreasoned-state-sync": noUnreasonedStateSync,
		"no-wall-clock-in-tests": noWallClockInTests,
		"prefer-catch-tags": preferCatchTags,
	},
});
