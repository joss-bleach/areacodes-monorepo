import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { createRouter } from "./router";

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(async ({ request, ...rest }) => {
  try {
    const auth = await getAuth(request);
    return defaultStreamHandler({
      request,
      ...rest,
      context: { auth },
    });
  } catch (e) {
    // Clerk throws a Response(307) when it needs to perform a handshake
    // (e.g. first request in development). Return it so the browser follows
    // the redirect and completes the auth flow.
    if (e instanceof Response) {
      return e;
    }
    throw e;
  }
});
