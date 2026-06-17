import { Tabs } from "expo-router";
import { MapTabIcon } from "~/components/icons/MapTabIcon";
import { WalletTabIcon } from "~/components/icons/WalletTabIcon";
import { AccountTabIcon } from "~/components/icons/AccountTabIcon";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#000000" },
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "#666666",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Map",
          tabBarIcon: ({ color }) => <MapTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarIcon: ({ color }) => <WalletTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <AccountTabIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
