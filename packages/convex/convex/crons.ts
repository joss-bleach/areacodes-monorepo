import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "poll POS redemptions",
  { hourUTC: 2, minuteUTC: 0 },
  internal.functions.posConnections.runRedemptionPolling,
  {},
);

export default crons;
