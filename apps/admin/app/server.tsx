import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { getRouterManifest } from "@tanstack/react-start/router-manifest";
import { createClerkHandler } from "@clerk/tanstack-react-start/server";
import { createRouter } from "./router";

export default createClerkHandler(
  createStartHandler({ createRouter, getRouterManifest }),
)(({ request, router, responseHeaders }) => {
  return defaultStreamHandler({ request, router, responseHeaders });
});
