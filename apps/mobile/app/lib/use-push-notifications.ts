import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useMutation } from "convex/react";
import { api } from "@repo/convex";
import { authClient } from "./auth-client";

// expo-notifications exports PermissionResponse from 'expo' which doesn't
// re-export it in its type declarations. Use a local type to avoid the gap.
type PermStatus = { granted: boolean };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function getAndRegisterToken(
  registerToken: (args: { token: string }) => Promise<unknown>,
): Promise<void> {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return;

  const perms = (await Notifications.getPermissionsAsync()) as unknown as PermStatus;
  if (!perms.granted) return;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerToken({ token: tokenData.data });
}

export function useRegisterPushTokenOnAuth() {
  const { data: session } = authClient.useSession();
  const registerToken = useMutation(api.functions.pushTokens.registerPushToken);
  const registered = useRef(false);

  useEffect(() => {
    if (!session?.user || registered.current) return;
    registered.current = true;
    void getAndRegisterToken(registerToken);
  }, [session, registerToken]);
}

export async function requestPushPermissionAndRegister(
  registerToken: (args: { token: string }) => Promise<unknown>,
): Promise<boolean> {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return false;

  const existing = (await Notifications.getPermissionsAsync()) as unknown as PermStatus;
  let granted = existing.granted;

  if (!granted) {
    const requested = (await Notifications.requestPermissionsAsync()) as unknown as PermStatus;
    granted = requested.granted;
  }

  if (!granted) return false;

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  await registerToken({ token: tokenData.data });
  return true;
}
