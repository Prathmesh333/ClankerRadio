"use client";
import { useEffect, useRef, useState, useMemo, type RefObject } from "react";
import { renderSize, DEFAULT_RENDER_QUALITY, type RenderQuality } from "../lib/render-quality";
import { VisualEnergy } from "../lib/visual-energy";
import { ShapeVisual } from "./shape-visual";
import { MilkdropVisual } from "./milkdrop-visual";
import * as THREE from "three";
import { gpuFrameGate } from "../lib/gpu-frame-gate";
import type { VisualAudio } from "../lib/visual-audio";
import { visualModes, shapeModes, type ShapeMode, type VisualMode } from "../lib/visual-modes";

const fragment = `
precision highp float;
uniform vec2 resolution;
uniform float time,bass,energy,detail,theme,seed;
varying vec2 vUv;
vec3 palette(float t){return .5+.5*cos(6.28318*(vec3(.05,.32,.65)+t));}
void main(){
 vec2 p=(vUv-.5)*vec2(resolution.x/resolution.y,1.)*2.;
 float r=length(p),a=atan(p.y,p.x),t=time;
 vec3 col=vec3(.002,.004,.01);
 if(theme<.5){
   vec2 q=p;
   for(int i=0;i<5;i++){
     float fi=float(i),ang=t*.09+fi*1.4;
     q=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*q;
     q+=.22*sin(q.yx*2.3+t*.18+fi+seed*.001);
     float wave=sin(q.x*3.+sin(q.y*2.+t*.23)+fi*.65+t*.3);
     float line=.035/(abs(wave)+.035);
     col+=palette(fi*.09+t*.018+q.y*.06)*line*.45*(.85+energy);
   }
   float field=sin(p.x*2.+t*.5)+sin(p.y*2.7-t*.35)+sin((p.x+p.y)*2.3+t*.25);
   float veil=pow(.5+.5*sin(field+t*.2),3.);
   col+=palette(field*.12+t*.025)*veil*.16;
   col*=exp(-r*.25);
 }else if(theme<1.5){
   for(int i=0;i<9;i++){
     float fi=float(i);
     float y=.32*sin(p.x*1.6+t*.42+fi*.22)+.18*sin(p.x*3.4-t*.3+fi*.3);
     y+=(fi-4.)*.045*(1.+bass*.7);
     float d=abs(p.y-y);
     col+=palette(fi*.045+t*.025+p.x*.06)*(.008/(d+.012))*.32;
   }
   col+=palette(t*.02)*.04*exp(-r);
 }else if(theme<2.5){
   vec2 q=p;
   a=abs(mod(a+t*.06,1.0472)-.5236);
   q=vec2(cos(a),sin(a))*r;
   for(int i=0;i<5;i++){
     float fi=float(i),d=abs(sin(q.x*(3.+fi)+sin(q.y*4.+t*.24)+t*.16+fi));
     col+=palette(fi*.13+t*.025+r*.1)*.008/(d+.025)*(.5+energy*.8);
   }
 }else{
   float depth=1./max(r,.06);
   float turn=a*3.+t*.2+sin(depth*.25-t*.3)*.45;
   float rings=abs(sin(depth*1.5-t*(.7+bass*.12)));
   float spokes=abs(sin(turn*2.));
   float glow=.012/(rings+.035)+.009/(spokes+.04);
   col+=palette(depth*.06+t*.025+a*.03)*glow*.4;
   col*=smoothstep(.035,.18,r)*exp(-r*.25);
 }
 float vignette=1.-smoothstep(.3,1.9,r)*.75;
 col=pow(1.-exp(-col*(2.+detail*1.3)),vec3(.72));
 gl_FragColor=vec4(col*vignette,1.);
}`;

type VisualProps = {
  player: RefObject<VisualAudio | null>; mode: VisualMode; intensity: number; reducedMotion: boolean; seed: number; quality?: RenderQuality; autoEnergy?: boolean; energy?: VisualEnergy;
};

