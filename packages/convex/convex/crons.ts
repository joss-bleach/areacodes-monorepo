import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "sync PostHog weekly views",
  { hourUTC: 3, minuteUTC: 0 },
  internal.functions.adminAnalytics.syncPosthogWeeklyViews,
  {},
);

export default crons;
