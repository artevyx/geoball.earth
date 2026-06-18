import { JSX, useEffect, useMemo, useRef } from 'react';
import {
  SVG_ICON,
  ICON_COLOR,
} from '@constants';


export function setStateColor(SVG: string , active: boolean): string {
  if (active) return SVG;
  return SVG
    .replaceAll(ICON_COLOR.yellow, ICON_COLOR.grey)
    .replaceAll(ICON_COLOR.yellow.toUpperCase(), ICON_COLOR.grey)
    .replaceAll(ICON_COLOR.lime, ICON_COLOR.magenta)
    .replaceAll(ICON_COLOR.lime.toUpperCase(), ICON_COLOR.magenta);
}

export function InlineSVGIcon(props: SVGIconProps): JSX.Element {
  const hostRef = useRef<HTMLSpanElement | null>(null);

  // const markup = useMemo(() => setStateColor(SVG_ICON[props.icon]), props.active || false), [icon, active]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const svg = host.querySelector('svg');
    if (!svg) return;

    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('aria-hidden', props.title ? 'false' : 'true');
    svg.setAttribute('focusable', 'false');
    svg.dataset.iconState = props.active ? 'active' : 'inactive';

    // Inline SVG means later code can do precise orchestration, for example:
    // host.querySelector('#gb-sensorHead-SomeNamedPath')?.setAttribute('fill', '#ff37e6')

  }, [
    props.title,
    props.active,
    // props.svgMarkup,
  ]);

  return (
    <span
      ref={hostRef} title={props.title}
      data-geoball-icon-host={props.icon}
      data-geoball-icon-active={props.active ? 'true' : 'false'}
      
      style={{
        display: 'block',
        width: props.size,
        height: props.size,
        transform: `rotate(${ props.rotateDeg }deg)`,
        opacity: props.opacity || 1,
        userSelect: 'none',
        pointerEvents: 'none',
        ...props.style,
      }}
      // dangerouslySetInnerHTML={{ __html: propssvgMarkup }}
    />
  );
}

