import {
  Ion,
  Terrain,
  ShadowMode,
  CesiumWidget,
  Cesium3DTileStyle,
  createOsmBuildingsAsync,
} from 'cesium';
import {
  JSX,
  useEffect,
  useRef
} from 'react';

// Base Cesium CSS package + Module-specific CSS
import "cesium/Build/Cesium/Widgets/widgets.css";
import 'styles/modules/cesium-globe.module.css';


export default function CesiumGlobe(): JSX.Element {

  const mapEngine = useRef<CesiumWidget>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 

    console.debug('-- Initializing Cesium --');
    // DOM-Guard
    if (!containerRef.current) return;

    // Prevents double init (React strict mode / HMR)
    if (mapEngine.current) return;

    window.CESIUM_BASE_URL = '/lib/cesium';
    Ion.defaultAccessToken = process.env['NEXT_PUBLIC_CESIUM_TOKEN'] as string;

    const cesiumWidget = new CesiumWidget(containerRef.current, {
      terrain: Terrain.fromWorldTerrain(),
      scene3DOnly: true,
      useDefaultRenderLoop: true,
      requestRenderMode: false,
    });

    console.debug('-- Initialization Complete --', cesiumWidget);

    // Set the default terrain detail
    cesiumWidget.scene.verticalExaggeration = 1.6;

    // Add generic building models
    createOsmBuildingsAsync()
      .then(buildings => {
        if (!buildings) return;
        buildings.backFaceCulling = true;
        buildings.style = new Cesium3DTileStyle({
          color: 'color("black")',
          shadows: ShadowMode.ENABLED,
        });
        cesiumWidget.scene.primitives.add(buildings);
      });
    
    mapEngine.current = cesiumWidget;
    
    const resizeObserver = new ResizeObserver(() => { cesiumWidget.resize() });
    resizeObserver.observe(containerRef.current);

    // cleanup
    return () => {
      resizeObserver.disconnect();
      cesiumWidget.destroy();
      mapEngine.current = null;
    };
    }, []);

  return <div
    id='globe-container' ref={ containerRef }
    style={{
      width: '100svw',
      height: '100svh',
    }}
  />;
}
