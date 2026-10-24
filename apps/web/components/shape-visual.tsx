"use client";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { gpuFrameGate } from "../lib/gpu-frame-gate";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { stageFragment, surfaceVertex, surfaceFragment } from "../lib/stage-shaders";
import { renderSize, DEFAULT_RENDER_QUALITY, type RenderQuality } from "../lib/render-quality";
import type { VisualEnergy } from "../lib/visual-energy";
import type { VisualAudio } from "../lib/visual-audio";
import { visualModes, type ShapeMode } from "../lib/visual-modes";

export function ShapeVisual({ player, mode, seed, intensity, autoEnergy = true, energy: energyDirector, reducedMotion, quality = DEFAULT_RENDER_QUALITY }: {
  player: RefObject<VisualAudio | null>; mode: ShapeMode; seed: number;
  intensity: number; autoEnergy?: boolean; energy?: VisualEnergy; reducedMotion: boolean; quality?: RenderQuality;
}) {
  const host = useRef<HTMLDivElement>(null);
  const qualityRef = useRef(quality), resizeRef = useRef<() => void>(() => {});
  useEffect(() => { qualityRef.current = quality; resizeRef.current(); }, [quality]);
  const settings = useRef({ intensity, autoEnergy, energyDirector, reducedMotion });
  useEffect(() => { settings.current = { intensity, autoEnergy, energyDirector, reducedMotion }; }, [intensity, autoEnergy, energyDirector, reducedMotion]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let state = (seed ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
    const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }); }
    catch { element.textContent = "Enable graphics acceleration for Three.js visuals."; return () => { element.textContent = ""; }; }
    const gate = gpuFrameGate(renderer.getContext());
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x02040d);
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x02040d, .018);
    const camera = new THREE.PerspectiveCamera(65, 1, .1, 180);
    camera.position.z = 34;
    const group = new THREE.Group(); scene.add(group);
    const hue = random();
    const stageUniforms = { time: { value: 0 }, drive: { value: 0 }, variant: { value: 0 }, hue: { value: hue } };
    const backgroundGeometry = new THREE.PlaneGeometry(245, 170);
    const backgroundMaterial = new THREE.ShaderMaterial({ uniforms: stageUniforms, vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}", fragmentShader: stageFragment, depthWrite: false });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial); background.position.z = -90; scene.add(background);
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloom = new UnrealBloomPass(new THREE.Vector2(800, 600), .85, .45, 1.05);
    const outputPass = new OutputPass();
    composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(outputPass);
    const color = (offset: number) => new THREE.Color().setHSL((hue + offset) % 1, .9, .64);
    // Soft point sprites, generated locally; no texture assets or image downloads.
    const sprite = document.createElement("canvas"); sprite.width = sprite.height = 32;
    const ctx = sprite.getContext("2d")!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "#ffffffff"); gradient.addColorStop(.2, "#ffffffbb"); gradient.addColorStop(1, "#ffffff00");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(sprite);
    const count = 9500, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 1 + Math.pow(random(), .6) * 40, angle = (i % 5) * Math.PI * .4 + radius * .14 + random() * .65;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius * .65;
      positions[i * 3 + 2] = (random() - .5) * 85;
      const shade = color(random() * .45); shade.toArray(colors, i * 3);
    }
    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const pointsMaterial = new THREE.PointsMaterial({ size: .55, map: texture, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const points = new THREE.Points(pointsGeometry, pointsMaterial); group.add(points);
    const rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
    const sides = [3, 4, 5, 6, 8, 12][Math.floor(random() * 6)];
    for (let i = 0; i < 30; i++) {
      const geometry = new THREE.TorusGeometry(8 + random() * 2, .10 + random() * .10, 6, sides);
      const material = new THREE.MeshBasicMaterial({ color: color(i * .015), transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false });
      const ring = new THREE.Mesh(geometry, material);
      ring.position.z = 24 - i * 5; ring.rotation.z = i * .17;
      rings.push(ring); group.add(ring);
    }
    const shards: THREE.Mesh<THREE.IcosahedronGeometry | THREE.OctahedronGeometry | THREE.TorusKnotGeometry, THREE.ShaderMaterial>[] = [];
    for (let i = 0; i < 22; i++) {
      const geometry = i % 3 === 0 ? new THREE.TorusKnotGeometry(1.4, .4, 128, 12, 2 + i % 3, 3 + i % 4) : i % 2 ? new THREE.IcosahedronGeometry(1.5, 2) : new THREE.OctahedronGeometry(1.8, 1);
      const material = new THREE.ShaderMaterial({ uniforms: { time: stageUniforms.time, drive: stageUniforms.drive, hue: { value: hue + i * .045 } }, vertexShader: surfaceVertex, fragmentShader: surfaceFragment });
      const mesh = new THREE.Mesh(geometry, material); mesh.userData.phase = random() * Math.PI * 2;
      mesh.userData.radius = i === 0 ? 0 : 6 + random() * 15;
      mesh.userData.speed = .1 + random() * .2;
      shards.push(mesh); group.add(mesh);
    }
    const resize = () => {
      const width = Math.max(1, element.clientWidth), height = Math.max(1, element.clientHeight);
      const size = renderSize(width, height, qualityRef.current, devicePixelRatio, renderer.capabilities.maxTextureSize);
      renderer.setSize(size.width, size.height, false); composer.setSize(size.width, size.height); camera.aspect = width / height;
      element.dataset.resolution = `${size.width}×${size.height}`; camera.updateProjectionMatrix();
    };
    resizeRef.current = resize;
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    let frame = 0, last = performance.now(), clock = 0, bass = 0, energy = 0, high = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden || !gate.ready()) return;
      const now = performance.now(), delta = Math.min(.05, (now - last) / 1000); last = now;
      const { reducedMotion: gentle, intensity: manual, autoEnergy: auto, energyDirector: director } = settings.current;
      const strength = director?.sample(now, manual, auto, gentle) ?? manual;
      element.dataset.energy = strength.toFixed(3);
      const signal = player.current?.sample();
      const smoothing = 1 - Math.exp(-delta * 7);
      bass += ((signal?.low ?? 0) - bass) * smoothing;
      energy += ((signal?.mid ?? 0) - energy) * smoothing;
      high += ((signal?.high ?? 0) - high) * smoothing;
      clock += delta * (gentle ? .08 : .6 + strength * .5);
      const active = mode === "geometry" ? ["galaxy", "hyperspace", "crystals"][Math.floor(clock / 22) % 3] : mode;
      element.dataset.scene = active;
      const pulse = gentle ? 0 : bass * strength;
      stageUniforms.time.value = clock; stageUniforms.drive.value = pulse;
      stageUniforms.variant.value = active === "galaxy" ? 0 : active === "hyperspace" ? 1 : 2;
      bloom.strength = gentle ? .5 : .85 + pulse * .5;
      pointsMaterial.size = .45 + (gentle ? 0 : high * strength * .7);
      pointsMaterial.opacity = active === "galaxy" ? .75 : .22;
      points.rotation.z = clock * .045; points.rotation.y = Math.sin(clock * .08) * .25;
      if (active === "galaxy") {
        for (let i = 0; i < count; i++) {
          positions[i * 3 + 2] += delta * (gentle ? .3 : 3 + energy * strength * 8);
          if (positions[i * 3 + 2] > 30) positions[i * 3 + 2] = -55;
        }
        pointsGeometry.attributes.position.needsUpdate = true;
      }
      rings.forEach((ring, i) => {
        ring.visible = active === "hyperspace";
        ring.position.z = 27 - ((i * 5 - clock * (8 + pulse * 9) + 15000) % 150);
        ring.rotation.z = clock * .12 + i * (.17 + Math.sin(clock * .12) * .08);
        ring.scale.setScalar(1 + pulse * .2);
        ring.material.color.setHSL((hue + i * .015 + clock * .008) % 1, .9, .62);
      });
      shards.forEach((mesh, i) => {
        mesh.visible = active === "crystals";
        const angle = mesh.userData.phase + clock * mesh.userData.speed;
        const radius = mesh.userData.radius;
        mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.3) * radius * .55, Math.sin(angle * .7) * 7 - 7);
        mesh.rotation.set(clock * .18 + i, clock * .23 + i * .5, clock * .09);
        mesh.scale.setScalar((i === 0 ? 4.6 : .7 + i % 3 * .18) * (1 + pulse * .35));
      });
      camera.position.x = Math.sin(clock * .1) * .8;
      camera.position.y = Math.cos(clock * .13) * .5; camera.lookAt(0, 0, -8);
      composer.render(); gate.submitted();
    };
    animate();
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      pointsGeometry.dispose(); pointsMaterial.dispose(); texture.dispose();
      backgroundGeometry.dispose(); backgroundMaterial.dispose(); bloom.dispose(); outputPass.dispose(); renderPass.dispose(); composer.dispose();
      [...rings, ...shards].forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
      gate.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [mode, seed, player]);
  return <div className="performance-canvas shape-canvas" ref={host} role="img" aria-label={`${visualModes[mode]} music visualization`} />;
}
