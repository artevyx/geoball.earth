import { JSX } from 'react';

export function CesiumAttributionBadge({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 9950,
        right: '10px',
        bottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
        pointerEvents: 'auto',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
      }}
    >
      {open && (
        <div
          style={{
            width: 'min(320px, calc(100vw - 24px))',
            maxHeight: '38svh',
            overflowY: 'auto',
            padding: '12px 14px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.28)',
            background: 'rgba(5, 7, 10, 0.84)',
            boxShadow: '0 14px 42px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            fontSize: '11px',
            lineHeight: 1.35,
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '8px' }}>
            Data Attribution
          </div>
          <div style={{ opacity: 0.86 }}>
            CesiumJS globe rendering and Cesium ion services/content attribution.
          </div>
          <div style={{ opacity: 0.86, marginTop: '6px' }}>
            Cesium World Terrain and global 3D/imagery resources may include data from Cesium ion and its upstream data providers.
          </div>
          <div style={{ opacity: 0.86, marginTop: '6px' }}>
            OpenStreetMap-derived building data is displayed through Cesium OSM Buildings.
          </div>
          <div style={{ opacity: 0.62, marginTop: '8px' }}>
            This compact badge replaces the overflowing default credit widget in the prototype UI. Verify final attribution treatment against your active Cesium ion plan and data-provider requirements before public launch.
          </div>
        </div>
      )}

      <div
        style={{
          minWidth: '116px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          padding: '6px 8px 7px',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.28)',
          background: 'rgba(5, 7, 10, 0.74)',
          boxShadow: '0 9px 24px rgba(0,0,0,0.42)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            opacity: 0.88,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 32 32"
            aria-hidden="true"
            focusable="false"
          >
            <circle cx="16" cy="16" r="13" fill="none" stroke="white" strokeWidth="3" opacity="0.9" />
            <path d="M24 9.5A10 10 0 1 0 24 22.5" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" />
            <circle cx="22.8" cy="16" r="2.4" fill="white" />
          </svg>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            Cesium
          </span>
        </div>

        <button
          type="button"
          onClick={onToggle}
          style={{
            border: 0,
            padding: 0,
            margin: 0,
            background: 'transparent',
            color: 'rgba(255,255,255,0.82)',
            fontSize: '10px',
            lineHeight: 1,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Data Attribution
        </button>
      </div>
    </div>
  );
}
