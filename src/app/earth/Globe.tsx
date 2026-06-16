'use client';
import {
  Ion,
  Terrain,
  ShadowMode,
  CesiumWidget,
  Cesium3DTileStyle,
  createOsmBuildingsAsync,
  ArcType,
  CallbackProperty,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Clock,
  ClockRange,
  ClockStep,
  Color,
  Ellipsoid,
  // @ts-ignore
  EllipsoidalOccluder,
  HeadingPitchRoll,
  JulianDate,
  Matrix3,
  Matrix4,
  Quaternion,
  Ray,
  SceneTransforms,
  Transforms,
  Math as CesiumMath,
} from 'cesium';
import * as Tone from 'tone';
import {
  JSX,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RECORDING_CONFIG } from 'config/recordingConfig';
import {
  CAMERA_CONFIG,
  DEBUG_CONFIG,
  FRUSTUM_CONFIG,
  OBSERVER_MODEL_CONFIG
} from 'config/globeConfig';
import {
  makeId,
  chooseVideoMimeType,
  stopMediaRecorder,
} from 'utils/mediaRecorder';
import { isLikelyMobileDevice } from 'utils/device';
import {
  formatDegrees,
  formatNumber,
  getCompassAlpha,
  getDeviceCameraQuaternion,
  isFiniteCartesian3,
  threeWorldToCesiumEnu
} from 'utils/compass';
import {
  makeRectangularFrustumPositions,
  vectorToTuple
} from 'utils/spatialMath';
import {
  deleteOrRedlistRecordingInIndexedDb,
  loadLocalRecordingMarkers,
  loadRecordingPlayback,
  revokePlaybackSession,
  saveBufferedRecordingToIndexedDb
} from 'res/geoballDB';
import { InlineSvgIcon } from 'icons/InlineSvgIcon';
import { CesiumAttributionBadge } from 'parts/CesiumAttributionBadge';
import { recordingGlyphForState } from 'res/recordingState';
import { 
  DEFAULT_DEBUG_TELEMETRY,
  DEFAULT_CAMERA_CONTROLS,
  } from 'constants';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import 'styles/modules/cesium-globe.module.css';


function smallPermissionButtonStyle(active: boolean): React.CSSProperties {
  return {
    width: '38px',
    height: '38px',
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    borderRadius: '999px',
    border: '2px solid rgba(255,255,255,0.75)',
    background: active ? 'rgba(255,255,255,0.86)' : 'rgba(12,12,14,0.78)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
    cursor: 'pointer',
  };
}

