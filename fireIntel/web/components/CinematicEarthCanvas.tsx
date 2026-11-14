"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Crosshair,
  FastForward,
} from "lucide-react";

export interface SatelliteInfo {
  id: "terra" | "aqua" | "snpp";
  name: string;
  platform: string;
  instrument: string;
  instrumentFull: string;
  spectralBands: string;
  spatialResolution: string;
  swathWidthKm: number;
  altitudeKm: number;
  inclinationDeg: number;
  overpassWindow: string;
  firmsContribution: string;
  colorHex: string;
}

export const SATELLITE_CATALOG: Record<string, SatelliteInfo> = {
  terra: {
    id: "terra",
    name: "Terra",
    platform: "NASA EOS AM-1",
    instrument: "MODIS",
    instrumentFull: "Moderate Resolution Imaging Spectroradiometer",
    spectralBands: "36 spectral bands (3.96 µm Mid-IR & 11.0 µm Thermal-IR)",
    spatialResolution: "1,000 m (1 km) nadir footprint",
    swathWidthKm: 2330,
    altitudeKm: 705,
    inclinationDeg: 98.2,
    overpassWindow: "Descending node ~10:30 AM local solar time",
    firmsContribution: "918 dual-platform MODIS observations in 2025 Uttarakhand baseline",
    colorHex: "#38bdf8",
  },
  aqua: {
    id: "aqua",
    name: "Aqua",
    platform: "NASA EOS PM-1",
    instrument: "MODIS",
    instrumentFull: "Moderate Resolution Imaging Spectroradiometer",
    spectralBands: "36 spectral bands (cross-calibrated with Terra AM)",
    spatialResolution: "1,000 m (1 km) nadir footprint",
    swathWidthKm: 2330,
    altitudeKm: 705,
    inclinationDeg: 98.2,
    overpassWindow: "Ascending node ~1:30 PM local solar time (afternoon fire peak)",
    firmsContribution: "Captures peak diurnal fire radiative power across Himalayan pine belt",
    colorHex: "#fbbf24",
  },
  snpp: {
    id: "snpp",
    name: "Suomi-NPP",
    platform: "NASA / NOAA JPSS Precursor",
    instrument: "VIIRS",
    instrumentFull: "Visible Infrared Imaging Radiometer Suite",
    spectralBands: "375 m I-Bands (I4: 3.74 µm & I5: 11.45 µm) + 750 m M-Bands",
    spatialResolution: "375 m nadir resolution (7.21× observation density vs MODIS)",
    swathWidthKm: 3060,
    altitudeKm: 824,
    inclinationDeg: 98.7,
    overpassWindow: "Ascending node ~1:30 PM local solar time",
    firmsContribution: "6,623 high-resolution thermal detections in 2025 Uttarakhand baseline",
    colorHex: "#34d399",
  },
};

interface CinematicEarthCanvasProps {
  isDescending: boolean;
  onDescendComplete: () => void;
  onTargetSelect?: () => void;
  onSatelliteSelect?: (sat: SatelliteInfo) => void;
  descentStage?: number; // 1 to 7
  onStageChange?: (stage: number) => void;
  onSkipDescent?: () => void;
  isTerrainActive?: boolean;
}

// Statically allocated vectors to prevent GC allocations inside the 60 Hz animation loop
const _vPos1 = new THREE.Vector3();
const _vPos2 = new THREE.Vector3();
const _vPos3 = new THREE.Vector3();
const _vProj = new THREE.Vector3();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _yAxis = new THREE.Vector3(0, 1, 0);

