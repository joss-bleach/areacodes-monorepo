// Use EXPO_NO_PAID_ENTITLEMENTS=1 for dev builds on a free Apple ID.
// Strips Sign in with Apple and push notification entitlements which require
// a paid Apple Developer account to provision.
const noPaidEntitlements = process.env.EXPO_NO_PAID_ENTITLEMENTS === "1";

/** @type {import('expo/config').ExpoConfig} */
const config = {
  name: "Areacodes",
  slug: "areacodes",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "areacodes",
  userInterfaceStyle: "dark",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "cover",
    backgroundColor: "#000000",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.acbrighton.consumer",
    minimumOsVersion: "16.4",
    associatedDomains: ["applinks:map.acbrighton.com"],
    ...(noPaidEntitlements
      ? {}
      : {
          usesAppleSignIn: true,
          infoPlist: {
            UIBackgroundModes: ["remote-notification"],
            ITSAppUsesNonExemptEncryption: false,
          },
          entitlements: {
            "aps-environment": "production",
            "com.apple.developer.applesignin": ["Default"],
          },
        }),
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
          NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
        },
      ],
    },
  },
  android: {
    package: "com.acbrighton.consumer",
    minSdkVersion: 24,
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#000000",
    },
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "map.acbrighton.com",
            pathPrefix: "/v",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: [
    "expo-router",
    ...(noPaidEntitlements ? [] : ["expo-apple-authentication"]),
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#000000",
        defaultChannel: "default",
        sounds: [],
      },
    ],
    [
      "expo-build-properties",
      {
        ios: { deploymentTarget: "16.4" },
        android: { minSdkVersion: 24 },
      },
    ],
    [
      "expo-secure-store",
      {
        faceIDPermission:
          "Allow Areacodes to use Face ID to keep you signed in.",
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Areacodes uses your location to show nearby vouchers.",
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: "354c1cd4-e3a4-40da-8e13-b38b5e47e1e8" },
    router: { origin: false },
  },
  owner: "jossbleach",
  runtimeVersion: "1.0.0",
  updates: { url: "https://u.expo.dev/354c1cd4-e3a4-40da-8e13-b38b5e47e1e8" },
};

module.exports = { expo: config };
