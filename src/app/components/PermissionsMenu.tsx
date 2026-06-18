'use client';
import { InlineSVGIcon } from 'parts/icons/InlineSVGIcon';
import { SVG_ICON } from './icons/SVGIcons';


type PermissionMenuProps = {
  expanded: boolean;

  geoReady: boolean;
  cameraReady: boolean;
  sensorReady: boolean;

  sensorHeadActive: boolean;

  onToggleExpanded: () => void;
  onRequestLocation: () => void;
  onRequestCamera: () => void;
  onRequestSensors: () => void;
};

export function PermissionMenu({
  expanded,
  geoReady,
  cameraReady,
  sensorReady,
  sensorHeadActive,
  onToggleExpanded,
  onRequestLocation,
  onRequestCamera,
  onRequestSensors,
}: PermissionMenuProps) {
  return (
    <div className="permissionMenu">
      <button
        type="button"
        className={[
          'sensorHeadButton',
          sensorHeadActive ? 'sensorHeadButtonActive' : '',
        ].join(' ')}
        onClick={onToggleExpanded}
        aria-label="Toggle permissions"
      >
        {/* @ts-ignore | STFU its the same fucking thing */}
        <InlineSVGIcon svg={SVG_ICON.SensorHead} />
      </button>

      {expanded && (
        <div className="permissionMenuItems">
          <button
            type="button"
            className={[
              'permissionIconButton',
              cameraReady ? 'permissionIconReady' : '',
            ].join(' ')}
            onClick={onRequestCamera}
            aria-label="Camera permission"
          >
            <InlineSVGIcon svg={SVG_ICON.PermissionsCamera} />
          </button>

          <button
            type="button"
            className={[
              'permissionIconButton',
              sensorReady ? 'permissionIconReady' : '',
            ].join(' ')}
            onClick={onRequestSensors}
            aria-label="Gyroscope permission"
          >
            <InlineSVGIcon svg={SVG_ICON_LIBRARY.PermissionsGyroscope} />
          </button>

          <button
            type="button"
            className={[
              'permissionIconButton',
              geoReady ? 'permissionIconReady' : '',
            ].join(' ')}
            onClick={onRequestLocation}
            aria-label="Location permission"
          >
            <InlineSVGIcon svg={SVG_ICON_LIBRARY.PermissionsLocation} />
          </button>
        </div>
      )}
    </div>
  );
}