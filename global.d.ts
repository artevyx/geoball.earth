/// <reference types='./types/CalcUtils' />
/// <reference types='./types/Camera' />
/// <reference types='./types/EffectComposer' />
/// <reference types='./types/Pass' />
/// <reference types='./types/Recording.d.ts' />
/// <reference types='./types/ShaderPass' />
/// <reference types='./types/Telemetry' />
/// <reference types='./types/UnrealBloomPass' />


declare var CESIUM_BASE_URL: string;

declare type SVGIconProps = {
  icon: keyof typeof SVG_ICON | string,
  active?: boolean,
  size?: number | string,
  rotateDeg?: number,
  opacity?: number,
  style?: React.CSSProperties,
  title?: string,
};
