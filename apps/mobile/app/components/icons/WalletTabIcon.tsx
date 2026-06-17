import Svg, { Path } from "react-native-svg";

export function WalletTabIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={16} viewBox="0 0 20 16" fill="none">
      <Path
        d="M13 1V3M13 7V9M13 13V15M3 1C1.89543 1 1 1.89543 1 3V6C2.10457 6 3 6.89543 3 8C3 9.10457 2.10457 10 1 10V13C1 14.1046 1.89543 15 3 15H17C18.1046 15 19 14.1046 19 13V10C17.8954 10 17 9.10457 17 8C17 6.89543 17.8954 6 19 6V3C19 1.89543 18.1046 1 17 1H3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