export default function CinematicEarthCanvas({
  isDescending,
  onDescendComplete,
  onTargetSelect,
  onSatelliteSelect,
  descentStage = 1,
  onStageChange,
  onSkipDescent,
  isTerrainActive = false,
}: CinematicEarthCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const earthGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsRef = useRef<THREE.Mesh | null>(null);
  const boundaryLineRef = useRef<THREE.LineLoop | null>(null);
  const beaconRef = useRef<THREE.Mesh | null>(null);
  const beaconRingRef = useRef<THREE.Mesh | null>(null);
  const beaconHitRef = useRef<THREE.Mesh | null>(null);

  // Stable mutable ref mirrors for props to prevent re-running the WebGL setup effect
  const isDescendingRef = useRef(isDescending);
  const onDescendCompleteRef = useRef(onDescendComplete);
  const onTargetSelectRef = useRef(onTargetSelect);
  const onSatelliteSelectRef = useRef(onSatelliteSelect);
  const onStageChangeRef = useRef(onStageChange);
  const onSkipDescentRef = useRef(onSkipDescent);
  const isTerrainActiveRef = useRef(isTerrainActive);

  const startDistanceRef = useRef(5.2);
  const startRotationRef = useRef({ x: 0.35, y: -1.8 });

  useEffect(() => {
    if (isDescending && !isDescendingRef.current) {
      descentStartTimeRef.current = null;
    }
    isDescendingRef.current = isDescending;
  }, [isDescending]);

  useEffect(() => {
    onDescendCompleteRef.current = onDescendComplete;
  }, [onDescendComplete]);

  useEffect(() => {
    onTargetSelectRef.current = onTargetSelect;
  }, [onTargetSelect]);

  useEffect(() => {
    onSatelliteSelectRef.current = onSatelliteSelect;
  }, [onSatelliteSelect]);

  useEffect(() => {
    onStageChangeRef.current = onStageChange;
  }, [onStageChange]);

  useEffect(() => {
    onSkipDescentRef.current = onSkipDescent;
  }, [onSkipDescent]);

  useEffect(() => {
    isTerrainActiveRef.current = isTerrainActive;
  }, [isTerrainActive]);

  // Satellite DOM label refs for direct transform updates (zero React re-renders in render loop!)
  const terraLabelRef = useRef<HTMLDivElement>(null);
  const aquaLabelRef = useRef<HTMLDivElement>(null);
  const snppLabelRef = useRef<HTMLDivElement>(null);

  // Satellite 3D Objects & Tracking
  const satellitesRef = useRef<{
    terra: { group: THREE.Group; hitProxy: THREE.Mesh; scanCone: THREE.Mesh };
    aqua: { group: THREE.Group; hitProxy: THREE.Mesh; scanCone: THREE.Mesh };
    snpp: { group: THREE.Group; hitProxy: THREE.Mesh; scanCone: THREE.Mesh };
  } | null>(null);

  const [hoveredSatellite, setHoveredSatellite] = useState<string | null>(null);
  const hoveredSatelliteRef = useRef<string | null>(null);
  useEffect(() => {
    hoveredSatelliteRef.current = hoveredSatellite;
  }, [hoveredSatellite]);

  // Live Geodetic Coordinate Tracking HUD ref & state
  const coordHudRef = useRef<HTMLDivElement>(null);
  const [cursorCoordinates, setCursorCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  // References to dynamic 3D layers
  const firesPointsRef = useRef<THREE.Points | null>(null);
  const graticuleLinesRef = useRef<THREE.LineBasicMaterial[]>([]);

  const animFrameRef = useRef<number | null>(null);

  // Camera distance / zoom state (initial orbital distance = 5.2, range [2.4, 8.5])
  const currentDistanceRef = useRef(5.2);
  const targetDistanceRef = useRef(5.2);

  // Rotation & Inertia State
  const targetRotationRef = useRef({ x: 0.35, y: -1.8 }); // Centered toward Indian Ocean / Himalayas
  const inertiaVelRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const lastPointerPosRef = useRef({ x: 0, y: 0 });
  const pointerVelRef = useRef({ x: 0, y: 0 });
  const lastPointerTimeRef = useRef(0);

  // Pinch zoom state
  const pinchDistRef = useRef(0);
  const pinchStartDistanceRef = useRef(5.2);

  // Interaction mode & auto-rotation
  const [autoRotate, setAutoRotate] = useState(true);
  const autoRotateRef = useRef(true);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  // Target lock / hover state
  const [isBeaconHovered, setIsBeaconHovered] = useState(false);
  const [isTargetLocked, setIsTargetLocked] = useState(false);
  const [fps, setFps] = useState<number>(60);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());

  // Delta-time based descent animation state
  const descentStartTimeRef = useRef<number | null>(null);
  const currentStageRef = useRef(1);
  const DESCENT_DURATION_MS = 2200; // Accelerated crisp physical descent (~2.2s, 42% faster)

  // Uttarakhand geodetic coordinates: 30.1542° N, 79.2519° E
  const latDeg = 30.1542;
  const lonDeg = 79.2519;
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const earthRadius = 1.85;

  // Function to smoothly orient camera and focus on Uttarakhand
  const focusUttarakhand = useCallback(() => {
    setIsTargetLocked(true);
    targetDistanceRef.current = 3.25;
    targetRotationRef.current = {
      x: latRad - 0.22,
      y: -lonRad - Math.PI / 2 + 0.15,
    };
    inertiaVelRef.current = { x: 0, y: 0 };
    if (onTargetSelect) onTargetSelect();
  }, [latRad, lonRad, onTargetSelect]);

  // Function to smoothly orient camera toward Indian Subcontinent
  const focusIndia = useCallback(() => {
    setIsTargetLocked(false);
    targetDistanceRef.current = 3.9;
    targetRotationRef.current = { x: 0.35, y: -2.05 };
    inertiaVelRef.current = { x: 0, y: 0 };
  }, []);

  // Function to orient camera toward night-side urban illumination
  const focusNight = useCallback(() => {
    setIsTargetLocked(false);
    targetDistanceRef.current = 4.6;
    targetRotationRef.current = { x: 0.15, y: 1.15 };
    inertiaVelRef.current = { x: 0, y: 0 };
  }, []);

  // Function to reset camera view to default orbital framing
  const resetView = useCallback(() => {
    setIsTargetLocked(false);
    targetDistanceRef.current = 5.2;
    targetRotationRef.current = { x: 0.35, y: -1.8 };
    inertiaVelRef.current = { x: 0, y: 0 };
  }, []);

  const handleZoomIn = () => {
    targetDistanceRef.current = Math.max(2.4, targetDistanceRef.current - 0.7);
  };
  const handleZoomOut = () => {
    targetDistanceRef.current = Math.min(8.5, targetDistanceRef.current + 0.7);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene & Perspective Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000);
    camera.position.set(0, currentDistanceRef.current * 0.08, currentDistanceRef.current);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 2. High-Performance WebGL Renderer (Cap pixel ratio to 1.5 to guarantee high fill rate and 60 FPS)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0); // fully transparent background - space environment shows through
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const dom = renderer.domElement;
    dom.style.touchAction = "none";

    // 3. Deep Space Starfield removed - handled by dedicated SpaceEnvironmentBackground component
    // which renders at z-0 behind this Earth canvas (z-10), eliminating double-rendering.

    // 4. Earth Planetary Group (Handles 23.44° Axial Obliquity)
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = (23.44 * Math.PI) / 180;
    earthGroup.rotation.x = targetRotationRef.current.x;
    earthGroup.rotation.y = targetRotationRef.current.y;
    earthGroupRef.current = earthGroup;
    scene.add(earthGroup);

    // 5. Texture Asset Loading with Maximum Anisotropic Filtering
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textureLoader = new THREE.TextureLoader();

    const loadTextureWithAniso = (path: string, srgb = true) => {
      const tex = textureLoader.load(path);
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = maxAniso;
      if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    const dayTexture = loadTextureWithAniso("/textures/earth/earth_day_2048.jpg", true);
    const nightTexture = loadTextureWithAniso("/textures/earth/earth_lights_2048.png", true);
    const normalTexture = loadTextureWithAniso("/textures/earth/earth_normal_2048.jpg", false);
    const specularTexture = loadTextureWithAniso("/textures/earth/earth_specular_2048.jpg", false);
    const cloudsTexture = loadTextureWithAniso("/textures/earth/earth_clouds_1024.png", true);

    // 6. Natural Directional Sunlight
    const sunWorldDir = new THREE.Vector3(4.5, 1.2, 3.2).normalize();

    // 7. Photorealistic Earth Surface Shader with Topographic Relief, Cloud Shadows & Ocean Glint
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        normalMap: { value: normalTexture },
        specularMap: { value: specularTexture },
        cloudTexture: { value: cloudsTexture },
        sunDirection: { value: sunWorldDir },
        uThermalMode: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewDirection;

        void main() {
          vUv = uv;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vViewDirection = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform sampler2D normalMap;
        uniform sampler2D specularMap;
        uniform sampler2D cloudTexture;
        uniform vec3 sunDirection;
        uniform float uThermalMode;

        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewDirection;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 L = normalize(sunDirection);
          vec3 V = normalize(vViewDirection);

          // Topographic Normal Perturbation for Mountain Relief (Himalayas, etc.)
          vec3 normSample = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          vec3 perturbedN = normalize(N + normSample * 0.38);

          float NdotL = dot(perturbedN, L);

          // Smooth twilight terminator transition
          float dayFactor = smoothstep(-0.16, 0.24, NdotL);

          // Cloud Shadow projection onto surface
          vec2 shadowOffset = -L.xy * 0.0035;
          float cloudDensity = texture2D(cloudTexture, vUv + shadowOffset).r;
          float cloudShadow = 1.0 - cloudDensity * 0.52 * dayFactor;

          // Daylit albedo & illumination with photorealistic contrast
          vec3 dayColor = texture2D(dayTexture, vUv).rgb;
          float diffuse = max(0.0, NdotL);
          vec3 dayLit = pow(dayColor, vec3(0.96)) * (diffuse * 1.22 + 0.045) * cloudShadow;

          // Night city lights (warm amber/gold cluster glow, dark high mountain regions)
          vec3 nightSample = texture2D(nightTexture, vUv).rgb;
          vec3 nightLights = pow(nightSample, vec3(1.18)) * vec3(1.5, 1.25, 0.78) * 2.2;
          vec3 nightLit = nightLights * (1.0 - dayFactor);

          // Ocean Specular Glint (Broad sheen + tight solar gleam with Schlick Fresnel)
          float specMask = texture2D(specularMap, vUv).r;
          vec3 H = normalize(L + V);
          float NdotH = max(0.0, dot(perturbedN, H));
          float broadSheen = pow(NdotH, 16.0) * 0.42;
          float tightGlint = pow(NdotH, 88.0) * 2.2;
          float fresnelOcean = 0.02 + 0.98 * pow(1.0 - max(0.0, dot(V, perturbedN)), 5.0);
          vec3 oceanSpecular = vec3(1.0, 0.97, 0.90) * (broadSheen + tightGlint) * specMask * dayFactor * (0.6 + fresnelOcean * 0.4);

          // Surface Atmospheric Horizon Haze
          float horizonFresnel = pow(1.0 - max(0.0, dot(N, V)), 3.4);
          vec3 horizonHaze = vec3(0.14, 0.58, 1.0) * horizonFresnel * (max(0.0, NdotL + 0.15) * 0.75);

          vec3 standardColor = mix(nightLit, dayLit, dayFactor) + oceanSpecular + horizonHaze;

          // Multispectral Thermal Infrared Matrix Mode (NASA FIRMS Style)
          vec3 thermalLand = mix(vec3(0.012, 0.045, 0.10), vec3(0.06, 0.20, 0.45), diffuse) * (1.0 - specMask);
          vec3 thermalOcean = vec3(0.008, 0.02, 0.06) + vec3(0.02, 0.08, 0.20) * specMask;
          vec3 thermalHaze = vec3(0.08, 0.38, 0.85) * horizonFresnel * 0.9;
          vec3 thermalColor = thermalLand + thermalOcean + thermalHaze;

          vec3 finalColor = mix(standardColor, thermalColor, uThermalMode);

          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthShaderMat);
    earthMeshRef.current = earthMesh;
    earthGroup.add(earthMesh);

    // 8. Light-Aware Concentric Cloud Layer (Radius: 1.8685)
    const cloudGeo = new THREE.SphereGeometry(earthRadius * 1.010, 64, 64);
    const cloudShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        cloudTexture: { value: cloudsTexture },
        sunDirection: { value: sunWorldDir },
        uThermalMode: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        void main() {
          vUv = uv;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D cloudTexture;
        uniform vec3 sunDirection;
        uniform float uThermalMode;
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 L = normalize(sunDirection);
          float NdotL = dot(N, L);
          float dayFactor = smoothstep(-0.20, 0.26, NdotL);

          float cloudDensity = texture2D(cloudTexture, vUv).r;
          
          vec3 dayCloud = vec3(0.96, 0.98, 1.0);
          vec3 twilightCloud = vec3(1.0, 0.72, 0.50);
          float twilightFactor = smoothstep(-0.25, 0.02, NdotL) * (1.0 - smoothstep(0.02, 0.28, NdotL));
          
          vec3 cloudColor = mix(vec3(0.015, 0.025, 0.04), dayCloud, dayFactor) + twilightCloud * twilightFactor * 0.45;
          float alpha = cloudDensity * (0.08 + 0.64 * dayFactor) * (1.0 - uThermalMode * 0.65);

          gl_FragColor = vec4(cloudColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudShaderMat);
    cloudsRef.current = cloudMesh;
    earthGroup.add(cloudMesh);

    // 9. Natural Rayleigh & Forward Mie Atmospheric Scattering Envelope (Radius: 1.8907 = 1.022 R)
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.022, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: sunWorldDir },
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewDirection;

        void main() {
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vViewDirection = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;

        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        varying vec3 vViewDirection;

        void main() {
          vec3 N = normalize(vWorldNormal);
          vec3 L = normalize(sunDirection);
          vec3 V = normalize(vViewDirection);

          float rim = 1.0 - clamp(dot(V, N), 0.0, 1.0);
          float intensity = pow(rim, 3.2);

          float sunDot = dot(N, L);
          float dayFactor = smoothstep(-0.22, 0.35, sunDot);
          float twilight = smoothstep(-0.28, 0.02, sunDot) * (1.0 - smoothstep(0.02, 0.35, sunDot));

          vec3 rayleighColor = vec3(0.12, 0.58, 1.0);
          float forwardMie = pow(max(0.0, dot(V, -L)), 6.0) * rim;
          vec3 mieColor = vec3(1.0, 0.96, 0.88);
          vec3 twilightColor = vec3(1.0, 0.62, 0.28);

          vec3 atmColor = mix(rayleighColor, mieColor, forwardMie * 0.48) + twilightColor * (twilight * 0.72);
          float alpha = intensity * (dayFactor * 0.94 + twilight * 0.48);

          gl_FragColor = vec4(atmColor * alpha, alpha);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 10. 3D Uttarakhand Geographic Boundary Filament
    fetch("/data/uttarakhand_boundary_3d.json")
      .then((res) => res.json())
      .then((data) => {
        if (!data.coordinates || !earthGroupRef.current) return;
        const pts: THREE.Vector3[] = [];
        const bRadius = earthRadius * 1.003;
        for (const [lon, lat] of data.coordinates) {
          const p = (90 - lat) * (Math.PI / 180);
          const t = (lon + 180) * (Math.PI / 180);
          pts.push(
            new THREE.Vector3(
              -bRadius * Math.sin(p) * Math.cos(t),
              bRadius * Math.cos(p),
              bRadius * Math.sin(p) * Math.sin(t)
            )
          );
        }
        const bGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const bMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.4,
          linewidth: 1.5,
        });
        const bLine = new THREE.LineLoop(bGeo, bMat);
        boundaryLineRef.current = bLine;
        earthGroupRef.current.add(bLine);
      })
      .catch((err) => console.warn("Could not load 3D boundary:", err));

    // 11. Uttarakhand Geodetic Target Marker (30.1542° N, 79.2519° E)
    const phi = (90 - latDeg) * (Math.PI / 180);
    const theta = (lonDeg + 180) * (Math.PI / 180);

    const bx = -earthRadius * Math.sin(phi) * Math.cos(theta);
    const by = earthRadius * Math.cos(phi);
    const bz = earthRadius * Math.sin(phi) * Math.sin(theta);

    const beaconGeo = new THREE.SphereGeometry(0.026, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(bx, by, bz);
    beaconRef.current = beacon;
    earthGroup.add(beacon);

    const ringGeo = new THREE.RingGeometry(0.038, 0.054, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(bx * 1.01, by * 1.01, bz * 1.01);
    ringMesh.lookAt(bx * 2, by * 2, bz * 2);
    beaconRingRef.current = ringMesh;
    earthGroup.add(ringMesh);

    const beaconHitGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const beaconHitMat = new THREE.MeshBasicMaterial({ visible: false });
    const beaconHit = new THREE.Mesh(beaconHitGeo, beaconHitMat);
    beaconHit.position.set(bx, by, bz);
    beaconHitRef.current = beaconHit;
    earthGroup.add(beaconHit);

    // 11b. 7,541 High-Resolution Satellite Fire Observations (MODIS + VIIRS)
    fetch("/data/sample_fires_for_web.json")
      .then((res) => res.json())
      .then((data) => {
        const features = data.features || (Array.isArray(data) ? data : []);
        if (!features.length || !earthGroupRef.current) return;

        const count = features.length;
        const positions = new Float32Array(count * 3);
        const frpAttr = new Float32Array(count);
        const fRad = earthRadius * 1.004;

        for (let i = 0; i < count; i++) {
          const item = features[i];
          const coords = item.geometry ? item.geometry.coordinates : [item.longitude, item.latitude];
          const lon = coords[0];
          const lat = coords[1];
          const frp = (item.properties && item.properties.frp) ?? item.frp ?? 12.0;

          const p = (90 - lat) * (Math.PI / 180);
          const t = (lon + 180) * (Math.PI / 180);

          positions[i * 3] = -fRad * Math.sin(p) * Math.cos(t);
          positions[i * 3 + 1] = fRad * Math.cos(p);
          positions[i * 3 + 2] = fRad * Math.sin(p) * Math.sin(t);
          frpAttr[i] = Math.min(180.0, frp);
        }

        const fireGeo = new THREE.BufferGeometry();
        fireGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        fireGeo.setAttribute("aFrp", new THREE.BufferAttribute(frpAttr, 1));

        const fireMat = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uThermalMode: { value: 0 },
            uCameraDistance: { value: 5.2 },
          },
          vertexShader: `
            attribute float aFrp;
            uniform float uTime;
            uniform float uThermalMode;
            uniform float uCameraDistance;
            varying float vFrp;
            varying float vPulse;

            void main() {
              vFrp = aFrp;
              float pulse = 0.85 + 0.15 * sin(uTime * 3.2 + aFrp * 0.2);
              vPulse = pulse;
              vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
              // Scale size with camera distance and only appear when uThermalMode > 0
              float zoomScale = clamp((6.0 - uCameraDistance) / 3.5, 0.4, 1.5);
              float size = (1.5 + min(aFrp * 0.015, 1.5)) * zoomScale * uThermalMode;
              gl_PointSize = max(0.0, size * pulse * (120.0 / -mvPos.z));
              gl_Position = projectionMatrix * mvPos;
            }
          `,
          fragmentShader: `
            uniform float uThermalMode;
            uniform float uCameraDistance;
            varying float vFrp;
            varying float vPulse;

            void main() {
              if (uThermalMode <= 0.001) discard;

              vec2 coord = gl_PointCoord - vec2(0.5);
              float d = length(coord);
              if (d > 0.5) discard;

              float core = 1.0 - smoothstep(0.0, 0.25, d);
              float halo = 1.0 - smoothstep(0.25, 0.5, d);

              vec3 emberCol = mix(vec3(1.0, 0.40, 0.10), vec3(1.0, 0.85, 0.35), clamp(vFrp / 60.0, 0.0, 1.0));
              vec3 col = mix(emberCol, vec3(1.0, 1.0, 0.95), core);

              // Scale alpha with camera zoom so global view remains disciplined and close-up reveals intricate thermal details
              float zoomAlpha = clamp((6.0 - uCameraDistance) / 3.5, 0.04, 0.50);
              float alpha = (core * 0.45 + halo * 0.15) * vPulse * uThermalMode * zoomAlpha * 0.08;
              gl_FragColor = vec4(col, alpha);
            }
          `,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });

        const firePoints = new THREE.Points(fireGeo, fireMat);
        firesPointsRef.current = firePoints;
        earthGroupRef.current.add(firePoints);
      })
      .catch((err) => console.warn("Could not load sample fires for 3D Earth:", err));

    // 11c. Holographic WGS-84 Coordinate Graticule (Parallels & Meridians)
    const graticuleGroup = new THREE.Group();
    const graticuleMats: THREE.LineBasicMaterial[] = [];
    const gRadius = earthRadius * 1.0025;

    for (let lat = -75; lat <= 75; lat += 15) {
      const pPts = [];
      const pPhi = (90 - lat) * (Math.PI / 180);
      const pRad = gRadius * Math.sin(pPhi);
      const pY = gRadius * Math.cos(pPhi);
      const isEquator = lat === 0;

      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pPts.push(new THREE.Vector3(pRad * Math.cos(a), pY, pRad * Math.sin(a)));
      }
      const pGeo = new THREE.BufferGeometry().setFromPoints(pPts);
      const pMat = new THREE.LineBasicMaterial({
        color: isEquator ? 0x22d3ee : 0x0284c7,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      graticuleMats.push(pMat);
      graticuleGroup.add(new THREE.Line(pGeo, pMat));
    }

    for (let lon = 0; lon < 360; lon += 30) {
      const mPts = [];
      const mTheta = (lon * Math.PI) / 180;
      for (let i = 0; i <= 64; i++) {
        const lat = -90 + (i / 64) * 180;
        const pPhi = (90 - lat) * (Math.PI / 180);
        mPts.push(
          new THREE.Vector3(
            -gRadius * Math.sin(pPhi) * Math.cos(mTheta),
            gRadius * Math.cos(pPhi),
            gRadius * Math.sin(pPhi) * Math.sin(mTheta)
          )
        );
      }
      const mGeo = new THREE.BufferGeometry().setFromPoints(mPts);
      const mMat = new THREE.LineBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
      });
      graticuleMats.push(mMat);
      graticuleGroup.add(new THREE.Line(mGeo, mMat));
    }
    earthGroup.add(graticuleGroup);
    graticuleLinesRef.current = graticuleMats;

    // 12. 3D SATELLITE CONSTELLATION WITH NADIR SENSOR SCAN FOOTPRINTS
    function buildSpacecraft(colorHex: number, isDualWing = true): { group: THREE.Group; scanCone: THREE.Mesh } {
      const satGroup = new THREE.Group();

      const busGeo = new THREE.BoxGeometry(0.05, 0.036, 0.032);
      const busMat = new THREE.MeshStandardMaterial({
        color: colorHex === 0xfbbf24 ? 0xd4af37 : 0xb0c4de,
        roughness: 0.35,
        metalness: 0.85,
      });
      const bus = new THREE.Mesh(busGeo, busMat);
      satGroup.add(bus);

      const wingMat = new THREE.MeshStandardMaterial({
        color: 0x14203a,
        roughness: 0.2,
        metalness: 0.75,
      });
      const wingGeo = new THREE.BoxGeometry(0.12, 0.032, 0.003);

      if (isDualWing) {
        const wingLeft = new THREE.Mesh(wingGeo, wingMat);
        wingLeft.position.set(-0.09, 0, 0);
        satGroup.add(wingLeft);

        const wingRight = new THREE.Mesh(wingGeo, wingMat);
        wingRight.position.set(0.09, 0, 0);
        satGroup.add(wingRight);
      } else {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.034, 0.003), wingMat);
        wing.position.set(0.11, 0, 0);
        satGroup.add(wing);
      }

      const sensorGeo = new THREE.CylinderGeometry(0.012, 0.014, 0.022, 16);
      const sensorMat = new THREE.MeshBasicMaterial({ color: 0x111827 });
      const sensor = new THREE.Mesh(sensorGeo, sensorMat);
      sensor.rotation.x = Math.PI / 2;
      sensor.position.set(0, -0.02, 0);
      satGroup.add(sensor);

      const beaconOrbGeo = new THREE.SphereGeometry(0.014, 12, 12);
      const beaconOrbMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const beaconOrb = new THREE.Mesh(beaconOrbGeo, beaconOrbMat);
      beaconOrb.position.set(0, 0.022, 0);
      satGroup.add(beaconOrb);

      // Fine Nadir Sensor Scan Indicator Beam (Semi-transparent sensor cone to Earth)
      const coneHeight = 0.35;
      const coneGeo = new THREE.ConeGeometry(0.09, coneHeight, 16, 1, true);
      const coneMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const scanCone = new THREE.Mesh(coneGeo, coneMat);
      scanCone.position.set(0, -coneHeight / 2 - 0.02, 0);
      satGroup.add(scanCone);

      satGroup.scale.set(1.4, 1.4, 1.4);
      return { group: satGroup, scanCone };
    }

    function buildOrbitalTrack(radius: number, inclinationDeg: number, raanDeg: number, color: number) {
      const points = [];
      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        points.push(new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
      });
      const orbit = new THREE.Line(geo, mat);
      orbit.rotation.x = (inclinationDeg * Math.PI) / 180;
      orbit.rotation.y = (raanDeg * Math.PI) / 180;
      return orbit;
    }

    // 1. Terra Spacecraft (MODIS AM, ~705 km)
    const terraRadius = earthRadius * 1.26;
    const terraOrbit = buildOrbitalTrack(terraRadius, 98.2, 25, 0x38bdf8);
    scene.add(terraOrbit);

    const terra = buildSpacecraft(0x38bdf8, false);
    const terraHitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    terra.group.add(terraHitProxy);
    scene.add(terra.group);

    // 2. Aqua Spacecraft (MODIS PM, ~705 km)
    const aquaRadius = earthRadius * 1.32;
    const aquaOrbit = buildOrbitalTrack(aquaRadius, 98.2, 115, 0xfbbf24);
    scene.add(aquaOrbit);

    const aqua = buildSpacecraft(0xfbbf24, true);
    const aquaHitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    aqua.group.add(aquaHitProxy);
    scene.add(aqua.group);

    // 3. Suomi-NPP Spacecraft (VIIRS PM, ~824 km)
    const snppRadius = earthRadius * 1.38;
    const snppOrbit = buildOrbitalTrack(snppRadius, 98.7, 205, 0x34d399);
    scene.add(snppOrbit);

    const snpp = buildSpacecraft(0x34d399, true);
    const snppHitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    snpp.group.add(snppHitProxy);
    scene.add(snpp.group);

    satellitesRef.current = {
      terra: { group: terra.group, hitProxy: terraHitProxy, scanCone: terra.scanCone },
      aqua: { group: aqua.group, hitProxy: aquaHitProxy, scanCone: aqua.scanCone },
      snpp: { group: snpp.group, hitProxy: snppHitProxy, scanCone: snpp.scanCone },
    };

    // 13. Pointer & Interaction Listeners
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (isDescending) return;
      isDraggingRef.current = true;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      pointerDownPosRef.current = { x: clientX, y: clientY };
      lastPointerPosRef.current = { x: clientX, y: clientY };
      pointerVelRef.current = { x: 0, y: 0 };
      lastPointerTimeRef.current = performance.now();
      inertiaVelRef.current = { x: 0, y: 0 };

      if ("touches" in e && e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDistRef.current = Math.hypot(dx, dy);
        pinchStartDistanceRef.current = targetDistanceRef.current;
      }
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      if (!isDraggingRef.current && !("touches" in e) && cameraRef.current) {
        const rect = dom.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);

        if (satellitesRef.current) {
          const s = satellitesRef.current;
          const satHits = raycaster.intersectObjects([
            s.terra.hitProxy,
            s.aqua.hitProxy,
            s.snpp.hitProxy,
          ]);

          if (satHits.length > 0) {
            const hit = satHits[0].object;
            dom.style.cursor = "pointer";
            if (hit === s.terra.hitProxy) setHoveredSatellite("terra");
            else if (hit === s.aqua.hitProxy) setHoveredSatellite("aqua");
            else if (hit === s.snpp.hitProxy) setHoveredSatellite("snpp");
            return;
          } else {
            setHoveredSatellite(null);
          }
        }

        if (beaconHitRef.current) {
          const bHits = raycaster.intersectObject(beaconHitRef.current);
          if (bHits.length > 0) {
            dom.style.cursor = "pointer";
            setIsBeaconHovered(true);
            return;
          } else {
            setIsBeaconHovered(false);
          }
        }

        // Live Tactical Coordinate Tracking HUD
        if (earthMeshRef.current && earthGroupRef.current && coordHudRef.current) {
          const eHits = raycaster.intersectObject(earthMeshRef.current);
          if (eHits.length > 0) {
            const p = earthGroupRef.current.worldToLocal(eHits[0].point.clone()).normalize();
            const lat = 90 - Math.acos(Math.max(-1, Math.min(1, p.y))) * (180 / Math.PI);
            const lon = ((Math.atan2(p.z, -p.x) * 180) / Math.PI) - 180;
            const normLon = ((lon + 540) % 360) - 180;

            const latDir = lat >= 0 ? "N" : "S";
            const lonDir = normLon >= 0 ? "E" : "W";
            const isUttarakhand = Math.abs(lat - 30.15) < 3.2 && Math.abs(normLon - 79.25) < 3.2;

            coordHudRef.current.innerHTML = `
              <div class="px-2.5 py-1 rounded-md bg-black/70 border ${isUttarakhand ? 'border-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'border-cyan-400/30 shadow-[0_0_12px_rgba(56,189,248,0.25)]'} backdrop-blur-md text-[10px] font-mono-telemetry flex items-center gap-2 select-none pointer-events-none">
                <span class="w-1.5 h-1.5 rounded-full ${isUttarakhand ? 'bg-amber-400 animate-ping' : 'bg-cyan-400'}"></span>
                <span class="font-bold text-white tracking-wider">${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(normLon).toFixed(2)}°${lonDir}</span>
                ${isUttarakhand ? '<span class="text-amber-300 font-semibold">[TARGET: UTTARAKHAND]</span>' : '<span class="text-slate-400">[WGS-84]</span>'}
              </div>
            `;
            coordHudRef.current.style.opacity = "1";
            coordHudRef.current.style.transform = `translate3d(${clientX + 14}px, ${clientY - 28}px, 0)`;
          } else {
            coordHudRef.current.style.opacity = "0";
          }
        }

        dom.style.cursor = "grab";
      }

      if (!isDraggingRef.current || isDescending) return;

      if ("touches" in e && e.touches.length === 2 && pinchDistRef.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = pinchDistRef.current / dist;
        targetDistanceRef.current = Math.max(2.4, Math.min(8.5, pinchStartDistanceRef.current * ratio));
        return;
      }

      const now = performance.now();
      const dt = Math.max(1, now - lastPointerTimeRef.current);
      const deltaX = clientX - lastPointerPosRef.current.x;
      const deltaY = clientY - lastPointerPosRef.current.y;

      pointerVelRef.current = {
        x: deltaY / dt,
        y: deltaX / dt,
      };

      targetRotationRef.current.y += deltaX * 0.005;
      targetRotationRef.current.x += deltaY * 0.005;
      targetRotationRef.current.x = Math.max(-1.25, Math.min(1.25, targetRotationRef.current.x));

      lastPointerPosRef.current = { x: clientX, y: clientY };
      lastPointerTimeRef.current = now;
      dom.style.cursor = "grabbing";
    };

    const handlePointerUp = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      dom.style.cursor = "grab";

      const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : (e as MouseEvent).clientY;
      const moveDist = Math.hypot(
        clientX - pointerDownPosRef.current.x,
        clientY - pointerDownPosRef.current.y
      );

      if (moveDist < 6 && cameraRef.current) {
        const rect = dom.getBoundingClientRect();
        mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, cameraRef.current);

        if (satellitesRef.current) {
          const s = satellitesRef.current;
          const satHits = raycaster.intersectObjects([
            s.terra.hitProxy,
            s.aqua.hitProxy,
            s.snpp.hitProxy,
          ]);

          if (satHits.length > 0 && onSatelliteSelect) {
            const hit = satHits[0].object;
            if (hit === s.terra.hitProxy) onSatelliteSelect(SATELLITE_CATALOG.terra);
            else if (hit === s.aqua.hitProxy) onSatelliteSelect(SATELLITE_CATALOG.aqua);
            else if (hit === s.snpp.hitProxy) onSatelliteSelect(SATELLITE_CATALOG.snpp);
            return;
          }
        }

        if (beaconHitRef.current) {
          const bHits = raycaster.intersectObject(beaconHitRef.current);
          if (bHits.length > 0) {
            focusUttarakhand();
            return;
          }
        }
      }

      inertiaVelRef.current = {
        x: Math.max(-0.04, Math.min(0.04, pointerVelRef.current.x * 0.016)),
        y: Math.max(-0.04, Math.min(0.04, pointerVelRef.current.y * 0.016)),
      };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY * 0.0035;
      targetDistanceRef.current = Math.max(2.4, Math.min(8.5, targetDistanceRef.current + zoomDelta));
    };

    const handleDoubleClick = (e: MouseEvent) => {
      if (isDescending || !cameraRef.current || !earthMeshRef.current) return;
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraRef.current);
      const hits = raycaster.intersectObject(earthMeshRef.current);
      if (hits.length > 0) {
        targetDistanceRef.current = Math.max(2.6, targetDistanceRef.current - 1.4);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") targetRotationRef.current.y -= 0.08;
      else if (e.key === "ArrowRight") targetRotationRef.current.y += 0.08;
      else if (e.key === "ArrowUp") targetRotationRef.current.x = Math.min(1.25, targetRotationRef.current.x + 0.08);
      else if (e.key === "ArrowDown") targetRotationRef.current.x = Math.max(-1.25, targetRotationRef.current.x - 0.08);
      else if (e.key === "+" || e.key === "=") targetDistanceRef.current = Math.max(2.4, targetDistanceRef.current - 0.5);
      else if (e.key === "-" || e.key === "_") targetDistanceRef.current = Math.min(8.5, targetDistanceRef.current + 0.5);
      else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setAutoRotate((prev) => !prev);
      } else if (e.key === "r" || e.key === "R") {
        resetView();
      } else if (e.key === "Escape") {
        if (isDescending && onSkipDescent) {
          onSkipDescent();
        } else {
          setIsTargetLocked(false);
        }
      }
    };

    dom.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("mousemove", handlePointerMove);
    window.addEventListener("mouseup", handlePointerUp);
    dom.addEventListener("wheel", handleWheel, { passive: false });
    dom.addEventListener("dblclick", handleDoubleClick);

    dom.addEventListener("touchstart", handlePointerDown, { passive: false });
    window.addEventListener("touchmove", handlePointerMove, { passive: false });
    window.addEventListener("touchend", handlePointerUp);
    window.addEventListener("keydown", handleKeyDown);

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // 14. Expose Runtime Debug Object
    (window as any).__FIREINTEL_DEBUG__ = {
      getScene: () => sceneRef.current,
      getCameraDistance: () => currentDistanceRef.current,
      getTargetDistance: () => targetDistanceRef.current,
      setCameraDistance: (d: number) => {
        targetDistanceRef.current = Math.max(2.4, Math.min(8.5, d));
        currentDistanceRef.current = targetDistanceRef.current;
      },
      getRotation: () => ({
        x: earthGroupRef.current?.rotation.x ?? 0,
        y: earthGroupRef.current?.rotation.y ?? 0,
      }),
      setRotation: (x: number, y: number) => {
        targetRotationRef.current = { x, y };
        if (earthGroupRef.current) {
          earthGroupRef.current.rotation.x = x;
          earthGroupRef.current.rotation.y = y;
        }
      },
      isAutoRotating: () => autoRotateRef.current,
      toggleAutoRotation: () => setAutoRotate((prev) => !prev),
      focusBeacon: () => focusUttarakhand(),
      focusIndia: () => focusIndia(),
      focusNight: () => focusNight(),
      resetView: () => resetView(),
      getFPS: () => fps,
      selectSatellite: (id: string) => {
        if (onSatelliteSelect && SATELLITE_CATALOG[id]) {
          onSatelliteSelect(SATELLITE_CATALOG[id]);
        }
      },
      skipDescent: () => {
        if (onSkipDescent) onSkipDescent();
      },
    };

    // 15. DELTA-TIME ANIMATION LOOP WITH ZERO GARBAGE COLLECTION ALLOCATIONS
    let pulseTime = 0;
    let satTime = 0;
    let lastFrameTime = performance.now();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastFrameTime) / 1000); // Clamped delta time in seconds
      lastFrameTime = now;

      // FPS Calculation
      frameCountRef.current++;
      if (now - lastFpsTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      pulseTime += dt * 2.5;
      satTime += dt * 0.42;

      // Beacon ring pulsation
      if (beaconRingRef.current) {
        const scale = 1.0 + Math.sin(pulseTime * 2.5) * 0.35;
        beaconRingRef.current.scale.set(scale, scale, scale);
        (beaconRingRef.current.material as THREE.MeshBasicMaterial).opacity =
          0.35 + Math.cos(pulseTime * 2.5) * 0.45;
      }

      // Boundary Highlight Glow (Glows when target locked or descending)
      if (boundaryLineRef.current) {
        const mat = boundaryLineRef.current.material as THREE.LineBasicMaterial;
        if (isTargetLocked || isDescending) {
          mat.opacity = 0.85;
          mat.color.setHex(0x38bdf8);
        } else {
          mat.opacity = 0.35;
          mat.color.setHex(0x0284c7);
        }
      }

      // Update Satellites along polar orbital planes using pre-allocated vectors
      if (satellitesRef.current && cameraRef.current) {
        const s = satellitesRef.current;

        // 1. Terra Spacecraft
        const a1 = satTime;
        _vPos1.set(terraRadius * Math.cos(a1), terraRadius * Math.sin(a1), 0);
        _vPos1.applyAxisAngle(_xAxis, (98.2 * Math.PI) / 180);
        _vPos1.applyAxisAngle(_yAxis, (25 * Math.PI) / 180);
        s.terra.group.position.copy(_vPos1);
        s.terra.group.lookAt(0, 0, 0);

        // 2. Aqua Spacecraft
        const a2 = satTime * 1.08 + Math.PI;
        _vPos2.set(aquaRadius * Math.cos(a2), aquaRadius * Math.sin(a2), 0);
        _vPos2.applyAxisAngle(_xAxis, (98.2 * Math.PI) / 180);
        _vPos2.applyAxisAngle(_yAxis, (115 * Math.PI) / 180);
        s.aqua.group.position.copy(_vPos2);
        s.aqua.group.lookAt(0, 0, 0);

        // 3. Suomi-NPP Spacecraft
        const a3 = satTime * 0.94 + Math.PI * 0.45;
        _vPos3.set(snppRadius * Math.cos(a3), snppRadius * Math.sin(a3), 0);
        _vPos3.applyAxisAngle(_xAxis, (98.7 * Math.PI) / 180);
        _vPos3.applyAxisAngle(_yAxis, (205 * Math.PI) / 180);
        s.snpp.group.position.copy(_vPos3);
        s.snpp.group.lookAt(0, 0, 0);

        // DIRECT DOM TRANSFORM UPDATES (ZERO REACT STATE DISPATCHES IN RENDER LOOP)
        if (!isDescendingRef.current) {
          const w = containerRef.current?.clientWidth || 1;
          const h = containerRef.current?.clientHeight || 1;

          const updateLabelTransform = (el: HTMLDivElement | null, pos: THREE.Vector3) => {
            if (!el || !cameraRef.current) return;
            _vProj.copy(pos).project(cameraRef.current);
            if (_vProj.z < 1.0) {
              const x = ((_vProj.x + 1) * w) / 2;
              const y = ((-_vProj.y + 1) * h) / 2;
              el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
              el.style.display = "block";
            } else {
              el.style.display = "none";
            }
          };

          updateLabelTransform(terraLabelRef.current, _vPos1);
          updateLabelTransform(aquaLabelRef.current, _vPos2);
          updateLabelTransform(snppLabelRef.current, _vPos3);
        }
      }

      // Cloud layer atmospheric rotation
      if (cloudsRef.current) {
        cloudsRef.current.rotation.y += dt * 0.02;
      }

      // Camera Distance Damping (Physical smooth zoom)
      currentDistanceRef.current +=
        (targetDistanceRef.current - currentDistanceRef.current) * (1 - Math.exp(-dt * 8));

      // CAMERA & DESCENT CHOREOGRAPHY
      if (earthGroupRef.current && cameraRef.current) {
        if (!isDescendingRef.current) {
          descentStartTimeRef.current = null;

          if (!isDraggingRef.current) {
            if (
              Math.abs(inertiaVelRef.current.x) > 0.0001 ||
              Math.abs(inertiaVelRef.current.y) > 0.0001
            ) {
              targetRotationRef.current.x += inertiaVelRef.current.x;
              targetRotationRef.current.y += inertiaVelRef.current.y;
              targetRotationRef.current.x = Math.max(-1.25, Math.min(1.25, targetRotationRef.current.x));
              inertiaVelRef.current.x *= Math.pow(0.92, dt * 60);
              inertiaVelRef.current.y *= Math.pow(0.92, dt * 60);
            } else if (autoRotateRef.current) {
              targetRotationRef.current.y += dt * 0.04;
            }
          }

          earthGroupRef.current.rotation.y +=
            (targetRotationRef.current.y - earthGroupRef.current.rotation.y) * (1 - Math.exp(-dt * 6));
          earthGroupRef.current.rotation.x +=
            (targetRotationRef.current.x - earthGroupRef.current.rotation.x) * (1 - Math.exp(-dt * 6));

          cameraRef.current.position.set(0, currentDistanceRef.current * 0.08, currentDistanceRef.current);
          cameraRef.current.lookAt(0, 0, 0);
        } else {
          // PARAMETRIC CONTINUOUS 7-ACT SPACE-TO-HIMALAYAS DESCENT
          if (descentStartTimeRef.current === null) {
            descentStartTimeRef.current = now;
            startDistanceRef.current = currentDistanceRef.current;
            startRotationRef.current = {
              x: earthGroupRef.current ? earthGroupRef.current.rotation.x : 0.35,
              y: earthGroupRef.current ? earthGroupRef.current.rotation.y : -1.8,
            };
          }

          const elapsed = now - descentStartTimeRef.current;
          const p = Math.min(1.0, elapsed / DESCENT_DURATION_MS);

          // Analytic Quintic Smoothstep Easing: 6p^5 - 15p^4 + 10p^3
          const easeP = p * p * p * (p * (p * 6 - 15) + 10);

          let stage = 1;
          if (p < 0.16) stage = 1;      // Act 1: Orbital Establishing Shot
          else if (p < 0.32) stage = 2; // Act 2: India Reveal
          else if (p < 0.50) stage = 3; // Act 3: Uttarakhand Target Acquisition
          else if (p < 0.68) stage = 4; // Act 4: Atmospheric Descent
          else if (p < 0.84) stage = 5; // Act 5: Himalayan Reveal (Copernicus 30m DEM)
          else if (p < 0.96) stage = 6; // Act 6: Thermal Observation Activation
          else stage = 7;               // Act 7: Tactical Terrain Composition

          if (stage !== currentStageRef.current) {
            currentStageRef.current = stage;
            if (onStageChangeRef.current) onStageChangeRef.current(stage);
          }

          const targetY = -lonRad - Math.PI / 2 + 0.15;
          const targetX = latRad - 0.22;

          if (earthGroupRef.current) {
            earthGroupRef.current.rotation.y = THREE.MathUtils.lerp(
              startRotationRef.current.y,
              targetY,
              easeP
            );
            earthGroupRef.current.rotation.x = THREE.MathUtils.lerp(
              startRotationRef.current.x,
              targetX,
              easeP
            );
          }

          if (cameraRef.current) {
            const camZ = THREE.MathUtils.lerp(startDistanceRef.current, 2.02, easeP);
            const camY = THREE.MathUtils.lerp(startDistanceRef.current * 0.08, 0.04, easeP);
            cameraRef.current.position.set(0, camY, camZ);
            cameraRef.current.lookAt(0, 0, 0);
          }

          if (p >= 1.0) {
            if (onDescendCompleteRef.current) {
              onDescendCompleteRef.current();
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", handlePointerUp);
      dom.removeEventListener("wheel", handleWheel);
      dom.removeEventListener("dblclick", handleDoubleClick);
      dom.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("touchmove", handlePointerMove);
      window.removeEventListener("touchend", handlePointerUp);
      window.removeEventListener("keydown", handleKeyDown);

      if (rendererRef.current && rendererRef.current.domElement) {
        containerRef.current?.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }

      dayTexture.dispose();
      nightTexture.dispose();
      normalTexture.dispose();
      specularTexture.dispose();
      cloudsTexture.dispose();
      earthGeo.dispose();
      cloudGeo.dispose();
      atmosphereGeo.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-transparent">
      {/* Three.js 3D Earth Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing select-none"
      />

      {/* Cinematic Vignette (Preserving depth of space background) */}
      <div className="pointer-events-none absolute inset-0 bg-radial-[at_50%_50%] from-transparent via-transparent to-black/45" />

      {/* Atmospheric Horizon Rim */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-50" />

      {/* Live Tactical Crosshair & Geodetic Coordinate Tooltip */}
      <div
        ref={coordHudRef}
        style={{ left: 0, top: 0, opacity: 0 }}
        className="fixed z-40 transition-opacity duration-150 pointer-events-none select-none"
      />

      {/* 3D SATELLITE PLATFORM LABELS WITH DIRECT DOM TRANSFORM (ZERO REACT RE-RENDERS) */}
      {!isDescending && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden z-20">
          {/* Terra Label */}
          <div
            ref={terraLabelRef}
            data-satellite-label="terra"
            style={{ left: -50, top: -24 }}
            className={`absolute transition-transform duration-75 select-none ${hoveredSatellite === "terra" ? "scale-110" : "scale-100"
              }`}
          >
            <div
              className={`pointer-events-auto cursor-pointer px-2.5 py-1 rounded-full border text-[10px] font-mono-telemetry tracking-wider uppercase transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg ${hoveredSatellite === "terra"
                ? "bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                : "bg-black/60 border-white/20 text-slate-300 hover:text-white"
                }`}
              onClick={() => onSatelliteSelectRef.current && onSatelliteSelectRef.current(SATELLITE_CATALOG.terra)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
              <span className="font-semibold">TERRA</span>
              <span className="text-slate-500 font-mono-telemetry">[MODIS]</span>
            </div>
          </div>

          {/* Aqua Label */}
          <div
            ref={aquaLabelRef}
            data-satellite-label="aqua"
            style={{ left: -50, top: -24 }}
            className={`absolute transition-transform duration-75 select-none ${hoveredSatellite === "aqua" ? "scale-110" : "scale-100"
              }`}
          >
            <div
              className={`pointer-events-auto cursor-pointer px-2.5 py-1 rounded-full border text-[10px] font-mono-telemetry tracking-wider uppercase transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg ${hoveredSatellite === "aqua"
                ? "bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                : "bg-black/60 border-white/20 text-slate-300 hover:text-white"
                }`}
              onClick={() => onSatelliteSelectRef.current && onSatelliteSelectRef.current(SATELLITE_CATALOG.aqua)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#fbbf24] animate-pulse" />
              <span className="font-semibold">AQUA</span>
              <span className="text-slate-500 font-mono-telemetry">[MODIS]</span>
            </div>
          </div>

          {/* Suomi-NPP Label */}
          <div
            ref={snppLabelRef}
            data-satellite-label="snpp"
            style={{ left: -50, top: -24 }}
            className={`absolute transition-transform duration-75 select-none ${hoveredSatellite === "snpp" ? "scale-110" : "scale-100"
              }`}
          >
            <div
              className={`pointer-events-auto cursor-pointer px-2.5 py-1 rounded-full border text-[10px] font-mono-telemetry tracking-wider uppercase transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg ${hoveredSatellite === "snpp"
                ? "bg-white/20 border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                : "bg-black/60 border-white/20 text-slate-300 hover:text-white"
                }`}
              onClick={() => onSatelliteSelectRef.current && onSatelliteSelectRef.current(SATELLITE_CATALOG.snpp)}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
              <span className="font-semibold">SUOMI-NPP</span>
              <span className="text-slate-500 font-mono-telemetry">[VIIRS]</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Beacon Hover / Lock Badge */}
      {(isBeaconHovered || isTargetLocked) && !isDescending && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-30 animate-in fade-in duration-300">
          <div className="px-4 py-2 rounded-full glass-surface border border-sky-400/40 shadow-[0_0_25px_rgba(56,189,248,0.35)] flex items-center gap-2.5 text-xs font-mono-telemetry text-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
            <span className="font-semibold text-white">TARGET: UTTARAKHAND</span>
            <span className="text-slate-400">•</span>
            <span>30.1542°N, 79.2519°E</span>
            <span className="text-slate-400">•</span>
            <span className="text-amber-400">7,541 Observations</span>
          </div>
        </div>
      )}

      {/* Floating Tactical Camera Dock (Bottom-Right) */}
      {!isDescending && (
        <div className="absolute bottom-6 right-8 z-30 flex items-center gap-2 pointer-events-auto">
          {/* Target Lock Button */}
          <button
            onClick={focusUttarakhand}
            className={`p-2.5 rounded-full glass-pill transition-all cursor-pointer ${isTargetLocked
              ? "bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-[0_0_15px_rgba(56,189,248,0.3)]"
              : "text-slate-300 hover:text-white hover:bg-white/10"
              }`}
            title="Focus camera on Uttarakhand (30.15°N, 79.25°E)"
            aria-label="Lock Himalayan Target"
            data-orbit-control="target-lock"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Auto-Rotation Toggle */}
          <button
            onClick={() => setAutoRotate((prev) => !prev)}
            className={`p-2.5 rounded-full glass-pill transition-all cursor-pointer ${autoRotate
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
              : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
            title={autoRotate ? "Pause planetary spin (Space)" : "Resume planetary spin (Space)"}
            aria-label="Toggle Auto Rotation"
            data-orbit-control="toggle-autorotate"
          >
            {autoRotate ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            className="p-2.5 rounded-full glass-pill text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
            data-orbit-control="zoom-in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            className="p-2.5 rounded-full glass-pill text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
            data-orbit-control="zoom-out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset View */}
          <button
            onClick={resetView}
            className="p-2.5 rounded-full glass-pill text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            title="Reset Framing (R)"
            aria-label="Reset View"
            data-orbit-control="reset-view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Floating Skip Descent Button (Visible only during active descent) */}
      {isDescending && onSkipDescent && (
        <div className="absolute top-8 right-8 z-30 pointer-events-auto animate-in fade-in duration-300">
          <button
            onClick={onSkipDescent}
            className="px-4 py-2 rounded-full glass-pill text-xs font-mono-telemetry text-slate-300 hover:text-white hover:bg-white/15 transition-all flex items-center gap-2 cursor-pointer shadow-xl border border-white/20"
            title="Skip camera descent directly to 3D Himalayan terrain"
          >
            <span>Skip to Himalayas</span>
            <FastForward className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px] text-slate-500 font-mono-telemetry">[Esc]</span>
          </button>
        </div>
      )}

      {/* Live Telemetry Watermark (Bottom-Left) */}
      <div className="pointer-events-none absolute bottom-6 left-8 z-10 hidden sm:flex items-center gap-3 text-[11px] font-mono-telemetry text-slate-500 select-none">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Living Earth Engine
        </span>
        <span>•</span>
        <span>{fps} FPS</span>
        <span>•</span>
        <span>Range: {currentDistanceRef.current.toFixed(2)} AU</span>
        <span>•</span>
        <span className="text-slate-400">Illustrative orbital geometry — not live spacecraft tracking</span>
      </div>
    </div>
  );
}
