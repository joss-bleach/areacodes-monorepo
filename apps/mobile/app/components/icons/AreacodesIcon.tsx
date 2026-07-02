import Svg, { Path, type SvgProps } from "react-native-svg";

const AREACODES_ICON_PATH_D =
  "M17.48,3.06l-.07-.07C13.42-1,6.97-1,2.98,2.99,1,4.99,0,7.59,0,10.2s1,5.23,2.98,7.22l7.28,6.07,7.21-6.01c3.98-3.98,3.98-10.44,0-14.42ZM14.07,14.71c-.95,1.06-2.23,1.6-3.83,1.6s-2.9-.52-3.85-1.58c-.96-1.05-1.44-2.46-1.44-4.23s.48-3.19,1.44-4.24c.95-1.05,2.24-1.56,3.85-1.56s2.87.52,3.83,1.57c.96,1.06,1.44,2.46,1.44,4.23s-.48,3.16-1.44,4.22Z";

// Areacodes teardrop mark. Single compound path (outer drop + ring counter);
// evenodd fill renders the counter as a hole. Aspect ratio is preserved via the
// default preserveAspectRatio, so passing an equal width/height (e.g. from the
// QR logo slot) letterboxes rather than squashes it.
export function AreacodesIcon({ fill = "#000000", ...props }: SvgProps) {
  return (
    <Svg viewBox="0 0 20.47 23.49" {...props}>
      <Path fill={fill} fillRule="evenodd" d={AREACODES_ICON_PATH_D} />
    </Svg>
  );
}

// Raw SVG markup for consumers that need a string, not a component — e.g.
// react-native-qrcode-svg's `logoSVG` prop, which renders via SvgXml/LocalSvg
// and silently no-ops on a component reference (it expects a string or a
// require()'d local asset, not a React function).
export const AREACODES_ICON_SVG = `<svg viewBox="0 0 20.47 23.49"><path fill-rule="evenodd" d="${AREACODES_ICON_PATH_D}"/></svg>`;
