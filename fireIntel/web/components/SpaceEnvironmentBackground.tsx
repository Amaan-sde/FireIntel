"use client";

/**
 * SpaceEnvironmentBackground.tsx
 * 
 * Photorealistic Deep Space Celestial Environment
 * - Authentic Milky Way galactic backbone matched to real astrophotography
 * - 12,000+ crisp, pinprick stellar objects with physical B-V temperature colors
 * - Multi-layer GPU twinkle scintillation (zero-CPU overhead)
 * - Drifting interstellar dust filaments
 * - Hypersonic shooting stars (meteors with fading plasma trails)
 * - Pure deep cosmic black void (#010204)
 */

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

function getPerformanceTier(): "low" | "medium" | "high" {
  if (typeof window === "undefined") return "medium";
  const cores = (navigator as any).hardwareConcurrency ?? 4;
  const memory = (navigator as any).deviceMemory ?? 4;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (isTouch && (cores <= 4 || memory <= 4)) return "low";
  if (cores >= 8 && memory >= 8) return "high";
  return "medium";
}

function makePRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const MILKYWAY_VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
  }
`;

const MILKYWAY_FRAG = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.05 + vec2(1.7, 9.2);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 st = (vUv - 0.5) * 2.0;

    // Diagonal angle ~32 degrees
    float angle = -0.58;
    mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 p = rot * st;

    float slowTime = uTime * 0.012;
    vec2 q = vec2(fbm(p * 1.5 + vec2(slowTime * 0.2, 0.0)), fbm(p * 2.0 - vec2(0.0, slowTime * 0.15)));
    vec2 r = vec2(fbm(p + q * 1.2 + vec2(1.2, 3.4)), fbm(p + q * 1.5 + vec2(8.3, 2.8)));

    float bandWidth = 0.55 + 0.18 * sin(p.y * 1.4);
    float spineDist = abs(p.x + (r.x - 0.5) * 0.38);
    float spineDensity = exp(-pow(spineDist / bandWidth, 2.0) * 3.5);

    float cloudNoise = fbm(p * 3.2 + r * 2.0 + vec2(slowTime * 0.05, 0.0));
    cloudNoise = smoothstep(0.28, 0.82, cloudNoise);

    float darkRift = fbm(p * 4.5 + q * 2.8 + vec2(2.1, 7.3));
    float riftMask = smoothstep(0.42, 0.68, darkRift);
    float absorption = mix(1.0, 0.12, riftMask * smoothstep(0.0, 0.35, spineDist));

    vec3 sapphireBlue = vec3(0.08, 0.28, 0.72);
    vec3 electricCyan  = vec3(0.14, 0.48, 0.98);
    vec3 warmAmber     = vec3(0.72, 0.34, 0.14);
    vec3 goldenCore    = vec3(0.92, 0.50, 0.20);
    vec3 voidBlack     = vec3(0.003, 0.005, 0.012);

    float coreFactor = smoothstep(-0.8, 0.6, -p.y + (r.y - 0.5) * 0.5);

    vec3 nebulaColor = mix(
      mix(sapphireBlue, electricCyan, cloudNoise * 0.75),
      mix(warmAmber, goldenCore, cloudNoise * 0.85),
      coreFactor * 0.82
    );

    float totalDensity = spineDensity * cloudNoise * absorption;
    float alpha = clamp(totalDensity * uOpacity * 0.75, 0.0, 0.95);

    float leftFade = smoothstep(-0.95, -0.15, st.x);
    alpha *= mix(0.40, 1.0, leftFade);

    vec3 finalColor = mix(voidBlack, nebulaColor, totalDensity * 1.3);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const STAR_VERT = `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute vec3 aColor;
  uniform float uTime;
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vColor = aColor;
    float twinkle = 0.65 + 0.35 * sin(uTime * aSpeed + aPhase);
    vTwinkle = twinkle;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.5, aSize * twinkle * (500.0 / -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAG = `
  varying vec3 vColor;
  varying float vTwinkle;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Crisp, luminous pinpoint stellar core with photometric glow
    float core = 1.0 - smoothstep(0.0, 0.25, dist);
    float halo = pow(max(0.0, 1.0 - dist * 2.0), 2.2);
    float alpha = (core * 0.95 + halo * 0.55) * vTwinkle;
    gl_FragColor = vec4(vColor * alpha, alpha);
  }
`;

export default function SpaceEnvironmentBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tier = getPerformanceTier();
    const dpr = Math.min(window.devicePixelRatio || 1, tier === "high" ? 1.5 : 1.0);

    const counts = {
      low:    { starsGalactic: 4500, starsBackground: 1500, dust: 800 },
      medium: { starsGalactic: 8500, starsBackground: 2800, dust: 1600 },
      high:   { starsGalactic: 14000, starsBackground: 4200, dust: 2400 },
    }[tier];

    const W = containerRef.current.clientWidth;
    const H = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setSize(W, H);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x010204, 1.0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    containerRef.current.appendChild(renderer.domElement);

    const dom = renderer.domElement;
    dom.style.pointerEvents = "none";

    // 1. Milky Way Galactic Plane
    const mwGeo = new THREE.PlaneGeometry(1100, 1100, 1, 1);
    const mwUniforms = {
      uTime: { value: 0.0 },
      uOpacity: { value: 1.0 },
    };

    const mwMat = new THREE.ShaderMaterial({
      vertexShader: MILKYWAY_VERT,
      fragmentShader: MILKYWAY_FRAG,
      uniforms: mwUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const mwMesh = new THREE.Mesh(mwGeo, mwMat);
    mwMesh.position.set(40, -10, -320);
    scene.add(mwMesh);

    // 2. Dense Astrophotography Starfield
    const rng = makePRNG(881);
    const totalStars = counts.starsGalactic + counts.starsBackground;

    const starPositions = new Float32Array(totalStars * 3);
    const starColors = new Float32Array(totalStars * 3);
    const starSizes = new Float32Array(totalStars);
    const starPhases = new Float32Array(totalStars);
    const starSpeeds = new Float32Array(totalStars);

    const mwAngle = -0.58;
    const cosA = Math.cos(mwAngle);
    const sinA = Math.sin(mwAngle);

    for (let i = 0; i < totalStars; i++) {
      let x = 0, y = 0, z = 0;

      if (i < counts.starsGalactic) {
        const u = (rng() - 0.5) * 720;
        const u1 = Math.max(1e-6, rng());
        const u2 = rng();
        const normalRand = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        const v = normalRand * 54.0;

        x = u * cosA - v * sinA + 30;
        y = u * sinA + v * cosA - 10;
        z = -180 - rng() * 320;

        const yNorm = (y + 200) / 400;
        const isCore = yNorm < 0.42 && rng() > 0.35;

        if (isCore) {
          starColors[i * 3]     = 1.0;
          starColors[i * 3 + 1] = 0.82 + rng() * 0.18;
          starColors[i * 3 + 2] = 0.60 + rng() * 0.25;
        } else {
          const t = rng();
          if (t > 0.60) {
            starColors[i * 3]     = 0.70 + rng() * 0.20;
            starColors[i * 3 + 1] = 0.85 + rng() * 0.15;
            starColors[i * 3 + 2] = 1.0;
          } else {
            const lum = 0.90 + rng() * 0.10;
            starColors[i * 3]     = lum;
            starColors[i * 3 + 1] = lum;
            starColors[i * 3 + 2] = lum;
          }
        }
        
        // Multi-tier star sizes for realistic stellar magnitudes
        const isBrightStar = rng() < 0.04;
        starSizes[i] = isBrightStar ? 4.5 + rng() * 3.2 : 1.6 + rng() * 2.2;
      } else {
        const r = 220 + rng() * 420;
        const theta = rng() * Math.PI * 2;
        const phi = Math.acos(rng() * 2 - 1);

        x = r * Math.sin(phi) * Math.cos(theta);
        y = r * Math.sin(phi) * Math.sin(theta);
        z = -140 - r * Math.abs(Math.cos(phi));

        const lum = 0.75 + rng() * 0.25;
        const t = rng();
        if (t > 0.7) {
          starColors[i * 3]     = lum * 0.75;
          starColors[i * 3 + 1] = lum * 0.88;
          starColors[i * 3 + 2] = lum * 1.0;
        } else {
          starColors[i * 3]     = lum;
          starColors[i * 3 + 1] = lum;
          starColors[i * 3 + 2] = lum;
        }
        const isBrightStar = rng() < 0.03;
        starSizes[i] = isBrightStar ? 4.0 + rng() * 2.8 : 1.4 + rng() * 1.8;
      }

      starPositions[i * 3]     = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;

      starPhases[i] = rng() * Math.PI * 2;
      starSpeeds[i] = 0.8 + rng() * 2.4;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute("aColor",   new THREE.BufferAttribute(starColors, 3));
    starGeo.setAttribute("aSize",    new THREE.BufferAttribute(starSizes, 1));
    starGeo.setAttribute("aPhase",   new THREE.BufferAttribute(starPhases, 1));
    starGeo.setAttribute("aSpeed",   new THREE.BufferAttribute(starSpeeds, 1));

    const starUniforms = { uTime: { value: 0.0 } };
    const starMat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starPoints = new THREE.Points(starGeo, starMat);
    scene.add(starPoints);

    // 3. Shooting Stars (Meteors with clean, sharp plasma trails)
    const meteorCount = 2;
    const meteorLines: {
      line: THREE.Line;
      active: boolean;
      progress: number;
      speed: number;
      start: THREE.Vector3;
      end: THREE.Vector3;
      nextSpawn: number;
    }[] = [];

    const meteorMat = new THREE.LineBasicMaterial({
      color: 0x9be8ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      linewidth: 1.5,
    });

    for (let m = 0; m < meteorCount; m++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      const line = new THREE.Line(lineGeo, meteorMat.clone());
      scene.add(line);
      meteorLines.push({
        line,
        active: false,
        progress: 0,
        speed: 1.8,
        start: new THREE.Vector3(),
        end: new THREE.Vector3(),
        nextSpawn: 1.5 + m * 3.5,
      });
    }

    const spawnMeteor = (idx: number) => {
      const m = meteorLines[idx];
      const startX = (Math.random() - 0.4) * 200 + 40;
      const startY = 80 + Math.random() * 60;
      const startZ = -120 - Math.random() * 80;
      const angle = -0.55 - Math.random() * 0.25;
      const travelDist = 120 + Math.random() * 80;

      m.start.set(startX, startY, startZ);
      m.end.set(
        startX + Math.cos(angle) * travelDist,
        startY + Math.sin(angle) * travelDist,
        startZ
      );
      m.progress = 0;
      m.speed = 1.6 + Math.random() * 1.2;
      m.active = true;
    };

    // 4. Subtle Interstellar Dust Drift
    const dustCount = counts.dust;
    const dustPos = new Float32Array(dustCount * 3);
    const dustVels = new Float32Array(dustCount * 3);

    for (let i = 0; i < dustCount; i++) {
      dustPos[i * 3]     = (rng() - 0.5) * 220;
      dustPos[i * 3 + 1] = (rng() - 0.5) * 160;
      dustPos[i * 3 + 2] = -20 - rng() * 120;
      dustVels[i * 3]     = (rng() - 0.5) * 0.015;
      dustVels[i * 3 + 1] = (rng() - 0.5) * 0.012;
      dustVels[i * 3 + 2] = (rng() - 0.5) * 0.015;
    }

    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3).setUsage(THREE.DynamicDrawUsage));
    const dustMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.95,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustPoints = new THREE.Points(dustGeo, dustMat);
    scene.add(dustPoints);

    // 5. Mouse Parallax
    const mouse = { x: 0, y: 0 };
    const targetOffset = { x: 0, y: 0 };
    const currentOffset = { x: 0, y: 0 };
    const PARALLAX_AMOUNT = 4.5;

    const handleMouseMove = (e: MouseEvent) => {
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;
      mouse.x = (e.clientX - halfW) / halfW;
      mouse.y = (e.clientY - halfH) / halfH;
      targetOffset.x = -mouse.x * PARALLAX_AMOUNT;
      targetOffset.y =  mouse.y * PARALLAX_AMOUNT;
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let isVisible = true;
    const handleVisibility = () => { isVisible = !document.hidden; };
    document.addEventListener("visibilitychange", handleVisibility);

    const handleResize = () => {
      if (!containerRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // 6. Animation Loop (60 FPS)
    let animId: number;
    let lastTime = performance.now();
    let totalTime = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!prefersReduced) {
        totalTime += dt;
      }

      mwUniforms.uTime.value = totalTime;
      starUniforms.uTime.value = totalTime;

      // Meteors
      if (!prefersReduced) {
        for (let m = 0; m < meteorLines.length; m++) {
          const met = meteorLines[m];
          if (!met.active) {
            met.nextSpawn -= dt;
            if (met.nextSpawn <= 0) {
              spawnMeteor(m);
            }
          } else {
            met.progress += dt * met.speed;
            const mat = met.line.material as THREE.LineBasicMaterial;
            if (met.progress < 1.0) {
              const headP = Math.min(1.0, met.progress);
              const tailP = Math.max(0.0, met.progress - 0.28);
              const head = new THREE.Vector3().lerpVectors(met.start, met.end, headP);
              const tail = new THREE.Vector3().lerpVectors(met.start, met.end, tailP);

              const posAttr = met.line.geometry.attributes.position as THREE.BufferAttribute;
              posAttr.setXYZ(0, tail.x, tail.y, tail.z);
              posAttr.setXYZ(1, head.x, head.y, head.z);
              posAttr.needsUpdate = true;

              const alpha = Math.sin(met.progress * Math.PI) * 0.95;
              mat.opacity = alpha;
            } else {
              met.active = false;
              mat.opacity = 0.0;
              met.nextSpawn = 4.0 + Math.random() * 6.0;
            }
          }
        }
      }

      // Cosmic Dust
      if (!prefersReduced) {
        const pAttr = dustGeo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < dustCount; i++) {
          pAttr.setX(i, pAttr.getX(i) + dustVels[i * 3]);
          pAttr.setY(i, pAttr.getY(i) + dustVels[i * 3 + 1]);
          pAttr.setZ(i, pAttr.getZ(i) + dustVels[i * 3 + 2]);
          if (Math.abs(pAttr.getX(i)) > 110) pAttr.setX(i, -pAttr.getX(i) * 0.95);
          if (Math.abs(pAttr.getY(i)) > 80)  pAttr.setY(i, -pAttr.getY(i) * 0.95);
        }
        pAttr.needsUpdate = true;
      }

      // Camera Parallax
      if (!prefersReduced) {
        const lerp = 1 - Math.exp(-dt * 2.0);
        currentOffset.x += (targetOffset.x - currentOffset.x) * lerp;
        currentOffset.y += (targetOffset.y - currentOffset.y) * lerp;
        camera.position.x = currentOffset.x;
        camera.position.y = currentOffset.y;
        camera.lookAt(currentOffset.x * 0.3, currentOffset.y * 0.3, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);

      mwGeo.dispose();
      mwMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      meteorLines.forEach((m) => {
        m.line.geometry.dispose();
        (m.line.material as THREE.Material).dispose();
      });
      dustGeo.dispose();
      dustMat.dispose();

      renderer.dispose();
      if (containerRef.current && dom.parentNode === containerRef.current) {
        containerRef.current.removeChild(dom);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full select-none"
      style={{ background: "#010204" }}
      aria-hidden="true"
    />
  );
}
