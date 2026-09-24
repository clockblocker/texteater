import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
	"clean up expired Resolution Sessions",
	{ hours: 1 },
	internal.resolutionSessions.cleanupExpired,
	{},
);

export default crons;
