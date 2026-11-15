import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Billboard, OrbitControls } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Controls } from "../types";

export const BASE_TEXTURE = "textures/blue-marble.jpg";

interface GlobeProps {
  textureUrl: string; // equirectangular image
  controls: Controls;
  energy: number; // 0..1 from the current frame
  level: () => number; // live audio loudness
  spectrum: () => Float32Array; // live spectrum, 0..1
  step: () => number; // step currently sounding, 0..7
  melody: (string | null)[]; // which of the 8 steps carry a note
  playing: boolean;
  accent: string; // CSS colour of the current frame
  reducedMotion: boolean;
  onView: (lat: number, lon: number) => void; // point of the planet facing the viewer
}

const atmosphereShader = {
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uIntensity;
    varying vec3 vNormal;
    void main() {
      float rim = pow(0.75 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
      gl_FragColor = vec4(uColor, clamp(rim * uIntensity, 0.0, 1.0));
    }`,
};

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();

/** Loads textures without suspending, so the globe keeps the previous frame until the next is ready. */
function useSmoothTexture(url: string, fallback: THREE.Texture) {
  const [tex, setTex] = useState<THREE.Texture>(() => cache.get(url) ?? fallback);
  useEffect(() => {
    let alive = true;
    const hit = cache.get(url);
    if (hit) return setTex(hit);
    loader.load(url, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      cache.set(url, t);
      if (alive) setTex(t);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return tex;
}

function Planet({ textureUrl, controls, energy, level, reducedMotion, onView }: GlobeProps) {
  const camera = useThree((s) => s.camera);
  const facing = useMemo(() => new THREE.Vector3(), []);
  const sinceReport = useRef(0);
  const base = useLoader(THREE.TextureLoader, BASE_TEXTURE);
  base.colorSpace = THREE.SRGBColorSpace;
  const texture = useSmoothTexture(textureUrl, base);
  const earth = useRef<THREE.Mesh>(null);
  const material = useRef<THREE.MeshStandardMaterial>(null);
  const uniforms = useMemo(() => ({ uColor: { value: new THREE.Color("#4da6ff") }, uIntensity: { value: 1 } }), []);
  const cool = useMemo(() => new THREE.Color("#3a9ad9"), []);
  const warm = useMemo(() => new THREE.Color("#e2542d"), []);

  useFrame((_, dt) => {
    const loud = level();
    // Sound -> planet: tempo drives rotation, loudness makes the atmosphere pulse,
    // warmth tints the planet and its atmosphere (cool blue <-> overheated orange).
    if (earth.current) earth.current.rotation.y += dt * (controls.tempo / (reducedMotion ? 2400 : 600));
    sinceReport.current += dt;
    if (earth.current && sinceReport.current > 0.6) {
      sinceReport.current = 0;
      earth.current.worldToLocal(facing.copy(camera.position)).normalize();
      onView(THREE.MathUtils.radToDeg(Math.asin(facing.y)), THREE.MathUtils.radToDeg(Math.atan2(-facing.z, facing.x)));
    }
    // The halo follows the wave: taller wave (more energy) = thicker, warmer glow. It is a visual cue only;
    // the surface of the planet always shows NASA imagery, never an invented effect.
    uniforms.uColor.value.copy(cool).lerp(warm, controls.energy * controls.energy);
    uniforms.uIntensity.value = 0.55 + controls.energy * 0.9 + loud * 2 + energy * 0.3;
    if (material.current) {
      material.current.emissiveIntensity = 0.35 + loud * 0.5;
    }
  });

  return (
    <group>
      {/* start with the Americas and the Atlantic facing the viewer */}
      <mesh ref={earth} rotation={[0, -0.9, 0]}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshStandardMaterial ref={material} map={texture} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.15} roughness={0.9} />
      </mesh>
      <mesh scale={1.16}>
        <sphereGeometry args={[2, 64, 64]} />
        <shaderMaterial args={[atmosphereShader]} uniforms={uniforms} side={THREE.BackSide} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

const BARS = 96;
const STEPS = 8;
const SEG = (Math.PI * 2) / STEPS;
const GAP = 0.06;

/**
 * The "record needle": 8 arcs = the 8 steps of the melody (clockwise from the top),
 * surrounded by a circular spectrum of the live audio.
 */
function SoundRing(props: GlobeProps) {
  const { spectrum, step, melody, playing, accent } = props;
  const bars = useRef<THREE.InstancedMesh>(null);
  const arcs = useRef<(THREE.Mesh | null)[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const data = spectrum();
    if (bars.current) {
      for (let i = 0; i < BARS; i++) {
        const k = i < BARS / 2 ? i : BARS - 1 - i; // mirror left/right
        const v = data[Math.floor((k / (BARS / 2)) * data.length * 0.75)] ?? 0;
        const len = 0.03 + v * 0.5 + props.controls.energy * 0.06;
        const a = (i / BARS) * Math.PI * 2 + Math.PI / 2;
        const r = 2.7 + len / 2;
        dummy.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
        dummy.rotation.set(0, 0, a);
        dummy.scale.set(len, 1, 1);
        dummy.updateMatrix();
        bars.current.setMatrixAt(i, dummy.matrix);
      }
      bars.current.instanceMatrix.needsUpdate = true;
    }
    const now = step();
    arcs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const active = playing && i === now;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = active ? 1 : melody[i] ? 0.45 : 0.12;
      mat.color.set(active ? "#e2542d" : accent);
      mesh.scale.setScalar(active ? 1.025 : 1);
    });
  });

  return (
    <Billboard>
      {Array.from({ length: STEPS }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            arcs.current[i] = m;
          }}
          rotation={[0, 0, Math.PI / 2 - (i + 1) * SEG + GAP / 2]}
        >
          <torusGeometry args={[2.55, 0.022, 8, 32, SEG - GAP]} />
          <meshBasicMaterial color={accent} transparent opacity={0.2} toneMapped={false} />
        </mesh>
      ))}
      <instancedMesh ref={bars} args={[undefined, undefined, BARS]}>
        <boxGeometry args={[1, 0.022, 0.01]} />
        <meshBasicMaterial color={accent} transparent opacity={0.85} toneMapped={false} />
      </instancedMesh>
    </Billboard>
  );
}

/** Keeps the whole ring visible on narrow (portrait) screens. */
function FitCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    camera.position.setLength(7.8 * Math.max(1, 1.15 / aspect));
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

export default function Globe(props: GlobeProps) {
  return (
    <Canvas camera={{ position: [0, 2.4, 7.4], fov: 45 }} aria-hidden="true">
      <FitCamera />
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 3, 5]} intensity={2.2} />
      <Suspense fallback={null}>
        <Planet {...props} />
      </Suspense>
      <SoundRing {...props} />
      <OrbitControls enablePan={false} minDistance={5} maxDistance={18} />
    </Canvas>
  );
}