export function PerformanceVisual(input: VisualProps) {
  const [energy] = useState(() => new VisualEnergy());
  const props = { ...input, autoEnergy: input.autoEnergy ?? true, energy };
  if (props.mode === "randomizer") return <RandomizerVisual {...props} key={props.seed} />;
  return <SelectedVisual {...props} />;
}
const effectSequence = ["crystals", "random", "aurora", "hyperspace", "nebula", "galaxy", "solar", "prism"] as const;
function RandomizerVisual(props: VisualProps) {
  const [step, setStep] = useState(0);
  const order = useMemo(() => {
    const result = [...effectSequence]; let state = props.seed >>> 0;
    for (let i = result.length - 1; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = state % (i + 1); [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }, [props.seed]);
  useEffect(() => {
    const next = () => setStep(n => n + 1);
    window.addEventListener("visualizer:next", next);
    return () => window.removeEventListener("visualizer:next", next);
  }, []);
  useEffect(() => {
    if (props.reducedMotion) return;
    const timer = setInterval(() => setStep(n => n + 1), 28000);
    return () => clearInterval(timer);
  }, [props.reducedMotion]);
  const selected = order[step % order.length];
  return <div className="randomizer-stage" data-effect={selected}><SelectedVisual {...props} mode={selected} key={`${step}-${props.seed}`} /></div>;
}
function SelectedVisual(props: VisualProps) {
  if (props.mode === "random") return <MilkdropVisual {...props} />;
  if ((shapeModes as readonly string[]).includes(props.mode)) return <ShapeVisual {...props} mode={props.mode as ShapeMode} />;
  return <ShaderVisual {...props} />;
}

function ShaderVisual({
  player,
  mode,
  intensity,
  autoEnergy = true,
  energy,
  reducedMotion,
  seed,
  quality = DEFAULT_RENDER_QUALITY,
}: {
  player: RefObject<VisualAudio | null>;
  mode: VisualMode;
  intensity: number;
  autoEnergy?: boolean;
  energy?: VisualEnergy;
  reducedMotion: boolean;
  seed: number;
  quality?: RenderQuality;
}) {
  const host = useRef<HTMLDivElement>(null),
    settings = useRef({ mode, intensity, autoEnergy, energy, reducedMotion, seed });
  const resizeRef = useRef<() => void>(() => {}), qualityRef = useRef(quality);
  useEffect(() => { qualityRef.current = quality; resizeRef.current(); }, [quality]);
  useEffect(() => {
    settings.current = { mode, intensity, autoEnergy, energy, reducedMotion, seed };
  }, [mode, intensity, autoEnergy, energy, reducedMotion, seed]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      element.textContent =
        "Enable graphics acceleration to see the visualizer.";
      return () => {
        element.textContent = "";
      };
    }
    const gate = gpuFrameGate(renderer.getContext());
    renderer.setPixelRatio(1);
    element.appendChild(renderer.domElement);
    const uniforms = {
      resolution: { value: new THREE.Vector2(1, 1) },
      time: { value: 0 },
      bass: { value: 0 },
      energy: { value: 0 },
      detail: { value: 1 },
      theme: { value: 0 },
      seed: { value: 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:
        "varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",
      fragmentShader: fragment,
    });
    const geometry = new THREE.PlaneGeometry(2, 2),
      scene = new THREE.Scene();
    scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.Camera();
    const resize = () => {
      const size = renderSize(element.clientWidth, element.clientHeight, qualityRef.current, devicePixelRatio, renderer.capabilities.maxTextureSize);
      renderer.setSize(size.width, size.height, false);
      uniforms.resolution.value.set(size.width, size.height);
      element.dataset.resolution = `${size.width}×${size.height}`;
    };
    resizeRef.current = resize;
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    let frame = 0,
      last = performance.now(),
      clock = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      if (document.hidden || !gate.ready()) return;
      const now = performance.now(),
        delta = Math.min(0.1, (now - last) / 1000);
      last = now;
      const settingsValue = settings.current;
      const signal = player.current?.sample();
      clock += delta * (settingsValue.reducedMotion ? 0.15 : 1);
      uniforms.time.value = clock;
      uniforms.bass.value += ((signal?.low ?? 0) - uniforms.bass.value) * 0.05;
      uniforms.energy.value +=
        ((signal?.mid ?? 0) - uniforms.energy.value) * 0.07;
      const strength = settingsValue.energy?.sample(now, settingsValue.intensity, settingsValue.autoEnergy, settingsValue.reducedMotion) ?? settingsValue.intensity;
      uniforms.detail.value = strength;
      element.dataset.energy = strength.toFixed(3);
      uniforms.theme.value = Math.max(0, ["nebula", "aurora", "prism", "solar"].indexOf(
        settingsValue.mode,
      ));
      uniforms.seed.value = settingsValue.seed % 10000;
      renderer.render(scene, camera); gate.submitted();
    };
    animate();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      material.dispose();
      geometry.dispose();
      gate.dispose(); renderer.dispose(); renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [player]);
  return (
    <>
    <div
      ref={host}
      className="performance-canvas"
      role="img"
      aria-label={`${visualModes[mode]} music visualization`}
    />

    </>
  );
}
