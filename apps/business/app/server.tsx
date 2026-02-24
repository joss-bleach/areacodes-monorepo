import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/start/server";
import { getAuth } from "@clerk/tanstack-start/server";
import { createRouter } from "./router";

export default createStartHandler({
  createRouter,
})(async ({ request, ...rest }) => {
  const auth = await getAuth(request);
  return defaultStreamHandler({
    request,
    ...rest,
    context: { auth },
  });
});
