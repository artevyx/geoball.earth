import { JSX, useEffect, useMemo, useRef } from 'react';
import { RAW_SVG_ICONS } from 'res/SVGIcons';

export const ICON_COLOR_MAP = {
  activeCream: '#ffe08e',
  activeGreen: '#b0ff40',
  inactiveCream: '#2a2a2f',
  inactiveGreen: '#ff37e6',
} as const;

export function recolorSvgForState(rawSvg: string, active: boolean): string {
  if (active) return rawSvg;

  return rawSvg
    .replaceAll(ICON_COLOR_MAP.activeCream, ICON_COLOR_MAP.inactiveCream)
    .replaceAll(ICON_COLOR_MAP.activeCream.toUpperCase(), ICON_COLOR_MAP.inactiveCream)
    .replaceAll(ICON_COLOR_MAP.activeGreen, ICON_COLOR_MAP.inactiveGreen)
    .replaceAll(ICON_COLOR_MAP.activeGreen.toUpperCase(), ICON_COLOR_MAP.inactiveGreen);
}

export function InlineSvgIcon({
  icon,
  active = true,
  size = '100%',
  rotateDeg = 0,
  opacity = 1,
  style,
  title,
}: {
  icon: keyof typeof RAW_SVG_ICONS;
  active?: boolean;
  size?: number | string;
  rotateDeg?: number;
  opacity?: number;
  style?: React.CSSProperties;
  title?: string;
}): JSX.Element {
  const hostRef = useRef<HTMLSpanElement | null>(null);

  const svgMarkup = useMemo(
    () => recolorSvgForState(RAW_SVG_ICONS[icon], active),
    [icon, active],
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const svg = host.querySelector('svg');
    if (!svg) return;

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('aria-hidden', title ? 'false' : 'true');
    svg.setAttribute('focusable', 'false');
    svg.dataset.iconState = active ? 'active' : 'inactive';

    // Inline SVG means later code can do precise orchestration, for example:
    // host.querySelector('#gb-sensorHead-SomeNamedPath')?.setAttribute('fill', '#ff37e6')
  }, [active, svgMarkup, title]);

  return (
    <span
      ref={hostRef}
      title={title}
      data-geoball-icon-host={icon}
      data-geoball-icon-active={active ? 'true' : 'false'}
      style={{
        display: 'block',
        width: size,
        height: size,
        transform: `rotate(${rotateDeg}deg)`,
        opacity,
        userSelect: 'none',
        pointerEvents: 'none',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

