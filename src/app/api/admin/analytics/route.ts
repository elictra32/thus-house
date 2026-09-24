import { adminRoute, ok } from "@/lib/admin-route";
import { computeAnalytics } from "@/lib/analytics";

export const GET = adminRoute(async (_req, { service }) => ok(await computeAnalytics(service)));
