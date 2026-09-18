import React, { useState, useEffect } from 'react';

const scenes = [
  { id: 'scene-hero', label: '01', title: 'INTRO' },
  { id: 'scene-brand', label: '02', title: 'HERITAGE' },
  { id: 'scene-celestial', label: '03', title: 'CELESTIAL' },
  { id: 'scene-eclipse', label: '04', title: 'ANATOMY' },
  { id: 'scene-craft', label: '05', title: 'CREATION' },
  { id: 'scene-gemstone', label: '06', title: 'ELEMENTS' },
  { id: 'scene-showcase', label: '07', title: 'SHOWCASE' },
  { id: 'scene-curtain', label: '08', title: 'CURATOR' },
  { id: 'scene-bespoke', label: '09', title: 'BESPOKE' },
  { id: 'scene-final', label: '10', title: 'LEGACY' }
];

const SceneProgress = () => {
  const [activeScene, setActiveScene] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight * 0.35;

      for (let i = scenes.length - 1; i >= 0; i--) {
        const el = document.getElementById(scenes[i].id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveScene(scenes[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSceneClick = (id) => {
    const el = document.getElementById(id);
    if (el) {
      if (window.lenis) {
        window.lenis.scrollTo(el, { offset: -70 });
      } else {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <aside className="scene-progress-nav" aria-label="Scene progress navigation">
      <div className="scene-progress-inner">
        {scenes.map((scene) => {
          const isActive = activeScene === scene.id;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => handleSceneClick(scene.id)}
              className={`scene-dot-btn ${isActive ? 'scene-active' : ''}`}
              title={`${scene.label} ${scene.title}`}
              aria-label={`Scroll to scene ${scene.label}: ${scene.title}`}
            >
              <span className="scene-bar" />
              <span className="scene-tag-text">{scene.title}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default SceneProgress;