export default function Globe(): JSX.Element {
  const mapEngine = useRef<CesiumWidget | null>(null);
  const spatialMapEngine = useRef<CesiumWidget | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const spatialContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hardwarePlaybackVideoRef = useRef<HTMLVideoElement | null>(null);
  const spatialPlaybackVideoRef = useRef<HTMLVideoElement | null>(null);

  const recorderModeRef = useRef(false);
  const locationLockRef = useRef(false);
  const gateOpenRef = useRef(false);
  const recordingActiveRef = useRef(false);

  const currentPositionRef = useRef<Cartesian3 | null>(null);
  const currentDirectionRef = useRef<Cartesian3 | null>(null);
  const currentUpRef = useRef<Cartesian3 | null>(null);
  const latestTargetRef = useRef<{ kind: 'ground' | 'sky' | 'none'; position: Cartesian3 | null }>({ kind: 'none', position: null });
  const recordedBeaconPositionRef = useRef<Cartesian3 | null>(null);
  const bufferedRecordingRef = useRef<BufferedRecording | null>(null);
  const recordingEligibilityTimerRef = useRef<number | null>(null);
  const telemetryCaptureTimerRef = useRef<number | null>(null);
  const hardwareRecorderRef = useRef<MediaRecorder | null>(null);
  const spatialRecorderRef = useRef<MediaRecorder | null>(null);
  const spatialCaptureStreamRef = useRef<MediaStream | null>(null);
  const hardwareCaptureStreamRef = useRef<MediaStream | null>(null);
  const hardwareRecordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hardwareFrameCallbackIdRef = useRef<number | null>(null);
  const hardwareFallbackDrawTimerRef = useRef<number | null>(null);
  const localRecordingMarkersRef = useRef<LocalRecordingMarker[]>([]);
  const likelyIndoorsRef = useRef(false);
  const likelyOutdoorsRef = useRef(true);

  const frameIndexRef = useRef(0);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const rollBaselineRef = useRef<number | null>(null);
  const rollAxisRef = useRef<'portrait' | 'landscape'>('portrait');

  const frustumEdgesRef = useRef<Array<{ show: boolean }>>([]);
  const locationMarkerRefs = useRef<Array<{ show: boolean }>>([]);
  const debugUpdateTimerRef = useRef<number | null>(null);
  const lastStartupOrbitTimeRef = useRef<number | null>(null);
  const hasFlownToObserverRef = useRef(false);

  const latestPoseRef = useRef<{
    alpha: number;
    beta: number;
    gamma: number;
    compassSource: string;
    compassAbsolute: boolean;
  } | null>(null);

  const latestGeoRef = useRef({
    lat: null as number | null,
    lon: null as number | null,
    altitude: null as number | null,
    accuracy: null as number | null,
    altitudeAccuracy: null as number | null,
    gpsHeading: null as number | null,
    speed: null as number | null,
  });

  const latestMotionRef = useRef({
    accelerationX: null as number | null,
    accelerationY: null as number | null,
    accelerationZ: null as number | null,
    accelerationGravityX: null as number | null,
    accelerationGravityY: null as number | null,
    accelerationGravityZ: null as number | null,
    rotationAlpha: null as number | null,
    rotationBeta: null as number | null,
    rotationGamma: null as number | null,
    motionInterval: null as number | null,
  });

  const requestGeoRef = useRef<() => void>(() => {});
  const requestSensorRef = useRef<() => void>(() => {});
  const requestCameraRef = useRef<() => Promise<void>>(async () => {});
  const stopCameraRef = useRef<() => void>(() => {});
  const arrowDegRef = useRef(0);
  const puckDraggedRef = useRef(false);
  const puckDeleteArmedRef = useRef(false);

  const [recorderMode, setRecorderMode] = useState(false);
  const [locationLock, setLocationLock] = useState(false);
  const [monocleOpen, setMonocleOpen] = useState(false);
  const [telemetryOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [cesiumReady, setCesiumReady] = useState(false);
  const [geoReady, setGeoReady] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraEverGranted, setCameraEverGranted] = useState(false);
  const [sensorReady, setSensorReady] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [arrowDeg, setArrowDeg] = useState(0);
  const [beaconScreen, setBeaconScreen] = useState<{ x: number; y: number } | null>(null);
  const [recordingMarkerScreens, setRecordingMarkerScreens] = useState<RecordingMarkerScreen[]>([]);
  const [associationDraft, setAssociationDraft] = useState<{ recordingId: string; x: number; y: number } | null>(null);
  const [recordingPersistenceReady, setRecordingPersistenceReady] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [playbackSession, setPlaybackSession] = useState<PlaybackSession | null>(null);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [puck, setPuck] = useState({ x: 0, y: 0 });
  const [puckDeleteArmed, setPuckDeleteArmed] = useState(false);
  const [permissionsStackOpen, setPermissionsStackOpen] = useState(true);
  const [creditPanelOpen, setCreditPanelOpen] = useState(false);

  const [cameraControls, setCameraControls] = useState<CameraControlsState>(DEFAULT_CAMERA_CONTROLS);
  const [debugTelemetry, setDebugTelemetry] = useState<DebugTelemetry>(DEFAULT_DEBUG_TELEMETRY);

  const permissionsAllReady = geoReady && cameraReady && sensorReady;

  useEffect(() => {
    const videos = [hardwarePlaybackVideoRef.current, spatialPlaybackVideoRef.current]
      .filter((video): video is HTMLVideoElement => Boolean(video));

    if (!playbackSession || locationLock) {
      videos.forEach((video) => video.pause());
      return;
    }

    videos.forEach((video) => {
      void video.play().catch(() => {
        // Some browsers require another user gesture before resuming playback.
      });
    });
  }, [locationLock, playbackSession]);

  const rollDelta = useMemo(() => {
    const pose = latestPoseRef.current;
    if (!pose || rollBaselineRef.current === null) return 0;
    const raw = rollAxisRef.current === 'portrait' ? pose.gamma : pose.beta;
    return raw - rollBaselineRef.current;
  }, [debugTelemetry.gamma, debugTelemetry.beta, recordingActive]);

  const createFrameTelemetrySample = (): FrameTelemetrySample => {
    const pose = latestPoseRef.current;
    const geo = latestGeoRef.current;
    const motion = latestMotionRef.current;
    const target = latestTargetRef.current;
    const sample: FrameTelemetrySample = {
      frameIndex: frameIndexRef.current,
      unixMs: Date.now(),
      performanceMs: performance.now(),
      geolocation: { ...geo },
      orientation: {
        alpha: pose?.alpha ?? null,
        beta: pose?.beta ?? null,
        gamma: pose?.gamma ?? null,
        compassHeading: pose?.alpha ?? null,
        compassSource: pose?.compassSource ?? 'none',
        compassAbsolute: pose?.compassAbsolute ?? false,
      },
      motion: { ...motion },
      environment: {
        likelyIndoors: likelyIndoorsRef.current,
        likelyOutdoors: likelyOutdoorsRef.current,
      },
      cesiumDerived: {
        observerEcef: vectorToTuple(currentPositionRef.current),
        directionEcef: vectorToTuple(currentDirectionRef.current),
        upEcef: vectorToTuple(currentUpRef.current),
        targetKind: target.kind,
        targetEcef: vectorToTuple(target.position),
      },
    };
    frameIndexRef.current += 1;
    return sample;
  };

  const pushDebugTelemetry = () => {
    const pose = latestPoseRef.current;
    const geo = latestGeoRef.current;
    const motion = latestMotionRef.current;
    const target = latestTargetRef.current;
    setDebugTelemetry({
      mode: recorderModeRef.current ? 'recorder' : 'viewer',
      locationLock: locationLockRef.current,
      recordingActive: recordingActiveRef.current,
      lat: geo.lat,
      lon: geo.lon,
      altitude: geo.altitude,
      accuracy: geo.accuracy,
      altitudeAccuracy: geo.altitudeAccuracy,
      gpsHeading: geo.gpsHeading,
      speed: geo.speed,
      compassHeading: pose?.alpha ?? null,
      compassSource: pose?.compassSource ?? 'none',
      compassAbsolute: pose?.compassAbsolute ?? false,
      alpha: pose?.alpha ?? null,
      beta: pose?.beta ?? null,
      gamma: pose?.gamma ?? null,
      accelerationX: motion.accelerationX,
      accelerationY: motion.accelerationY,
      accelerationZ: motion.accelerationZ,
      accelerationGravityX: motion.accelerationGravityX,
      accelerationGravityY: motion.accelerationGravityY,
      accelerationGravityZ: motion.accelerationGravityZ,
      rotationAlpha: motion.rotationAlpha,
      rotationBeta: motion.rotationBeta,
      rotationGamma: motion.rotationGamma,
      motionInterval: motion.motionInterval,
      targetKind: target.kind,
      targetX: target.position?.x ?? null,
      targetY: target.position?.y ?? null,
      targetZ: target.position?.z ?? null,
      likelyIndoors: likelyIndoorsRef.current,
      likelyOutdoors: likelyOutdoorsRef.current,
    });
  };

  const updateAtmosphereForCameraHeight = () => {
    const widget = mapEngine.current;
    if (!widget) return;
    const { scene } = widget;
    const cameraPosition = scene.camera.positionWC;
    if (!isFiniteCartesian3(cameraPosition)) return;
    let height = Number.POSITIVE_INFINITY;
    try {
      height = Cartographic.fromCartesian(cameraPosition).height;
    } catch {
      return;
    }
    const nearSurfaceOrSubOrbital = height <= CAMERA_CONFIG.atmosphereReturnsAboveMeters;
    if (scene.skyBox) scene.skyBox.show = true;
    if (scene.sun) scene.sun.show = true;
    if (scene.moon) scene.moon.show = true;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = !nearSurfaceOrSubOrbital;
    scene.globe.showGroundAtmosphere = !nearSurfaceOrSubOrbital;
    scene.fog.enabled = !nearSurfaceOrSubOrbital;
  };

  const updateSpatialPreviewCamera = (
    observerPosition: Cartesian3,
    direction: Cartesian3,
    up: Cartesian3,
  ) => {
    const spatialWidget = spatialMapEngine.current;
    if (!spatialWidget) return;
    if (!isFiniteCartesian3(observerPosition) || !isFiniteCartesian3(direction) || !isFiniteCartesian3(up)) return;

    const { scene } = spatialWidget;

    if (scene.skyBox) scene.skyBox.show = true;
    if (scene.sun) scene.sun.show = true;
    if (scene.moon) scene.moon.show = true;
    if (scene.skyAtmosphere) scene.skyAtmosphere.show = false;

    scene.globe.showGroundAtmosphere = false;
    scene.fog.enabled = false;

    spatialWidget.camera.setView({
      destination: observerPosition,
      orientation: {
        direction,
        up,
      },
    });

    scene.requestRender();
  };

  const flyToObserverTopDown = () => {
    const widget = mapEngine.current;
    const currentPosition = currentPositionRef.current;
    if (!widget || !currentPosition) return;
    widget.camera.lookAtTransform(Matrix4.IDENTITY);
    const up = Ellipsoid.WGS84.geodeticSurfaceNormal(currentPosition, new Cartesian3());
    widget.camera.flyTo({
      destination: Cartesian3.add(currentPosition, Cartesian3.multiplyByScalar(up, CAMERA_CONFIG.locationIntroRangeMeters, new Cartesian3()), new Cartesian3()),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-88), roll: 0 },
      duration: CAMERA_CONFIG.locationLockFlySeconds,
    });
  };

  const enableLocationLockCamera = () => {
    const widget = mapEngine.current;
    const currentPosition = currentPositionRef.current;
    if (!widget || !currentPosition) return;
    const transform = Transforms.eastNorthUpToFixedFrame(currentPosition);
    widget.camera.lookAtTransform(transform, new Cartesian3(0, -CAMERA_CONFIG.locationLockRangeMeters, CAMERA_CONFIG.locationLockTiltMeters));
    widget.scene.requestRender();
  };

  const disableLocationLockCamera = () => {
    const widget = mapEngine.current;
    if (!widget) return;
    widget.camera.lookAtTransform(Matrix4.IDENTITY);
    widget.scene.requestRender();
  };

  const updateLocationLockedCameraFromGyro = (
    observerPosition: Cartesian3,
    direction: Cartesian3,
    up: Cartesian3,
    targetPosition: Cartesian3 | null,
  ) => {
    const widget = mapEngine.current;
    if (!widget || !locationLockRef.current) return;
    if (!isFiniteCartesian3(observerPosition) || !isFiniteCartesian3(direction)) return;

    const normalizedDirection = Cartesian3.normalize(direction, new Cartesian3());
    const surfaceUp = Ellipsoid.WGS84.geodeticSurfaceNormal(observerPosition, new Cartesian3());

    const cameraBackOffset = Cartesian3.multiplyByScalar(
      normalizedDirection,
      -CAMERA_CONFIG.locationLockRangeMeters,
      new Cartesian3(),
    );

    const cameraUpOffset = Cartesian3.multiplyByScalar(
      surfaceUp,
      CAMERA_CONFIG.locationLockTiltMeters,
      new Cartesian3(),
    );

    const destination = Cartesian3.add(
      observerPosition,
      Cartesian3.add(cameraBackOffset, cameraUpOffset, new Cartesian3()),
      new Cartesian3(),
    );

    const lookTarget = targetPosition && isFiniteCartesian3(targetPosition)
      ? targetPosition
      : Cartesian3.add(
        observerPosition,
        Cartesian3.multiplyByScalar(normalizedDirection, FRUSTUM_CONFIG.distanceMeters, new Cartesian3()),
        new Cartesian3(),
      );

    const viewDirection = Cartesian3.normalize(
      Cartesian3.subtract(lookTarget, destination, new Cartesian3()),
      new Cartesian3(),
    );

    if (!isFiniteCartesian3(destination) || !isFiniteCartesian3(viewDirection)) return;

    const viewUp = isFiniteCartesian3(up)
      ? Cartesian3.normalize(up, new Cartesian3())
      : surfaceUp;

    widget.camera.lookAtTransform(Matrix4.IDENTITY);
    widget.camera.setView({
      destination,
      orientation: {
        direction: viewDirection,
        up: viewUp,
      },
    });
  };


  const playRecordingChime = async (kind: 'ready' | 'saved') => {
    try {
      await Tone.start();
      const synth = new Tone.Synth({
        oscillator: { type: 'sine' },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.08, release: 0.28 },
      }).toDestination();
      const notes = kind === 'ready' ? ['E5', 'G5'] : ['C5', 'E5', 'G5'];
      const now = Tone.now();
      notes.forEach((note, index) => {
        synth.triggerAttackRelease(note, '16n', now + index * 0.09);
      });
      window.setTimeout(() => synth.dispose(), 900);
    } catch (err) {
      console.warn('Tone.js chime failed', err);
    }
  };

  const closePlayback = () => {
    setPlaybackSession((current) => {
      revokePlaybackSession(current);
      return null;
    });
  };

  const playLocalRecording = async (recordingId: string) => {
    closePlayback();
    setSelectedRecordingId(recordingId);

    try {
      const session = await loadRecordingPlayback(recordingId);
      setPlaybackSession(session);
    } catch (err) {
      console.error('Loading recording playback failed', err);
      setPermissionError('Loading saved recording failed');
    }
  };

  const deleteOrRedlistSelectedRecording = async () => {
    const recordingId = selectedRecordingId;
    if (!recordingId) return;

    try {
      const action = await deleteOrRedlistRecordingInIndexedDb(recordingId);

      if (action === 'deleted') {
        closePlayback();
        setAssociationDraft((current) => current?.recordingId === recordingId ? null : current);
        localRecordingMarkersRef.current = localRecordingMarkersRef.current.filter(
          (marker) => marker.id !== recordingId,
        );
        setRecordingMarkerScreens((current) => current.filter((marker) => marker.id !== recordingId));
      } else if (action === 'redlisted') {
        localRecordingMarkersRef.current = localRecordingMarkersRef.current.map((marker) =>
          marker.id === recordingId ? { ...marker, state: 'redlisted' } : marker,
        );
        // setRecordingMarkerScreens((current) => current.map((marker) =>
        //   marker.id === recordingId ? { ...marker, state: 'redlisted' } : marker,
        // ));
      }

      setSelectedRecordingId(null);
      mapEngine.current?.scene.requestRender();
    } catch (err) {
      console.error('Deleting/redlisting recording failed', err);
      setPermissionError('Recording action failed');
    }
  };

  const addLocalRecordingMarker = (
    id: string,
    position: Cartesian3 | null,
    state: TeleRecordingState = 'localOnly',
  ) => {
    if (!position) return;
    const marker: LocalRecordingMarker = {
      id,
      state,
      position: Cartesian3.clone(position, new Cartesian3()),
      pinId: null,
    };
    localRecordingMarkersRef.current = [
      ...localRecordingMarkersRef.current.filter((existing) => existing.id !== id),
      marker,
    ];
  };

  const appendTelemetryFrame = () => {
    const recording = bufferedRecordingRef.current;
    if (!recording || !recordingActiveRef.current) return;
    recording.telemetryFrames.push(createFrameTelemetrySample());
  };

  const createMediaRecorder = (
    stream: MediaStream,
    mimeType: string,
    videoBitsPerSecond: number,
    onChunk: (blob: Blob) => void,
  ): MediaRecorder => {
    const options: MediaRecorderOptions = {
      videoBitsPerSecond,
      ...(mimeType ? { mimeType } : {}),
    };
    const recorder = new MediaRecorder(stream, options);
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) onChunk(event.data);
    });
    return recorder;
  };

  const stopHardwareCaptureCanvas = () => {
    const video = videoRef.current as (HTMLVideoElement & {
      cancelVideoFrameCallback?: (handle: number) => void;
    }) | null;

    if (video && hardwareFrameCallbackIdRef.current !== null) {
      video.cancelVideoFrameCallback?.(hardwareFrameCallbackIdRef.current);
      hardwareFrameCallbackIdRef.current = null;
    }

    if (hardwareFallbackDrawTimerRef.current !== null) {
      window.clearInterval(hardwareFallbackDrawTimerRef.current);
      hardwareFallbackDrawTimerRef.current = null;
    }

    hardwareCaptureStreamRef.current?.getTracks().forEach((track) => track.stop());
    hardwareCaptureStreamRef.current = null;
  };

  const startHardwareCaptureCanvas = (video: HTMLVideoElement): MediaStream => {
    stopHardwareCaptureCanvas();

    const size = RECORDING_CONFIG.captureSizePx;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    hardwareRecordingCanvasRef.current = canvas;

    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create hardware recording canvas');

    const drawFrame = () => {
      if (!recordingActiveRef.current || video.readyState < 2) return;
      const sourceWidth = video.videoWidth || size;
      const sourceHeight = video.videoHeight || size;
      const side = Math.min(sourceWidth, sourceHeight);
      const sx = (sourceWidth - side) / 2;
      const sy = (sourceHeight - side) / 2;
      context.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    };

    const frameVideo = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number;
    };

    if (typeof frameVideo.requestVideoFrameCallback === 'function') {
      const onVideoFrame: VideoFrameRequestCallback = () => {
        drawFrame();
        if (recordingActiveRef.current) {
          hardwareFrameCallbackIdRef.current = frameVideo.requestVideoFrameCallback?.(onVideoFrame) ?? null;
        }
      };
      hardwareFrameCallbackIdRef.current = frameVideo.requestVideoFrameCallback(onVideoFrame);
    } else {
      hardwareFallbackDrawTimerRef.current = window.setInterval(
        drawFrame,
        1000 / RECORDING_CONFIG.requestedHardwareFps,
      );
    }

    drawFrame();
    const stream = canvas.captureStream(RECORDING_CONFIG.requestedHardwareFps);
    hardwareCaptureStreamRef.current = stream;
    return stream;
  };

  const startRecordingTake = async () => {
    if (!recorderModeRef.current || recordingActiveRef.current) return;

    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
      setPermissionError('This browser does not support 30 FPS canvas video recording');
      return;
    }

    if (!mediaStreamRef.current || !videoRef.current || videoRef.current.readyState < 2) {
      await requestCameraRef.current();
    }

    const video = videoRef.current;
    const spatialCanvas = spatialMapEngine.current?.canvas;

    if (!mediaStreamRef.current || !video || video.readyState < 2 || !spatialCanvas) {
      setPermissionError('Camera or spatial view is not ready for recording');
      return;
    }

    const pose = latestPoseRef.current;
    const portrait = Math.abs(pose?.gamma ?? 0) < 45;
    const id = makeId('recording');
    const mimeType = chooseVideoMimeType();

    rollAxisRef.current = portrait ? 'portrait' : 'landscape';
    rollBaselineRef.current = portrait ? (pose?.gamma ?? 0) : (pose?.beta ?? 0);
    frameIndexRef.current = 0;

    const recording: BufferedRecording = {
      id,
      startedAtUnixMs: Date.now(),
      startedAtPerformanceMs: performance.now(),
      firstPosition: currentPositionRef.current
        ? Cartesian3.clone(currentPositionRef.current, new Cartesian3())
        : null,
      firstGeo: {
        lat: latestGeoRef.current.lat,
        lon: latestGeoRef.current.lon,
        altitude: latestGeoRef.current.altitude,
      },
      telemetryFrames: [],
      hardwareChunks: [],
      spatialChunks: [],
      hardwareMimeType: mimeType || 'video/webm',
      spatialMimeType: mimeType || 'video/webm',
      persistenceReady: false,
    };

    const hardwareStream = startHardwareCaptureCanvas(video);
    const spatialStream = spatialCanvas.captureStream(RECORDING_CONFIG.requestedSpatialFps);
    spatialCaptureStreamRef.current = spatialStream;

    const hardwareRecorder = createMediaRecorder(
      hardwareStream,
      mimeType,
      RECORDING_CONFIG.hardwareVideoBitsPerSecond,
      (blob) => recording.hardwareChunks.push(blob),
    );

    const spatialRecorder = createMediaRecorder(
      spatialStream,
      mimeType,
      RECORDING_CONFIG.spatialVideoBitsPerSecond,
      (blob) => recording.spatialChunks.push(blob),
    );

    recording.hardwareMimeType = hardwareRecorder.mimeType || mimeType || 'video/webm';
    recording.spatialMimeType = spatialRecorder.mimeType || mimeType || 'video/webm';

    bufferedRecordingRef.current = recording;
    hardwareRecorderRef.current = hardwareRecorder;
    spatialRecorderRef.current = spatialRecorder;
    recordingActiveRef.current = true;
    setRecordingActive(true);
    setRecordingPersistenceReady(false);
    setRecordingProgress(0);
    setBeaconScreen(null);
    setAssociationDraft(null);
    recordedBeaconPositionRef.current = null;
    setMonocleOpen(true);

    hardwareRecorder.start(RECORDING_CONFIG.mediaChunkDurationMs);
    spatialRecorder.start(RECORDING_CONFIG.mediaChunkDurationMs);

    appendTelemetryFrame();
    telemetryCaptureTimerRef.current = window.setInterval(
      appendTelemetryFrame,
      1000 / RECORDING_CONFIG.telemetryTargetHz,
    );

    recordingEligibilityTimerRef.current = window.setInterval(() => {
      const activeRecording = bufferedRecordingRef.current;
      if (!activeRecording) return;

      const elapsedMs = performance.now() - activeRecording.startedAtPerformanceMs;
      setRecordingProgress(Math.min(1, elapsedMs / RECORDING_CONFIG.minDurationMs));

      if (!activeRecording.persistenceReady && elapsedMs >= RECORDING_CONFIG.minDurationMs) {
        activeRecording.persistenceReady = true;
        setRecordingPersistenceReady(true);
        void playRecordingChime('ready');
      }

      if (elapsedMs >= RECORDING_CONFIG.maxDurationMs) {
        void stopRecordingTake();
      }
    }, 100);

    pushDebugTelemetry();
  };

  const stopRecordingTake = async () => {
    const recording = bufferedRecordingRef.current;
    if (!recording || !recordingActiveRef.current) return;

    recordingActiveRef.current = false;
    setRecordingActive(false);

    if (telemetryCaptureTimerRef.current !== null) {
      window.clearInterval(telemetryCaptureTimerRef.current);
      telemetryCaptureTimerRef.current = null;
    }

    if (recordingEligibilityTimerRef.current !== null) {
      window.clearInterval(recordingEligibilityTimerRef.current);
      recordingEligibilityTimerRef.current = null;
    }

    appendTelemetryFrame();

    await Promise.all([
      stopMediaRecorder(hardwareRecorderRef.current),
      stopMediaRecorder(spatialRecorderRef.current),
    ]);

    hardwareRecorderRef.current = null;
    spatialRecorderRef.current = null;
    stopHardwareCaptureCanvas();
    spatialCaptureStreamRef.current?.getTracks().forEach((track) => track.stop());
    spatialCaptureStreamRef.current = null;

    const elapsedMs = performance.now() - recording.startedAtPerformanceMs;

    if (elapsedMs < RECORDING_CONFIG.minDurationMs || !recording.persistenceReady) {
      bufferedRecordingRef.current = null;
      setRecordingPersistenceReady(false);
      setRecordingProgress(0);
      pushDebugTelemetry();
      return;
    }

    try {
      await saveBufferedRecordingToIndexedDb(recording);
      addLocalRecordingMarker(recording.id, recording.firstPosition, 'localOnly');
      setRecordingPersistenceReady(false);
      setRecordingProgress(0);
      bufferedRecordingRef.current = null;
      void playRecordingChime('saved');
      pushDebugTelemetry();
      mapEngine.current?.scene.requestRender();
    } catch (err) {
      console.error('Saving recording failed', err);
      setPermissionError('Saving recording failed');
    }
  };

  const toggleLocationLock = () => {
    if (!recorderModeRef.current || !currentPositionRef.current) return;

    const next = !locationLockRef.current;
    locationLockRef.current = next;
    setLocationLock(next);

    if (next) {
      const direction = currentDirectionRef.current;
      const up = currentUpRef.current;
      if (direction && up) {
        updateLocationLockedCameraFromGyro(
          currentPositionRef.current,
          direction,
          up,
          latestTargetRef.current.position,
        );
      } else {
        enableLocationLockCamera();
      }
    } else {
      disableLocationLockCamera();
    }

    pushDebugTelemetry();
  };

  const toggleRecording = () => {
    if (!recorderModeRef.current) return;
    if (recordingActiveRef.current) {
      void stopRecordingTake();
    } else {
      void startRecordingTake();
    }
  };

  const toggleMonocle = () => {
    if (!recorderModeRef.current) return;
    setMonocleOpen((current) => {
      const next = !current;
      if (next) void requestCameraRef.current();
      else if (!recordingActiveRef.current) stopCameraRef.current();
      return next;
    });
  };

  const applyTorch = async () => {
    const track = videoTrackRef.current;
    if (!track || !cameraControls.torchSupported) return;
    const next = !cameraControls.torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] });
      setCameraControls((current) => ({ ...current, torchOn: next }));
    } catch (err) {
      console.error(err);
      setPermissionError('Torch control failed');
    }
  };

  const applyZoom = async (value: number) => {
    const track = videoTrackRef.current;
    if (!track || !cameraControls.zoomSupported) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: value } as unknown as MediaTrackConstraintSet] });
      setCameraControls((current) => ({ ...current, zoomValue: value }));
    } catch (err) {
      console.error(err);
      setPermissionError('Zoom control failed');
    }
  };

  const applyFocusMode = async (mode: string) => {
    const track = videoTrackRef.current;
    if (!track || !cameraControls.focusSupported) return;
    try {
      await track.applyConstraints({ advanced: [{ focusMode: mode } as unknown as MediaTrackConstraintSet] });
      setCameraControls((current) => ({ ...current, focusMode: mode }));
    } catch (err) {
      console.error(err);
      setPermissionError('Focus control failed');
    }
  };

  useEffect(() => {
    const stopCamera = () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      videoTrackRef.current = null;
      setCameraReady(false);
      setCameraControls(DEFAULT_CAMERA_CONTROLS);
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    stopCameraRef.current = stopCamera;

    const startCamera = async () => {
      if (!recorderModeRef.current) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            frameRate: {
              ideal: RECORDING_CONFIG.requestedHardwareFps,
              min: 24,
              max: 60,
            },
          },
        });
        mediaStreamRef.current = stream;
        const track = stream.getVideoTracks()[0] ?? null;
        videoTrackRef.current = track;

        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities() as ExtendedMediaTrackCapabilities;
          const settings = track.getSettings() as ExtendedMediaTrackSettings;
          const zoom = capabilities.zoom;
          const focusModes = capabilities.focusMode ?? [];
          setCameraControls({
            torchSupported: capabilities.torch === true,
            torchOn: false,
            zoomSupported: !!zoom,
            zoomMin: zoom?.min ?? 1,
            zoomMax: zoom?.max ?? 1,
            zoomStep: zoom?.step ?? 0.1,
            zoomValue: settings.zoom ?? zoom?.min ?? 1,
            focusSupported: focusModes.length > 0,
            focusModes,
            focusMode: settings.focusMode ?? focusModes[0] ?? '',
          });
        } else {
          setCameraControls(DEFAULT_CAMERA_CONTROLS);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
        setCameraEverGranted(true);
        setPermissionError(null);
      } catch (err) {
        setCameraReady(false);
        setCameraControls(DEFAULT_CAMERA_CONTROLS);
        setPermissionError('Camera permission failed');
        console.error(err);
      }
    };

    requestCameraRef.current = startCamera;
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (mapEngine.current) return;

    const isRecorder = isLikelyMobileDevice();
    recorderModeRef.current = isRecorder;
    locationLockRef.current = false;
    gateOpenRef.current = isRecorder;
    setRecorderMode(isRecorder);
    setLocationLock(false);
    setGateOpen(isRecorder);
    pushDebugTelemetry();

    debugUpdateTimerRef.current = window.setInterval(pushDebugTelemetry, 1000 / DEBUG_CONFIG.updateHz);

    window.CESIUM_BASE_URL = '/lib/cesium';
    Ion.defaultAccessToken = process.env['NEXT_PUBLIC_CESIUM_TOKEN'] as string;

    const appStartTime = JulianDate.now();
    const realTimeClock = new Clock({
      startTime: JulianDate.clone(appStartTime),
      currentTime: JulianDate.clone(appStartTime),
      clockRange: ClockRange.UNBOUNDED,
      clockStep: ClockStep.SYSTEM_CLOCK_MULTIPLIER,
      multiplier: 1,
      shouldAnimate: true,
    });

    const cesiumWidget = new CesiumWidget(containerRef.current, {
      terrain: Terrain.fromWorldTerrain(),
      scene3DOnly: true,
      useDefaultRenderLoop: true,
      requestRenderMode: false,
      clock: realTimeClock,
      contextOptions: { webgl: { alpha: true, antialias: true, depth: true, preserveDrawingBuffer: true } },
    });

    mapEngine.current = cesiumWidget;

    let spatialWidget: CesiumWidget | null = null;

    if (spatialContainerRef.current) {
      spatialWidget = new CesiumWidget(spatialContainerRef.current, {
        terrain: Terrain.fromWorldTerrain(),
        scene3DOnly: true,
        useDefaultRenderLoop: true,
        requestRenderMode: false,
        clock: realTimeClock,
        contextOptions: { webgl: { alpha: true, antialias: true, depth: true, preserveDrawingBuffer: true } },
      });

      spatialMapEngine.current = spatialWidget;
      spatialWidget.scene.verticalExaggeration = 1.6;
      spatialWidget.scene.globe.enableLighting = true;
      spatialWidget.scene.globe.depthTestAgainstTerrain = true;
      if (spatialWidget.scene.skyBox) spatialWidget.scene.skyBox.show = true;
      if (spatialWidget.scene.sun) spatialWidget.scene.sun.show = true;
      if (spatialWidget.scene.moon) spatialWidget.scene.moon.show = true;
      if (spatialWidget.scene.skyAtmosphere) spatialWidget.scene.skyAtmosphere.show = false;
      spatialWidget.scene.globe.showGroundAtmosphere = false;
      spatialWidget.scene.fog.enabled = false;
    }

    cesiumWidget.scene.verticalExaggeration = 1.6;
    cesiumWidget.camera.setView({
      destination: Cartesian3.fromDegrees(
        CAMERA_CONFIG.startupOrbitLongitudeDegrees,
        CAMERA_CONFIG.startupOrbitLatitudeDegrees,
        CAMERA_CONFIG.startupOrbitHeightMeters,
      ),
    });
    cesiumWidget.scene.globe.enableLighting = true;
    cesiumWidget.scene.globe.depthTestAgainstTerrain = true;
    if (cesiumWidget.scene.skyBox) cesiumWidget.scene.skyBox.show = true;
    if (cesiumWidget.scene.sun) cesiumWidget.scene.sun.show = true;
    if (cesiumWidget.scene.moon) cesiumWidget.scene.moon.show = true;
    updateAtmosphereForCameraHeight();
    setCesiumReady(true);

    void loadLocalRecordingMarkers()
      .then((markers) => {
        localRecordingMarkersRef.current = markers
          .filter((marker) => Number.isFinite(marker.startLatitude) && Number.isFinite(marker.startLongitude))
          .map((marker) => ({
            id: marker.id,
            state: marker.state,
            position: Cartesian3.fromDegrees(
              marker.startLongitude,
              marker.startLatitude,
              marker.startAltitude ?? 0,
            ),
            pinId: marker.pinId,
          }));
        cesiumWidget.scene.requestRender();
      })
      .catch(console.error);

    console.info('[geoball] Cesium attribution is displayed through the custom on-screen badge. Confirm final wording/placement against active Cesium ion and data-provider terms before public launch.');

    let mainOsmBuildings: { style?: Cesium3DTileStyle } | null = null;

    createOsmBuildingsAsync()
      .then((buildings) => {
        if (!buildings) return;
        mainOsmBuildings = buildings;
        buildings.showOutline = false;
        buildings.backFaceCulling = true;
        buildings.style = new Cesium3DTileStyle({ color: 'color("#3A3A3A")', shadows: ShadowMode.ENABLED });
        cesiumWidget.scene.primitives.add(buildings);
      })
      .catch(console.error);

    if (spatialWidget) {
      createOsmBuildingsAsync()
        .then((buildings) => {
          if (!buildings || !spatialWidget) return;
          buildings.showOutline = false;
          buildings.backFaceCulling = true;
          buildings.style = new Cesium3DTileStyle({ color: 'color("#3A3A3A")', shadows: ShadowMode.ENABLED });
          spatialWidget.scene.primitives.add(buildings);
        })
        .catch(console.error);
    }

    const observerModel = cesiumWidget.entities.add({
      show: false,
      position: Cartesian3.ZERO,
      orientation: Quaternion.IDENTITY,
      model: {
        uri: OBSERVER_MODEL_CONFIG.uri,
        scale: OBSERVER_MODEL_CONFIG.scale,
        minimumPixelSize: OBSERVER_MODEL_CONFIG.minimumPixelSize,
        maximumScale: OBSERVER_MODEL_CONFIG.maximumScale,
        shadows: ShadowMode.DISABLED,
        heightReference: 0,
      },
    });
    locationMarkerRefs.current = [observerModel];

    let lastIndoorCheckMs = 0;
    let lastIndoorState: boolean | null = null;

    const setLikelyIndoorState = (insideBuilding: boolean) => {
      likelyIndoorsRef.current = insideBuilding;
      likelyOutdoorsRef.current = !insideBuilding;

      if (lastIndoorState === insideBuilding) return;
      lastIndoorState = insideBuilding;

      if (mainOsmBuildings) {
        mainOsmBuildings.style = new Cesium3DTileStyle({
          color: insideBuilding ? 'color("#3A3A3A", 0.22)' : 'color("#3A3A3A", 1.0)',
          shadows: ShadowMode.ENABLED,
        });
      }

      cesiumWidget.scene.requestRender();
    };

    const updateLikelyIndoorState = (observerPosition: Cartesian3) => {
      const now = performance.now();
      if (now - lastIndoorCheckMs < 750) return;
      lastIndoorCheckMs = now;

      let insideBuilding = false;

      try {
        const cartographic = Cartographic.fromCartesian(observerPosition);
        const sceneWithSampleHeight = cesiumWidget.scene as unknown as {
          sampleHeight?: (
            position: Cartographic,
            objectsToExclude?: unknown[],
            width?: number,
          ) => number | undefined;
        };

        const sampledSceneHeight = sceneWithSampleHeight.sampleHeight?.(
          cartographic,
          [observerModel],
          1,
        );

        if (typeof sampledSceneHeight === 'number' && Number.isFinite(sampledSceneHeight)) {
          insideBuilding = sampledSceneHeight > cartographic.height + 0.75;
        }
      } catch {
        insideBuilding = false;
      }

      setLikelyIndoorState(insideBuilding);
    };

    const userPoint = cesiumWidget.entities.add({
      show: false,
      position: Cartesian3.ZERO,
      point: { pixelSize: 8, color: Color.WHITE.withAlpha(0.95), outlineColor: Color.BLACK.withAlpha(0.65), outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    });

    const groundTargetPoint = cesiumWidget.entities.add({
      show: false,
      position: Cartesian3.ZERO,
      point: { pixelSize: FRUSTUM_CONFIG.targetPixelSize, color: Color.TRANSPARENT, outlineColor: Color.RED, outlineWidth: 4, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    });

    const skyTargetPoint = cesiumWidget.entities.add({
      show: false,
      position: Cartesian3.ZERO,
      point: { pixelSize: FRUSTUM_CONFIG.targetPixelSize, color: Color.TRANSPARENT, outlineColor: Color.CYAN, outlineWidth: 4, disableDepthTestDistance: Number.POSITIVE_INFINITY },
    });

    let frustumPositions: Cartesian3[][] = Array.from(
      { length: 5 },
      () => [Cartesian3.ZERO, Cartesian3.ZERO],
    );

    const normalFrustumEdges = frustumPositions.map((_, index) =>
      cesiumWidget.entities.add({
        show: false,
        polyline: {
          positions: new CallbackProperty(() => frustumPositions[index], false) as never,
          width: FRUSTUM_CONFIG.lineWidth,
          material: Color.WHITE.withAlpha(0.82),
          depthFailMaterial: Color.WHITE.withAlpha(0.95),
          arcType: ArcType.NONE,
          clampToGround: false,
        },
      }),
    );

    const depthFailFrustumEdges = frustumPositions.map((_, index) =>
      cesiumWidget.entities.add({
        show: false,
        polyline: {
          positions: new CallbackProperty(() => frustumPositions[index], false) as never,
          width: FRUSTUM_CONFIG.depthFailLineWidth,
          material: Color.WHITE.withAlpha(0.0),
          depthFailMaterial: Color.WHITE.withAlpha(0.95),
          arcType: ArcType.NONE,
          clampToGround: false,
        },
      }),
    );

    const allFrustumEdges = [...normalFrustumEdges, ...depthFailFrustumEdges];
    frustumEdgesRef.current = allFrustumEdges;

    let geoWatchId: number | null = null;
    let lastFrameUpdateMs = 0;
    let hasAbsoluteCompass = false;

    const getGroundHeight = (longitude: number, latitude: number, altitudeFallback = 0): number => {
      const cartographic = Cartographic.fromDegrees(longitude, latitude);
      return cesiumWidget.scene.globe.getHeight(cartographic) ?? altitudeFallback ?? 0;
    };

    const makeObserverOriginFromGeolocation = (longitude: number, latitude: number, altitudeFallback = 0): Cartesian3 => {
      const groundHeight = getGroundHeight(longitude, latitude, altitudeFallback);
      return Cartesian3.fromDegrees(longitude, latitude, groundHeight + CAMERA_CONFIG.observerHeightMeters);
    };

    const getObserverModelCenter = (observerPupilPosition: Cartesian3, direction?: Cartesian3 | null): Cartesian3 => {
      const offsetMeters = OBSERVER_MODEL_CONFIG.pupilForwardOffsetMeters * OBSERVER_MODEL_CONFIG.scale;

      if (offsetMeters === 0 || !direction || !isFiniteCartesian3(direction)) {
        return observerPupilPosition;
      }

      const lookDirection = Cartesian3.normalize(direction, new Cartesian3());

      return Cartesian3.subtract(
        observerPupilPosition,
        Cartesian3.multiplyByScalar(
          lookDirection,
          offsetMeters,
          new Cartesian3(),
        ),
        new Cartesian3(),
      );
    };

    const updateObserverPosition = (observerPupilPosition: Cartesian3) => {
      // @ts-ignore
      observerModel.position = getObserverModelCenter(observerPupilPosition, currentDirectionRef.current);
      observerModel.show = true;
    };

    const updateObserverOrientation = (observerPosition: Cartesian3, direction: Cartesian3, up: Cartesian3) => {
      const dir = Cartesian3.normalize(direction, new Cartesian3());
      const correctedUp = Cartesian3.normalize(up, new Cartesian3());
      const right = Cartesian3.normalize(Cartesian3.cross(dir, correctedUp, new Cartesian3()), new Cartesian3());
      const trueUp = Cartesian3.normalize(Cartesian3.cross(right, dir, new Cartesian3()), new Cartesian3());
      const rotation = Matrix3.fromColumnMajorArray([
        right.x, right.y, right.z,
        trueUp.x, trueUp.y, trueUp.z,
        dir.x, dir.y, dir.z,
      ]);
      // @ts-ignore
      observerModel.orientation = Quaternion.fromRotationMatrix(rotation, new Quaternion());
      // @ts-ignore
      observerModel.position = getObserverModelCenter(observerPosition, dir);
      observerModel.show = true;
    };

    const getCameraVectors = (alpha: number, beta: number, gamma: number) => {
      const currentPosition = currentPositionRef.current;
      if (!currentPosition) return null;
      const deviceQ = getDeviceCameraQuaternion(alpha, beta, gamma);
      const deviceRot = Matrix3.fromQuaternion(deviceQ, new Matrix3());
      const forwardThree = Matrix3.multiplyByVector(deviceRot, new Cartesian3(0, 0, -1), new Cartesian3());
      const upThree = Matrix3.multiplyByVector(deviceRot, new Cartesian3(0, 1, 0), new Cartesian3());
      const forwardEnu = threeWorldToCesiumEnu(forwardThree);
      const upEnu = threeWorldToCesiumEnu(upThree);
      Cartesian3.normalize(forwardEnu, forwardEnu);
      Cartesian3.normalize(upEnu, upEnu);
      const enuToFixed = Transforms.eastNorthUpToFixedFrame(currentPosition);
      const enuRotation = Matrix4.getRotation(enuToFixed, new Matrix3());
      const direction = Matrix3.multiplyByVector(enuRotation, forwardEnu, new Cartesian3());
      const up = Matrix3.multiplyByVector(enuRotation, upEnu, new Cartesian3());
      Cartesian3.normalize(direction, direction);
      Cartesian3.normalize(up, up);
      return { direction, up };
    };

    const updateDebugFromLatestPose = () => {
      if (!recorderModeRef.current) return;
      const now = performance.now();
      const minFrameMs = 1000 / FRUSTUM_CONFIG.maxUpdateHz;
      if (now - lastFrameUpdateMs < minFrameMs) return;
      lastFrameUpdateMs = now;

      const currentPosition = currentPositionRef.current;
      const pose = latestPoseRef.current;
      if (!currentPosition || !pose) return;
      const vectors = getCameraVectors(pose.alpha, pose.beta, pose.gamma);
      if (!vectors) return;

      currentDirectionRef.current = vectors.direction;
      currentUpRef.current = vectors.up;

      if (monocleOpen || recordingActiveRef.current) {
        updateSpatialPreviewCamera(currentPosition, vectors.direction, vectors.up);
      }

      const aspect =
        cesiumWidget.canvas.clientWidth /
        Math.max(cesiumWidget.canvas.clientHeight, 1);

      frustumPositions = makeRectangularFrustumPositions(
        currentPosition,
        vectors.direction,
        vectors.up,
        aspect,
      );

      // @ts-ignore
      userPoint.position = currentPosition;
      userPoint.show = true;
      allFrustumEdges.forEach((edge) => { edge.show = true; });
      updateObserverOrientation(currentPosition, vectors.direction, vectors.up);

      const normalizedDirection = Cartesian3.normalize(vectors.direction, new Cartesian3());
      const ray = new Ray(currentPosition, normalizedDirection);
      const hit = cesiumWidget.scene.globe.pick(ray, cesiumWidget.scene);
      if (hit) {
        latestTargetRef.current = { kind: 'ground', position: hit };

        // @ts-ignore
        groundTargetPoint.position = hit;
        groundTargetPoint.show = true;
        skyTargetPoint.show = false;
      } else {
        const skyPoint = Cartesian3.add(
          currentPosition,
          Cartesian3.multiplyByScalar(normalizedDirection, FRUSTUM_CONFIG.skyMarkerDistanceMeters, new Cartesian3()),
          new Cartesian3(),
        );
        latestTargetRef.current = { kind: 'sky', position: skyPoint };

        // @ts-ignore
        skyTargetPoint.position = skyPoint;
        skyTargetPoint.show = true;
        groundTargetPoint.show = false;
      }
      if (locationLockRef.current) {
        updateLocationLockedCameraFromGyro(
          currentPosition,
          vectors.direction,
          vectors.up,
          latestTargetRef.current.position,
        );
      }

      updateAtmosphereForCameraHeight();
      cesiumWidget.scene.requestRender();
    };

    const updateStartupOrbit = () => {
      if (!recorderModeRef.current) return;
      if (!gateOpenRef.current) return;
      const now = performance.now();
      if (lastStartupOrbitTimeRef.current === null) {
        lastStartupOrbitTimeRef.current = now;
        return;
      }
      const deltaSeconds = (now - lastStartupOrbitTimeRef.current) / 1000;
      lastStartupOrbitTimeRef.current = now;
      cesiumWidget.camera.rotate(Cartesian3.UNIT_Z, -deltaSeconds * CAMERA_CONFIG.startupOrbitRadiansPerSecond);
      updateAtmosphereForCameraHeight();
      cesiumWidget.scene.requestRender();
    };

    const startGeolocation = () => {
      if (!recorderModeRef.current) {
        setPermissionError('Viewer Mode: geolocation is disabled on desktop/laptop.');
        return;
      }
      if (geoWatchId !== null) return;
      if (!navigator.geolocation) {
        setPermissionError('Geolocation is not available');
        return;
      }
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, altitude, accuracy, altitudeAccuracy, heading, speed } = pos.coords;
          latestGeoRef.current = {
            lat: latitude,
            lon: longitude,
            altitude: altitude ?? null,
            accuracy: accuracy ?? null,
            altitudeAccuracy: altitudeAccuracy ?? null,
            gpsHeading: heading ?? null,
            speed: speed ?? null,
          };
          const currentPosition = makeObserverOriginFromGeolocation(longitude, latitude, altitude ?? 0);
          currentPositionRef.current = currentPosition;
          const firstLocationFix = !hasFlownToObserverRef.current;

          gateOpenRef.current = false;
          lastStartupOrbitTimeRef.current = null;
          setGeoReady(true);
          setGateOpen(false);
          setPermissionError(null);
          updateObserverPosition(currentPosition);

          if (firstLocationFix) {
            hasFlownToObserverRef.current = true;
            locationLockRef.current = false;
            setLocationLock(false);
            flyToObserverTopDown();
          }

          // @ts-ignore
          userPoint.position = currentPosition;
          userPoint.show = true;
          pushDebugTelemetry();
          cesiumWidget.scene.requestRender();
        },
        (err) => {
          const message = err.message || 'Geolocation failed or was blocked by the browser.';
          setPermissionError(`Geolocation failed: ${message}`);
          console.error(err);
        },
        { enableHighAccuracy: true, maximumAge: 250, timeout: 10000 },
      );
    };

    requestGeoRef.current = startGeolocation;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (!recorderModeRef.current) return;
      const compass = getCompassAlpha(event);
      if (compass.absolute) hasAbsoluteCompass = true;
      if (!compass.absolute && hasAbsoluteCompass) return;
      const alpha = compass.alpha;
      const beta = event.beta;
      const gamma = event.gamma;
      if (alpha === null || beta === null || gamma === null) return;
      latestPoseRef.current = { alpha, beta, gamma, compassSource: compass.source, compassAbsolute: compass.absolute };
      setSensorReady(true);
      if (!compass.absolute) setPermissionError('Compass heading is relative, not magnetic north. Motion is working, but heading may be startup-relative.');
      else setPermissionError(null);
      pushDebugTelemetry();
      cesiumWidget.scene.requestRender();
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (!recorderModeRef.current) return;
      latestMotionRef.current = {
        accelerationX: event.acceleration?.x ?? null,
        accelerationY: event.acceleration?.y ?? null,
        accelerationZ: event.acceleration?.z ?? null,
        accelerationGravityX: event.accelerationIncludingGravity?.x ?? null,
        accelerationGravityY: event.accelerationIncludingGravity?.y ?? null,
        accelerationGravityZ: event.accelerationIncludingGravity?.z ?? null,
        rotationAlpha: event.rotationRate?.alpha ?? null,
        rotationBeta: event.rotationRate?.beta ?? null,
        rotationGamma: event.rotationRate?.gamma ?? null,
        motionInterval: event.interval ?? null,
      };
      pushDebugTelemetry();
    };

    if (isRecorder) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
      window.addEventListener('devicemotion', handleMotion, true);
    }

    cesiumWidget.scene.preRender.addEventListener(updateDebugFromLatestPose);
    cesiumWidget.scene.preRender.addEventListener(updateStartupOrbit);

    const requestSensorPermission = async () => {
      if (!recorderModeRef.current) {
        setPermissionError('Viewer Mode: motion sensors are disabled on desktop/laptop.');
        return;
      }
      const orientationEvent = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
      const motionEvent = DeviceMotionEvent as typeof DeviceMotionEvent & { requestPermission?: () => Promise<'granted' | 'denied'> };
      try {
        let orientationGranted = true;
        let motionGranted = true;
        if (typeof orientationEvent.requestPermission === 'function') orientationGranted = (await orientationEvent.requestPermission()) === 'granted';
        if (typeof motionEvent.requestPermission === 'function') motionGranted = (await motionEvent.requestPermission()) === 'granted';
        if (orientationGranted && motionGranted) {
          setSensorReady(true);
          setPermissionError(null);
        } else {
          setSensorReady(false);
          setPermissionError('Motion/orientation permission denied');
        }
      } catch (err) {
        setSensorReady(false);
        setPermissionError('Motion/orientation permission failed');
        console.error(err);
      }
    };

    requestSensorRef.current = () => { void requestSensorPermission(); };

    const updateScreenAnchors = () => {
      if (!recorderModeRef.current) return;
      const currentPosition = currentPositionRef.current;
      if (currentPosition && isFiniteCartesian3(currentPosition)) {
        let windowPosition: Cartesian2 | undefined;
        try {
          windowPosition = SceneTransforms.worldToWindowCoordinates(cesiumWidget.scene, currentPosition, new Cartesian2());
        } catch {
          windowPosition = undefined;
        }
        if (windowPosition && Number.isFinite(windowPosition.x) && Number.isFinite(windowPosition.y)) {
          const buttonCenterX = window.innerWidth / 2;
          const buttonCenterY = 44;
          const dx = windowPosition.x - buttonCenterX;
          const dy = windowPosition.y - buttonCenterY;
          const distanceFromButton = Math.hypot(dx, dy);
          const nextDeg = distanceFromButton < 8
            ? arrowDegRef.current
            : CesiumMath.toDegrees(Math.atan2(dy, dx)) + 90;
          if (Number.isFinite(nextDeg)) {
            arrowDegRef.current = nextDeg;
            setArrowDeg(nextDeg);
          }
        }
      }
      const recordedBeaconPosition = recordedBeaconPositionRef.current;
      if (recordedBeaconPosition && isFiniteCartesian3(recordedBeaconPosition)) {
        try {
          const cameraToPin = Cartesian3.subtract(
            recordedBeaconPosition,
            cesiumWidget.camera.positionWC,
            new Cartesian3(),
          );

          const cameraToPinDirection = Cartesian3.normalize(
            cameraToPin,
            new Cartesian3(),
          );

          const inFrontOfCamera =
            Number.isFinite(cameraToPinDirection.x) &&
            Cartesian3.dot(
              cesiumWidget.camera.directionWC,
              cameraToPinDirection,
            ) > 0;

          const globeOccluder = new EllipsoidalOccluder(
            Ellipsoid.WGS84,
            cesiumWidget.camera.positionWC,
          );

          const visiblePastGlobe = globeOccluder.isPointVisible(
            recordedBeaconPosition,
          );

          const beaconWindow = SceneTransforms.worldToWindowCoordinates(
            cesiumWidget.scene,
            recordedBeaconPosition,
            new Cartesian2(),
          );

          const onscreen = !!beaconWindow &&
            Number.isFinite(beaconWindow.x) &&
            Number.isFinite(beaconWindow.y) &&
            beaconWindow.x >= 0 &&
            beaconWindow.x <= window.innerWidth &&
            beaconWindow.y >= 0 &&
            beaconWindow.y <= window.innerHeight;

          if (inFrontOfCamera && visiblePastGlobe && onscreen && beaconWindow) {
            setBeaconScreen({ x: beaconWindow.x, y: beaconWindow.y });
          } else {
            setBeaconScreen(null);
          }
        } catch {
          setBeaconScreen(null);
        }
      } else {
        setBeaconScreen(null);
      }
    };


    const updateRecordingMarkerScreens = () => {
      const markers = localRecordingMarkersRef.current;
      if (!markers.length) {
        setRecordingMarkerScreens((current) => current.length ? [] : current);
        return;
      }

      const globeOccluder = new EllipsoidalOccluder(
        Ellipsoid.WGS84,
        cesiumWidget.camera.positionWC,
      );

      const nextScreens: RecordingMarkerScreen[] = [];

      for (const marker of markers) {
        if (!isFiniteCartesian3(marker.position)) continue;

        const cameraToMarker = Cartesian3.subtract(
          marker.position,
          cesiumWidget.camera.positionWC,
          new Cartesian3(),
        );

        let inFrontOfCamera = false;

        try {
          const directionToMarker = Cartesian3.normalize(cameraToMarker, new Cartesian3());
          inFrontOfCamera = Cartesian3.dot(cesiumWidget.camera.directionWC, directionToMarker) > 0;
        } catch {
          inFrontOfCamera = false;
        }

        if (!inFrontOfCamera || !globeOccluder.isPointVisible(marker.position)) continue;

        let windowPosition: Cartesian2 | undefined;

        try {
          windowPosition = SceneTransforms.worldToWindowCoordinates(
            cesiumWidget.scene,
            marker.position,
            new Cartesian2(),
          );
        } catch {
          windowPosition = undefined;
        }

        const onscreen = !!windowPosition &&
          Number.isFinite(windowPosition.x) &&
          Number.isFinite(windowPosition.y) &&
          windowPosition.x >= 0 &&
          windowPosition.x <= window.innerWidth &&
          windowPosition.y >= 0 &&
          windowPosition.y <= window.innerHeight;

        if (onscreen && windowPosition) {
          nextScreens.push({
            id: marker.id,
            state: marker.state,
            x: windowPosition.x,
            y: windowPosition.y,
            pinScreen: null,
          });
        }
      }

      setRecordingMarkerScreens(nextScreens);
    };

    const updateSceneVisualMode = () => {
      updateAtmosphereForCameraHeight();
      updateScreenAnchors();
      updateRecordingMarkerScreens();
    };
    cesiumWidget.scene.postRender.addEventListener(updateSceneVisualMode);

    const resizeObserver = new ResizeObserver(() => {
      cesiumWidget.resize();
      cesiumWidget.scene.requestRender();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
      window.removeEventListener('devicemotion', handleMotion, true);
      cesiumWidget.scene.preRender.removeEventListener(updateDebugFromLatestPose);
      cesiumWidget.scene.preRender.removeEventListener(updateStartupOrbit);
      cesiumWidget.scene.postRender.removeEventListener(updateSceneVisualMode);
      if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
      if (debugUpdateTimerRef.current !== null) {
        window.clearInterval(debugUpdateTimerRef.current);
        debugUpdateTimerRef.current = null;
      }

      if (recordingEligibilityTimerRef.current !== null) {
        window.clearInterval(recordingEligibilityTimerRef.current);
        recordingEligibilityTimerRef.current = null;
      }

      if (telemetryCaptureTimerRef.current !== null) {
        window.clearInterval(telemetryCaptureTimerRef.current);
        telemetryCaptureTimerRef.current = null;
      }

      if (hardwareRecorderRef.current?.state !== 'inactive') hardwareRecorderRef.current?.stop();
      if (spatialRecorderRef.current?.state !== 'inactive') spatialRecorderRef.current?.stop();
      spatialCaptureStreamRef.current?.getTracks().forEach((track) => track.stop());
      stopHardwareCaptureCanvas();
      resizeObserver.disconnect();
      frustumEdgesRef.current = [];
      locationMarkerRefs.current = [];
      if (spatialWidget && !spatialWidget.isDestroyed()) {
        spatialWidget.destroy();
      }

      spatialMapEngine.current = null;
      cesiumWidget.destroy();
      mapEngine.current = null;
    };
  }, []);

  const startupOverlayActive = recorderMode && gateOpen && cesiumReady;
  const cameraControlPanelVisible = recorderMode && cameraReady && (cameraControls.torchSupported || cameraControls.zoomSupported || cameraControls.focusSupported);
  const monocleTop = '50%';

  const resetPuck = () => {
    puckDraggedRef.current = false;
    puckDeleteArmedRef.current = false;
    setPuckDeleteArmed(false);
    setPuck({ x: 0, y: 0 });
  };

  const onPuckPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    puckDraggedRef.current = false;
    puckDeleteArmedRef.current = false;
    setPuckDeleteArmed(false);
  };

  const onPuckPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId) && event.buttons !== 1) return;

    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = event.clientX - cx;
    const dy = event.clientY - cy;
    const rawLength = Math.hypot(dx, dy);

    if (rawLength > 6) puckDraggedRef.current = true;

    const max = rect.width * 0.31;
    const len = Math.max(1, rawLength);
    const clamped = Math.min(max, len);
    const x = (dx / len) * clamped;
    const y = (dy / len) * clamped;
    setPuck({ x, y });

    // The X action sits at the top of the Interactron ring. The puck cannot
    // physically center quite that far out, so arm it when the puck overlaps it.
    const deleteTargetY = -(rect.height / 2 - 25);
    const deleteArmed = Boolean(
      selectedRecordingId &&
      !recordingActiveRef.current &&
      Math.hypot(x, y - deleteTargetY) <= 36
    );

    puckDeleteArmedRef.current = deleteArmed;
    setPuckDeleteArmed(deleteArmed);

    const widget = mapEngine.current;
    if (!widget || locationLockRef.current || deleteArmed) return;

    const scale = 0.015;
    widget.camera.moveRight(x * scale);
    widget.camera.moveUp(-y * scale);
    widget.scene.requestRender();
  };

  const onPuckPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const shouldDelete = puckDeleteArmedRef.current;
    const wasDrag = puckDraggedRef.current;
    resetPuck();

    if (shouldDelete) {
      void deleteOrRedlistSelectedRecording();
      return;
    }

    if (!wasDrag) toggleRecording();
  };

  const onPuckPointerCancel = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetPuck();
  };

  return (
    <>
      <div
        id="globe-container"
        ref={containerRef}
        onDoubleClick={toggleMonocle}
        style={{
          width: '100svw',
          height: '100svh',
          visibility: cesiumReady ? 'visible' : 'hidden',
          touchAction: 'manipulation',
          opacity: recordingActive ? 0.08 : 1,
          transition: 'opacity 180ms ease',
        }}
      />

      <style>{`
        #globe-container .cesium-widget-credits,
        #globe-container .cesium-credit-logoContainer,
        #globe-container .cesium-credit-textContainer,
        #globe-container .cesium-credit-expand-link,
        .geoball-spatial-preview .cesium-widget-credits,
        .geoball-spatial-preview .cesium-credit-logoContainer,
        .geoball-spatial-preview .cesium-credit-textContainer,
        .geoball-spatial-preview .cesium-credit-expand-link {
          display: none !important;
        }
      `}</style>

      <div
        ref={spatialContainerRef}
        className="geoball-spatial-preview"
        aria-hidden="true"
        style={{
          position: 'fixed',
          zIndex: 9050,
          left: '50%',
          top: '16px',
          width: '154px',
          height: '154px',
          transform: 'translateX(-50%)',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.88)',
          boxShadow: '0 0 0 4px rgba(0,0,0,0.82), 0 12px 42px rgba(0,0,0,0.52)',
          background: 'black',
          display: monocleOpen && !startupOverlayActive && recorderMode ? 'block' : 'none',
          pointerEvents: 'none',
        }}
      />

      {startupOverlayActive && (
        <div style={{ position: 'fixed', zIndex: 10000, inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', background: 'radial-gradient(circle at center, rgba(102,113,127,0.10), rgba(5,7,10,0.34))' }}>
          {[88, 66, 44, 24].map((size, index) => (
            <div key={size} style={{ position: 'absolute', width: `${size}vmin`, height: `${size}vmin`, borderRadius: '999px', border: `1px solid rgba(255,255,255,${0.18 + index * 0.07})`, boxShadow: index === 0 ? '0 0 80px rgba(255,255,255,0.08), inset 0 0 80px rgba(255,255,255,0.05)' : undefined }} />
          ))}
          <button type="button" aria-label="Request geolocation" onClick={() => requestGeoRef.current()} style={{ position: 'relative', pointerEvents: 'auto', width: '104px', height: '104px', display: 'grid', placeItems: 'center', padding: 0, borderRadius: '999px', border: '2px solid rgba(255,255,255,0.92)', background: '#050507', boxShadow: '0 16px 60px rgba(0,0,0,0.36), 0 0 28px rgba(255,255,255,0.18)', cursor: 'pointer' }}>
            <span style={{ width: '42px', height: '42px', borderRadius: '999px', border: '2px solid white', background: 'white', boxShadow: '0 0 18px rgba(255,255,255,0.5)' }} />
          </button>
          {permissionError && <div style={{ position: 'fixed', left: '50%', bottom: '34px', maxWidth: '80vw', transform: 'translateX(-50%)', padding: '10px 14px', borderRadius: '999px', background: 'rgba(0,0,0,0.62)', color: 'white', fontSize: '12px', textAlign: 'center' }}>{permissionError}</div>}
        </div>
      )}

      {recordingMarkerScreens.map((marker) => {
        const icon = recordingGlyphForState(marker.state);

        return (
          <button
            key={marker.id}
            type="button"
            aria-label="Local recording marker"
            onClick={() => void playLocalRecording(marker.id)}
            onDoubleClick={() => {
              setSelectedRecordingId(marker.id);
              setAssociationDraft((current) => current?.recordingId === marker.id
                ? null
                : { recordingId: marker.id, x: marker.x, y: marker.y });
            }}
            style={{
              position: 'fixed',
              zIndex: 7600,
              left: marker.x,
              top: marker.y,
              width: '32px',
              height: '32px',
              transform: 'translate(-50%, -50%)',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              border: 0,
              background: 'transparent',
              filter: selectedRecordingId === marker.id
                ? 'drop-shadow(0 0 7px rgba(255,255,255,0.95))'
                : undefined,
              cursor: 'pointer',
            }}
          >
            <InlineSvgIcon icon={icon} active />
          </button>
        );
      })}

      {playbackSession && !startupOverlayActive && (
        <div
          style={{
            position: 'fixed',
            zIndex: 9700,
            inset: 0,
            display: locationLock ? 'none' : 'block',
            pointerEvents: 'none',
          }}
        >
          <button
            type="button"
            aria-label="Close recording playback"
            onClick={closePlayback}
            style={{
              position: 'fixed',
              zIndex: 9702,
              right: '18px',
              bottom: '18px',
              width: '44px',
              height: '44px',
              borderRadius: '999px',
              border: '2px solid white',
              background: 'rgba(0,0,0,0.72)',
              color: 'white',
              fontSize: '22px',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            ×
          </button>

          <video
            ref={hardwarePlaybackVideoRef}
            src={playbackSession.hardwareUrl}
            playsInline
            muted
            autoPlay
            loop
            style={{
              position: 'fixed',
              left: '50%',
              top: '22%',
              width: 'min(42vmin, 42svh)',
              height: 'min(42vmin, 42svh)',
              transform: 'translateX(-50%)',
              borderRadius: '999px',
              objectFit: 'cover',
              border: '2px solid white',
              boxShadow: '0 12px 38px rgba(0,0,0,0.58)',
              background: 'black',
              pointerEvents: 'auto',
            }}
          />

          <video
            ref={spatialPlaybackVideoRef}
            src={playbackSession.spatialUrl}
            playsInline
            muted
            autoPlay
            loop
            style={{
              position: 'fixed',
              left: '50%',
              bottom: '22%',
              width: 'min(42vmin, 42svh)',
              height: 'min(42vmin, 42svh)',
              transform: 'translateX(-50%)',
              borderRadius: '999px',
              objectFit: 'cover',
              border: '2px solid white',
              boxShadow: '0 12px 38px rgba(0,0,0,0.58)',
              background: 'black',
              pointerEvents: 'auto',
            }}
          />
        </div>
      )}

      {associationDraft && !startupOverlayActive && (
        <svg
          aria-hidden="true"
          style={{
            position: 'fixed',
            zIndex: 7550,
            inset: 0,
            width: '100svw',
            height: '100svh',
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <line
            x1={associationDraft.x}
            y1={associationDraft.y}
            x2="50%"
            y2="50%"
            stroke="white"
            strokeWidth="2"
            strokeDasharray="7 7"
            opacity="0.86"
          />
          <circle
            cx="50%"
            cy="50%"
            r="13"
            fill="rgba(0,0,0,0.35)"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
      )}


      {monocleOpen && !startupOverlayActive && recorderMode && (
        <div style={{ position: 'fixed', zIndex: 8000, left: '50%', top: monocleTop, width: '64vmin', height: '64vmin', transform: 'translate(-50%, -50%)', borderRadius: '999px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.88)', boxShadow: '0 0 0 4px rgba(0,0,0,0.85), 0 14px 60px rgba(0,0,0,0.55)', background: 'black', pointerEvents: 'none' }}>
          <video ref={videoRef} playsInline muted autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, opacity: 0.72 }}><InlineSvgIcon icon="recordingArea" active /></div>
          {recordingActive && (
            <>
              <div style={{ position: 'absolute', inset: '12%', opacity: 0.95 }}><InlineSvgIcon icon="rollGuide" active rotateDeg={rollAxisRef.current === 'portrait' ? 0 : 90} /></div>
              <div style={{ position: 'absolute', inset: '12%', opacity: 0.95 }}><InlineSvgIcon icon="rollAlign" active rotateDeg={(rollAxisRef.current === 'portrait' ? 0 : 90) + rollDelta} /></div>
            </>
          )}
        </div>
      )}

      {cameraControlPanelVisible && !startupOverlayActive && (
        <div style={{ position: 'fixed', zIndex: 9100, left: '50%', bottom: '86px', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.35)', background: 'rgba(12, 12, 14, 0.78)', color: 'white', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
          {cameraControls.torchSupported && <button type="button" onClick={() => void applyTorch()} style={{ height: '32px', minWidth: '48px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.45)', background: cameraControls.torchOn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.16)', color: cameraControls.torchOn ? 'black' : 'white', fontWeight: 800, cursor: 'pointer' }}>Torch</button>}
          {cameraControls.zoomSupported && <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}>Zoom<input type="range" min={cameraControls.zoomMin} max={cameraControls.zoomMax} step={cameraControls.zoomStep} value={cameraControls.zoomValue} onChange={(event) => void applyZoom(Number(event.currentTarget.value))} style={{ width: '108px' }} /></label>}
          {cameraControls.focusSupported && <select value={cameraControls.focusMode} onChange={(event) => void applyFocusMode(event.currentTarget.value)} style={{ height: '32px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.16)', color: 'white', padding: '0 10px', fontWeight: 700 }}>{cameraControls.focusModes.map((mode) => <option key={mode} value={mode} style={{ color: 'black' }}>{mode}</option>)}</select>}
        </div>
      )}

      {!startupOverlayActive && recorderMode && !monocleOpen && (
        <button
          type="button"
          onClick={() => flyToObserverTopDown()}
          aria-label="Fly camera back to observer"
          style={{
            position: 'fixed',
            zIndex: 9000,
            left: '50%',
            top: '54px',
            width: '72px',
            height: '72px',
            transform: 'translateX(-50%)',
            borderRadius: '999px',
            border: '2px solid rgba(255,255,255,0.75)',
            background: 'rgba(12, 12, 14, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 0,
              height: 0,
              transform: `translate(-50%, -50%) rotate(${arrowDeg}deg)`,
              transformOrigin: '50% 50%',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '-8px',
                top: '-35px',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '19px solid white',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              }}
            />
          </span>
        </button>
      )}

      {!startupOverlayActive && (
        <button
          type="button"
          aria-label="Codex"
          style={{
            position: 'fixed',
            zIndex: 9000,
            left: '8px',
            top: '8px',
            width: '82px',
            height: '82px',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: 0,
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <InlineSvgIcon icon="discBook" active size="82px" />
        </button>
      )}

      {!startupOverlayActive && recorderMode && (
        <div
          style={{
            position: 'fixed',
            zIndex: 9000,
            right: '18px',
            top: '18px',
            width: '72px',
            height: permissionsStackOpen ? '220px' : '72px',
            pointerEvents: 'none',
          }}
        >
          <button
            type="button"
            onClick={() => setPermissionsStackOpen((current) => !current)}
            aria-label="Toggle permissions controls"
            title={permissionError ?? 'Permissions'}
            style={{
              position: 'absolute',
              zIndex: 4,
              right: 0,
              top: 0,
              width: '72px',
              height: '72px',
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              border: 0,
              background: 'transparent',
              filter: permissionError ? 'drop-shadow(0 0 10px rgba(255,0,0,0.85))' : 'drop-shadow(0 8px 18px rgba(0,0,0,0.55))',
              cursor: 'pointer',
              pointerEvents: 'auto',
            }}
          >
            <InlineSvgIcon icon="sensorHead" active={cameraEverGranted} size="72px" />
          </button>

          {[
            { key: 'geo', top: 78, onClick: () => requestGeoRef.current(), label: 'Request geolocation', icon: 'permissionsLocation' as const, active: geoReady },
            { key: 'camera', top: 126, onClick: () => { if (cameraReady) stopCameraRef.current(); else void requestCameraRef.current(); }, label: 'Request camera', icon: 'permissionsCamera' as const, active: cameraReady },
            { key: 'gyro', top: 174, onClick: () => requestSensorRef.current(), label: 'Request motion sensors', icon: 'permissionsGyroscope' as const, active: sensorReady },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              aria-label={item.label}
              style={{
                position: 'absolute',
                right: '11px',
                top: permissionsStackOpen ? `${item.top}px` : '13px',
                width: '50px',
                height: '50px',
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                border: 0,
                background: 'transparent',
                opacity: permissionsStackOpen ? 1 : 0,
                transform: permissionsStackOpen ? 'scale(1)' : 'scale(0.35)',
                transition: 'top 180ms ease, opacity 160ms ease, transform 180ms ease',
                filter: 'drop-shadow(0 7px 14px rgba(0,0,0,0.55))',
                cursor: permissionsStackOpen ? 'pointer' : 'default',
                pointerEvents: permissionsStackOpen ? 'auto' : 'none',
              }}
            >
              <InlineSvgIcon icon={item.icon} active={item.active} size="50px" />
            </button>
          ))}
        </div>
      )}

      {!startupOverlayActive && (
        <button
          type="button"
          onClick={recorderMode ? toggleLocationLock : undefined}
          aria-label={locationLock ? 'Switch to free camera' : 'Switch to focused observer camera'}
          style={{
            position: 'fixed',
            zIndex: 9800,
            left: '18px',
            bottom: '24px',
            width: '62px',
            height: '62px',
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: 0,
            background: 'transparent',
            filter: 'drop-shadow(0 9px 18px rgba(0,0,0,0.65))',
            cursor: recorderMode ? 'pointer' : 'default',
            pointerEvents: 'auto',
          }}
        >
          <InlineSvgIcon icon={locationLock ? 'freeviewMode' : 'focusedMode'} active size="62px" />
        </button>
      )}

      {!startupOverlayActive && recorderMode && (
        <div style={{ position: 'fixed', zIndex: 9000, left: '50%', bottom: '16px', width: '154px', height: '154px', transform: 'translateX(-50%)', display: 'grid', placeItems: 'center', touchAction: 'none' }}>
          <InlineSvgIcon icon="interactronRing" active style={{ position: 'absolute', inset: 0 }} />
          {recordingActive && (
            <svg
              aria-hidden="true"
              viewBox="0 0 154 154"
              style={{
                position: 'absolute',
                inset: 0,
                width: '154px',
                height: '154px',
                overflow: 'visible',
                pointerEvents: 'none',
                transform: 'rotate(-90deg)',
              }}
            >
              <circle
                cx="77"
                cy="77"
                r="73"
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="4"
              />
              <circle
                cx="77"
                cy="77"
                r="73"
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                pathLength="1"
                strokeDasharray="1"
                strokeDashoffset={1 - recordingProgress}
                style={{ transition: 'stroke-dashoffset 90ms linear' }}
              />
            </svg>
          )}
          {selectedRecordingId && !recordingActive && (
            <button
              type="button"
              aria-label="Delete or redlist selected recording"
              onClick={(event) => {
                event.stopPropagation();
                void deleteOrRedlistSelectedRecording();
              }}
              style={{
                position: 'absolute',
                zIndex: 4,
                left: '50%',
                top: '8px',
                width: '34px',
                height: '34px',
                transform: 'translateX(-50%)',
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                border: '2px solid white',
                borderRadius: '999px',
                background: puckDeleteArmed ? 'white' : 'rgba(5,5,8,0.9)',
                color: puckDeleteArmed ? 'black' : 'white',
                boxShadow: puckDeleteArmed
                  ? '0 0 0 5px rgba(255,255,255,0.22), 0 5px 18px rgba(0,0,0,0.65)'
                  : '0 5px 14px rgba(0,0,0,0.55)',
                cursor: 'pointer',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 5L19 19M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <button
            type="button"
            aria-label="Interactron puck"
            onPointerDown={onPuckPointerDown}
            onPointerMove={onPuckPointerMove}
            onPointerUp={onPuckPointerUp}
            onPointerCancel={onPuckPointerCancel}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '78px',
              height: '78px',
              transform: `translate(calc(-50% + ${puck.x}px), calc(-50% + ${puck.y}px))`,
              display: 'grid',
              placeItems: 'center',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: puckDeleteArmed ? 'not-allowed' : 'grab',
              touchAction: 'none',
            }}
          >
            <InlineSvgIcon icon="interactronPuck" active={!recordingActive} size="78px" />
          </button>
        </div>
      )}


      {cesiumReady && (
        <CesiumAttributionBadge
          open={creditPanelOpen}
          onToggle={() => setCreditPanelOpen((current) => !current)}
        />
      )}

      {permissionError && !startupOverlayActive && (
        <div style={{ position: 'fixed', zIndex: 9300, left: '50%', bottom: recorderMode ? '16px' : '18px', maxWidth: '82vw', transform: 'translateX(-50%)', padding: '9px 13px', borderRadius: '999px', background: 'rgba(0,0,0,0.58)', color: 'white', fontSize: '12px', textAlign: 'center', pointerEvents: 'none' }}>
          {permissionError}
        </div>
      )}
    </>
  );
}
