'use client';
import {
  useRef,
  useState,
  useEffect,
  JSX,
} from 'react';
import {
  Ion,
  Terrain,
  ShadowMode,
  CesiumWidget,
  Cesium3DTileStyle,
  createOsmBuildingsAsync,
} from 'cesium';
import 'styles/modules/page.module.css';
import CesiumGlobe from 'res/modules/CesiumGlobe';


export default function World(): JSX.Element {
  return <>
    <CesiumGlobe />
  </>;
}

