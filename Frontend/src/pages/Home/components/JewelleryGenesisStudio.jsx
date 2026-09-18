import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { motion, useScroll } from 'framer-motion';
import { Sparkles, Eye, Palette, Flame, Layers, RotateCcw, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import './JewelleryGenesisStudio.css';

// Metal Themes Configuration
export const METAL_THEMES = [
  {
    id: 'yellow-gold',
    name: '22K Royal Gold',
    karat: '916 Fine Gold',
    colorHex: '#d4af37',
    threeColor: 0xd4af37,
    roughness: 0.12,
    metalness: 0.96,
    clearcoat: 0.6,
    glowColor: 'rgba(212, 175, 55, 0.45)'
  },
  {
    id: 'rose-gold',
    name: '18K Rose Gold',
    karat: '750 Blush Alloy',
    colorHex: 'var(--bg-light-brand)',
    threeColor: 0xdf9b8b,
    roughness: 0.14,
    metalness: 0.94,
    clearcoat: 0.7,
    glowColor: 'rgba(224, 168, 153, 0.45)'
  },
  {
    id: 'platinum-silver',
    name: 'Platinum / Silver',
    karat: '950 Pure Luster',
    colorHex: 'var(--bg-light-brand)',
    threeColor: 0xe4eaf2,
    roughness: 0.10,
    metalness: 0.98,
    clearcoat: 0.8,
    glowColor: 'rgba(228, 234, 242, 0.5)'
  }
];

const PHASES = [
  { id: 'crucible', number: '01', title: 'The Molten Crucible', subtitle: 'Foundry Induction at 1064°C', desc: 'Pure gold melts into glowing liquid energy inside our vacuum induction furnace, purged of microscopic porosity.', icon: Flame, color: '#ff9922' },
  { id: 'convergence', number: '02', title: 'Convergence of Elements', subtitle: 'Gold • Silver • Diamonds', desc: 'Streams of liquid 22K gold, pure silver alloys, and crystalline diamond facets swirl into a harmonic vortex.', icon: Layers, color: '#d4af37' },
  { id: 'assembly', number: '03', title: '3D Masterpiece Assembly', subtitle: 'Precision Solidification & Prongs', desc: 'The ring band solidifies with calibrated density, six micro-prongs lock, and the diamond crown is placed with an optical flare.', icon: Sparkles, color: 'var(--brand-primary)' },
  { id: 'wearable', number: '04', title: 'Interactive Wearable Studio', subtitle: 'Virtual Try-On & Metal Theme', desc: 'Rotate 360° in 3D, switch metal color themes in real time, and preview the masterpiece worn on a luxury hand mannequin.', icon: Eye, color: 'var(--brand-primary)' }
];

const JewelleryGenesisStudio = ({ onInquireDesign }) => {
  const containerRef = useRef(null);
  const mountRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [selectedMetal, setSelectedMetal] = useState(METAL_THEMES[0]);
  const [isWearingOnHand, setIsWearingOnHand] = useState(false);
  const [isUserDragging, setIsUserDragging] = useState(false);

  // Refs that need to be accessed in the animation loop without stale closures
  const selectedMetalRef = useRef(selectedMetal);
  const isWearingRef = useRef(isWearingOnHand);
  const isDraggingRef = useRef(false);

  useEffect(() => { selectedMetalRef.current = selectedMetal; }, [selectedMetal]);
  useEffect(() => { isWearingRef.current = isWearingOnHand; }, [isWearingOnHand]);

  // Scroll phase tracker
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      if (v < 0.25) setActivePhaseIndex(0);
      else if (v < 0.52) setActivePhaseIndex(1);
      else if (v < 0.78) setActivePhaseIndex(2);
      else setActivePhaseIndex(3);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  // Store Three.js refs
  const threeRef = useRef(null);

  // Metal theme change -> update Three.js materials
  useEffect(() => {
    if (!threeRef.current) return;
    const { ringBandMat, prongMat } = threeRef.current;
    if (ringBandMat) {
      ringBandMat.color.setHex(selectedMetal.threeColor);
      ringBandMat.roughness = selectedMetal.roughness;
      ringBandMat.metalness = selectedMetal.metalness;
      ringBandMat.clearcoat = selectedMetal.clearcoat;
    }
    if (prongMat) {
      prongMat.color.setHex(selectedMetal.threeColor);
      prongMat.roughness = selectedMetal.roughness;
      prongMat.metalness = selectedMetal.metalness;
    }
  }, [selectedMetal]);

  // Wear-on-hand toggle -> update mannequin visibility
  useEffect(() => {
    if (!threeRef.current) return;
    const { mannequinHandGroup, ringGroup } = threeRef.current;
    if (mannequinHandGroup) mannequinHandGroup.visible = isWearingOnHand;
    if (ringGroup) {
      if (isWearingOnHand) {
        ringGroup.position.set(0, 0.4, 0.3);
      } else {
        ringGroup.position.set(0, 0, 0);
      }
    }
  }, [isWearingOnHand]);

  // =========================================================================
  // MAIN THREE.JS INITIALIZATION
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Use window dimensions as fallback — the sticky container should have 100vh
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    if (width === 0 || height === 0) return; // guard against 0 dimension

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1, 11);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // ---- LIGHTING RIG ----
    scene.add(new THREE.AmbientLight(0xfff6e8, 1.6));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const warmFill = new THREE.DirectionalLight(0xffdf88, 2.0);
    warmFill.position.set(-5, -2, 4);
    scene.add(warmFill);

    const diamondLight = new THREE.PointLight(0xffffff, 3.0, 12);
    diamondLight.position.set(0, 3.5, 3);
    scene.add(diamondLight);

    const rimLight = new THREE.DirectionalLight(0xa5c99e, 1.5);
    rimLight.position.set(0, 4, -8);
    scene.add(rimLight);

    // ---- RING GROUP (Band + Diamond + Prongs + Pavé) ----
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Ring Band
    const ringBandGeo = new THREE.TorusGeometry(2.3, 0.38, 48, 128);
    const ringBandMat = new THREE.MeshPhysicalMaterial({
      color: METAL_THEMES[0].threeColor,
      metalness: 0.96,
      roughness: 0.12,
      clearcoat: 0.6,
      clearcoatRoughness: 0.08,
      reflectivity: 0.98,
      envMapIntensity: 1.0
    });
    const ringBandMesh = new THREE.Mesh(ringBandGeo, ringBandMat);
    ringBandMesh.rotation.x = Math.PI / 2;
    ringGroup.add(ringBandMesh);

    // Diamond (brilliant-cut)
    const diamondGeo = new THREE.OctahedronGeometry(0.85, 2);
    diamondGeo.scale(1.1, 1.4, 1.1);
    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.01,
      transmission: 0.92,
      ior: 2.42,
      thickness: 1.5,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      clearcoat: 1.0
    });
    const diamondMesh = new THREE.Mesh(diamondGeo, diamondMat);
    diamondMesh.position.set(0, 2.75, 0);
    ringGroup.add(diamondMesh);

    // Prongs (6)
    const prongsGroup = new THREE.Group();
    prongsGroup.position.set(0, 2.5, 0);
    const prongGeo = new THREE.CylinderGeometry(0.055, 0.075, 0.85, 12);
    const prongMat = new THREE.MeshPhysicalMaterial({
      color: METAL_THEMES[0].threeColor,
      metalness: 0.96,
      roughness: 0.12,
      clearcoat: 0.5
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const prong = new THREE.Mesh(prongGeo, prongMat);
      prong.position.set(Math.cos(angle) * 0.52, 0.08, Math.sin(angle) * 0.52);
      prong.rotation.z = -Math.cos(angle) * 0.2;
      prong.rotation.x = Math.sin(angle) * 0.2;
      prongsGroup.add(prong);
    }
    ringGroup.add(prongsGroup);

    // Pavé Diamonds
    const paveDiamondsGroup = new THREE.Group();
    const paveGeo = new THREE.OctahedronGeometry(0.13, 1);
    const paveMat = diamondMat.clone();
    [-1, 1].forEach(side => {
      for (let j = 0; j < 3; j++) {
        const pave = new THREE.Mesh(paveGeo, paveMat);
        const theta = (j * 0.19 + 0.35) * side;
        pave.position.set(Math.sin(theta) * 2.3, Math.cos(theta) * 2.3, 0);
        paveDiamondsGroup.add(pave);
      }
    });
    ringGroup.add(paveDiamondsGroup);

    // ---- CRUCIBLE (Phase 1) ----
    const crucibleGroup = new THREE.Group();
    scene.add(crucibleGroup);

    const poolGeo = new THREE.CylinderGeometry(3, 2.4, 0.7, 32);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff5500, emissiveIntensity: 2.0, roughness: 0.3 });
    const poolMesh = new THREE.Mesh(poolGeo, poolMat);
    poolMesh.position.set(0, -3.6, 0);
    crucibleGroup.add(poolMesh);

    // Ember particles
    const EMBER_COUNT = 200;
    const emberPositions = new Float32Array(EMBER_COUNT * 3);
    const emberSpeeds = new Float32Array(EMBER_COUNT);
    for (let i = 0; i < EMBER_COUNT; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 5;
      emberPositions[i * 3 + 1] = -3.5 + Math.random() * 6;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      emberSpeeds[i] = Math.random() * 0.035 + 0.012;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({ color: 0xffaa22, size: 0.2, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const emberParticles = new THREE.Points(emberGeo, emberMat);
    crucibleGroup.add(emberParticles);

    // ---- CONVERGENCE STREAMS (Phase 2) ----
    const streamsGroup = new THREE.Group();
    scene.add(streamsGroup);

    const makeStream = (count, color, size) => {
      const pos = new Float32Array(count * 3);
      for (let s = 0; s < count; s++) {
        const t = s / count;
        const a = t * Math.PI * 8;
        const r = (1 - t) * 5 + 0.6;
        pos[s * 3] = Math.cos(a) * r;
        pos[s * 3 + 1] = t * 7 - 3.5;
        pos[s * 3 + 2] = Math.sin(a) * r;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      return new THREE.Points(geo, mat);
    };

    const goldStream = makeStream(200, 0xd4af37, 0.2);
    const silverStream = makeStream(160, 0xe0e6ed, 0.18);
    const diamondStream = makeStream(130, 0xffffff, 0.24);
    streamsGroup.add(goldStream, silverStream, diamondStream);

    // ---- MANNEQUIN HAND (Phase 4 wear mode) ----
    const mannequinHandGroup = new THREE.Group();
    mannequinHandGroup.visible = false;
    scene.add(mannequinHandGroup);

    const fingerGeo = new THREE.CylinderGeometry(1.95, 1.85, 10, 32);
    const fingerMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd9, roughness: 0.7, metalness: 0.05 });
    const fingerMesh = new THREE.Mesh(fingerGeo, fingerMat);
    fingerMesh.rotation.z = Math.PI / 2;
    mannequinHandGroup.add(fingerMesh);

    const palmGeo = new THREE.BoxGeometry(5, 7.5, 0.7);
    const palmMesh = new THREE.Mesh(palmGeo, fingerMat);
    palmMesh.position.set(-5, -0.3, -0.2);
    palmMesh.rotation.z = 0.12;
    mannequinHandGroup.add(palmMesh);

    // ---- STORE REFS ----
    threeRef.current = { scene, camera, renderer, ringGroup, ringBandMesh, ringBandMat, prongMat, diamondMesh, prongsGroup, paveDiamondsGroup, crucibleGroup, streamsGroup, mannequinHandGroup, diamondLight };

    // ---- POINTER DRAG FOR 360° ORBIT ----
    let targetRotX = 0, targetRotY = 0, userRotX = 0, userRotY = 0;
    let isPointerDown = false, prevPX = 0, prevPY = 0;

    const onPointerDown = (e) => {
      isPointerDown = true;
      isDraggingRef.current = true;
      setIsUserDragging(true);
      prevPX = e.clientX;
      prevPY = e.clientY;
    };
    const onPointerMove = (e) => {
      if (!isPointerDown) return;
      targetRotY += (e.clientX - prevPX) * 0.008;
      targetRotX += (e.clientY - prevPY) * 0.006;
      targetRotX = Math.max(-1, Math.min(1, targetRotX));
      prevPX = e.clientX;
      prevPY = e.clientY;
    };
    const onPointerUp = () => {
      isPointerDown = false;
      isDraggingRef.current = false;
      setIsUserDragging(false);
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ---- ANIMATION LOOP ----
    let animId;
    const clock = new THREE.Clock();

    // Read scroll progress synchronously via the MotionValue
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const scroll = scrollYProgress.get();

      // Smooth orbit interpolation
      userRotX += (targetRotX - userRotX) * 0.08;
      userRotY += (targetRotY - userRotY) * 0.08;

      // ---- PHASE 1: CRUCIBLE (0 -> 0.28) ----
      if (scroll < 0.28) {
        const p = scroll / 0.28;
        crucibleGroup.visible = true;
        streamsGroup.visible = false;

        // Embers rise
        const pos = emberGeo.attributes.position.array;
        for (let i = 0; i < EMBER_COUNT; i++) {
          pos[i * 3 + 1] += emberSpeeds[i];
          pos[i * 3] += Math.sin(t * 2.5 + i) * 0.008;
          if (pos[i * 3 + 1] > 3) pos[i * 3 + 1] = -3.5;
        }
        emberGeo.attributes.position.needsUpdate = true;
        emberMat.opacity = Math.max(0, 1 - p * 0.8);

        // Pool pulses
        poolMat.emissiveIntensity = 1.6 + Math.sin(t * 3) * 0.5;

        // Ring fades in from crucible
        ringGroup.scale.setScalar(0.1 + p * 0.3);
        ringGroup.position.y = -2.5 + p * 2.5;
        ringGroup.rotation.y = t * 0.3;
        ringBandMat.transparent = true;
        ringBandMat.opacity = p * 0.5;
        diamondMesh.visible = false;
        prongsGroup.visible = false;
        paveDiamondsGroup.visible = false;
      }
      // ---- PHASE 2: CONVERGENCE (0.28 -> 0.55) ----
      else if (scroll < 0.55) {
        const p = (scroll - 0.28) / 0.27;
        crucibleGroup.visible = false;
        streamsGroup.visible = true;

        // Streams spiral and contract
        goldStream.rotation.y = t * 1.2 + p * Math.PI * 4;
        silverStream.rotation.y = -t * 1.5 - p * Math.PI * 3;
        diamondStream.rotation.y = t * 2 + p * Math.PI * 5;
        const contractS = Math.max(0.15, 1.2 - p * 1.0);
        streamsGroup.scale.setScalar(contractS);

        // Ring grows
        ringGroup.scale.setScalar(0.4 + p * 0.45);
        ringGroup.position.y = 0;
        ringGroup.rotation.y = t * 0.5 + p * Math.PI;
        ringBandMat.transparent = true;
        ringBandMat.opacity = 0.5 + p * 0.5;

        diamondMesh.visible = p > 0.55;
        if (p > 0.55) diamondMesh.scale.setScalar((p - 0.55) / 0.45);
        prongsGroup.visible = p > 0.7;
        paveDiamondsGroup.visible = false;
      }
      // ---- PHASE 3: ASSEMBLY (0.55 -> 0.80) ----
      else if (scroll < 0.80) {
        const p = (scroll - 0.55) / 0.25;
        crucibleGroup.visible = false;
        streamsGroup.visible = p < 0.25;
        if (streamsGroup.visible) streamsGroup.scale.setScalar(0.15 * (1 - p * 4));

        ringGroup.scale.setScalar(0.85 + p * 0.15);
        ringGroup.position.y = 0;
        ringGroup.rotation.y = t * 0.5 + userRotY;
        ringGroup.rotation.x = Math.sin(t * 0.8) * 0.12 + userRotX;
        ringBandMat.transparent = false;
        ringBandMat.opacity = 1.0;

        diamondMesh.visible = true;
        diamondMesh.scale.setScalar(1.0);
        prongsGroup.visible = true;
        paveDiamondsGroup.visible = p > 0.4;

        // Diamond light pulses
        diamondLight.intensity = 2.5 + Math.sin(t * 4) * 1.5;
      }
      // ---- PHASE 4: WEARABLE STUDIO (0.80 -> 1.0) ----
      else {
        crucibleGroup.visible = false;
        streamsGroup.visible = false;

        ringGroup.scale.setScalar(1.0);
        diamondMesh.visible = true;
        diamondMesh.scale.setScalar(1.0);
        prongsGroup.visible = true;
        paveDiamondsGroup.visible = true;
        ringBandMat.transparent = false;
        ringBandMat.opacity = 1.0;

        // Interactive orbit + idle float
        const idleFloat = Math.sin(t * 0.6) * 0.06;
        ringGroup.rotation.y = userRotY + (isDraggingRef.current ? 0 : t * 0.15);
        ringGroup.rotation.x = userRotX + idleFloat;

        if (isWearingRef.current) {
          ringGroup.position.set(0, 0.4, 0.3);
          mannequinHandGroup.rotation.y = ringGroup.rotation.y;
          mannequinHandGroup.rotation.x = ringGroup.rotation.x;
        } else {
          ringGroup.position.set(0, 0, 0);
        }

        diamondLight.intensity = 2.5 + Math.sin(t * 3) * 0.8;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      ringBandGeo.dispose(); ringBandMat.dispose();
      diamondGeo.dispose(); diamondMat.dispose();
      prongGeo.dispose(); prongMat.dispose();
      paveGeo.dispose(); paveMat.dispose();
      poolGeo.dispose(); poolMat.dispose();
      emberGeo.dispose(); emberMat.dispose();
      fingerGeo.dispose(); fingerMat.dispose();
      palmGeo.dispose();
      renderer.dispose();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStepJump = (index) => {
    setActivePhaseIndex(index);
    const targets = [0.05, 0.40, 0.68, 0.92];
    if (containerRef.current) {
      const top = containerRef.current.offsetTop;
      const height = containerRef.current.offsetHeight - window.innerHeight;
      const scrollTo = top + height * targets[index];
      if (window.lenis) {
        window.lenis.scrollTo(scrollTo);
      } else {
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
      }
    }
  };

  const handleResetOrbit = () => {
    // Reset via the threeRef is not possible here since orbit vars are local to useEffect.
    // We trigger a remount-like approach by calling window scroll to re-center.
    if (containerRef.current) {
      const top = containerRef.current.offsetTop;
      const height = containerRef.current.offsetHeight - window.innerHeight;
      const scrollTo = top + height * 0.92;
      if (window.lenis) {
        window.lenis.scrollTo(scrollTo);
      } else {
        window.scrollTo({ top: scrollTo, behavior: 'smooth' });
      }
    }
  };

  return (
    <section ref={containerRef} className="jewellery-genesis-section" id="3d-studio" aria-label="3D Scroll-Driven Jewellery Genesis and Wearable Studio">
      <div className="genesis-sticky-stage">
        {/* Three.js 3D Viewport */}
        <div ref={mountRef} className={`genesis-3d-canvas-wrapper ${isUserDragging ? 'is-dragging' : ''}`} />

        {/* Phase Stepper Pills */}
        <div className="genesis-phase-stepper-bar">
          {PHASES.map((phase, idx) => {
            const Icon = phase.icon;
            return (
              <button key={phase.id} type="button" className={`genesis-phase-btn ${activePhaseIndex === idx ? 'phase-active' : ''}`} onClick={() => handleStepJump(idx)} aria-label={`Jump to ${phase.title}`}>
                <Icon size={14} className="phase-icon" />
                <span className="phase-num">{phase.number}</span>
                <span className="phase-name">{phase.title}</span>
              </button>
            );
          })}
        </div>

        {/* Storytelling Narrative Card (Left) */}
        <motion.div key={PHASES[activePhaseIndex].id} className="genesis-story-narrative-card" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
          <div className="genesis-tag-badge">
            <span className="tag-dot" style={{ backgroundColor: PHASES[activePhaseIndex].color }} />
            <span>PHASE {PHASES[activePhaseIndex].number} • THE CRAFT JOURNEY</span>
          </div>
          <h2 className="genesis-phase-headline font-serif">{PHASES[activePhaseIndex].title}</h2>
          <h4 className="genesis-phase-subhead">{PHASES[activePhaseIndex].subtitle}</h4>
          <p className="genesis-phase-body">{PHASES[activePhaseIndex].desc}</p>
          <div className="genesis-phase-specs">
            <div className="spec-bullet"><ShieldCheck size={14} className="text-brand-accent" /><span>100% Zero-Porosity Casting</span></div>
            <div className="spec-bullet"><ShieldCheck size={14} className="text-brand-accent" /><span>BIS Laser Hallmarked Assay</span></div>
          </div>
        </motion.div>

        {/* Studio Controls (Phase 4) */}
        <div className={`genesis-studio-controls ${activePhaseIndex === 3 ? 'controls-active' : ''}`}>
          <div className="genesis-metal-palette-card">
            <div className="palette-header"><Palette size={14} className="palette-icon" /><span>SELECT METAL FINISH</span></div>
            <div className="metal-buttons-group">
              {METAL_THEMES.map((metal) => (
                <button key={metal.id} type="button" className={`metal-theme-btn ${selectedMetal.id === metal.id ? 'metal-active' : ''}`} onClick={() => setSelectedMetal(metal)} aria-label={`Select ${metal.name}`}>
                  <span className="metal-swatch" style={{ backgroundColor: metal.colorHex, boxShadow: `0 0 10px ${metal.glowColor}` }} />
                  <div className="metal-btn-info">
                    <span className="metal-title">{metal.name}</span>
                    <span className="metal-karat">{metal.karat}</span>
                  </div>
                  {selectedMetal.id === metal.id && <Check size={14} className="metal-check-icon" />}
                </button>
              ))}
            </div>
          </div>

          <div className="genesis-wear-actions-row">
            <button type="button" className={`action-pill-btn ${isWearingOnHand ? 'action-active' : ''}`} onClick={() => setIsWearingOnHand(prev => !prev)}>
              <Eye size={16} /><span>{isWearingOnHand ? 'Studio View' : 'Wear on Hand'}</span>
            </button>
            <button type="button" className="action-pill-btn reset-btn" onClick={handleResetOrbit}>
              <RotateCcw size={15} /><span>Reset View</span>
            </button>
          </div>

          <button type="button" className="btn btn-brand genesis-inquire-cta" onClick={() => onInquireDesign && onInquireDesign({ name: `Solitaire Signature Ring (${selectedMetal.name})`, purity: selectedMetal.karat, category: 'Custom Masterpiece Studio' })}>
            <span>Inquire in {selectedMetal.name}</span>
            <ArrowRight size={16} className="btn-icon" />
          </button>
        </div>

        {/* Drag Hint */}
        <div className="genesis-drag-hint-pill">
          <Sparkles size={13} className="hint-sparkle" />
          <span>Drag to orbit 360° • Scroll to travel the journey</span>
        </div>
      </div>
    </section>
  );
};

export default JewelleryGenesisStudio;
