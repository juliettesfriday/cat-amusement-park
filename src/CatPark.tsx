'use client';
import { useEffect, useRef, useState } from 'react';
import { CarFront, Cat, Cloud, Coffee, FerrisWheel, Moon, RotateCcw, Sparkles, Sun } from 'lucide-react';
import type { ParkAPI, RideId, ParkState } from './world';
import NightClock from './NightClock';
import './park.css';

const rides = [
  { id: 'wheel' as const, name: '摩天轮', Icon: FerrisWheel },
  { id: 'carousel' as const, name: '旋转木马', Icon: Sparkles },
  { id: 'cars' as const, name: '碰碰车', Icon: CarFront },
  { id: 'teacups' as const, name: '糖果转转杯', Icon: Coffee },
  { id: 'balloon' as const, name: '云朵热气球', Icon: Cloud },
];
export default function CatPark() {
  const mount = useRef<HTMLDivElement>(null);
  const api = useRef<ParkAPI | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [night, setNight] = useState(false);
  const [nightTransition, setNightTransition] = useState<'idle' | 'clock' | 'revealing'>('idle');
  const changingTime = nightTransition !== 'idle';
  const nightPreference = useRef(false);
  const [state, setState] = useState<ParkState>({ active: null, visited: [], moving: false, balloonPhase: 'ground' });
  useEffect(() => {
    let cancelled = false;
    import('./world').then(({ createPark }) => {
      if (cancelled || !mount.current) return;
      api.current = createPark(mount.current, {
        onReady: () => setReady(true), onError: setError, onState: setState,
      });
      api.current.setNight(nightPreference.current);
    }).catch(() => setError('乐园暂时没能打开，请刷新后再试一次。'));
    return () => { cancelled = true; api.current?.dispose(); api.current = null; };
  }, []);
  useEffect(() => { nightPreference.current = night; api.current?.setNight(night); }, [night, ready]);
  useEffect(() => {
    if (nightTransition === 'idle') return;
    const timer = window.setTimeout(() => {
      if (nightTransition === 'clock') {
        setNight(true);
        setNightTransition('revealing');
      } else setNightTransition('idle');
    }, nightTransition === 'clock' ? 2000 : 350);
    return () => window.clearTimeout(timer);
  }, [nightTransition]);
  function toggleNight() {
    if (changingTime) return;
    if (night) setNight(false);
    else setNightTransition('clock');
  }
  function visit(id: RideId) { api.current?.visit(id); }
  return (
    <main className={`cat-park ${night ? 'park-night' : ''}`} data-night-transition={nightTransition}>
      <div className="park-sky" aria-hidden="true" />
      <div className="park-world" data-balloon-phase={state.balloonPhase} ref={mount} inert={changingTime} tabIndex={0} role="application" aria-label="猫猫游园会。移动鼠标引导小猫，触屏点击地面，或用方向键移动。下方图标可带小猫前往游乐设施。" />
      <header className="park-heading"><h1>猫猫游园会</h1></header>
      <div className="park-tools">
        <button className="park-icon-button" onClick={toggleNight} disabled={changingTime} aria-busy={changingTime} aria-label={night ? '切换到白天' : '切换到夜晚'} aria-pressed={night}>{night ? <Moon size={20}/> : <Sun size={20}/>}</button>
        <button className="park-icon-button" onClick={() => api.current?.reset()} disabled={changingTime} aria-label="回到入口，重新散步"><RotateCcw size={19}/></button>
      </div>
      {!ready && !error && <div className="park-loading" role="status" aria-label="乐园正在准备"><Cat size={34}/></div>}
      {error && <div className="park-error" role="alert"><p>{error}</p><button className="park-icon-button" onClick={() => window.location.reload()} aria-label="重新打开乐园"><RotateCcw size={20}/></button></div>}
      {ready && <nav className="park-ride-nav" aria-label="带猫猫前往游乐设施">{rides.map(({id, name, Icon}) => <button key={id} onClick={() => visit(id)} className={state.active === id ? 'is-lit' : ''} aria-label={`带猫猫走到${name}`} aria-pressed={state.active === id} aria-busy={id === 'balloon' && state.balloonPhase !== 'ground'} disabled={changingTime || (state.balloonPhase !== 'ground' && id !== 'balloon')}><Icon size={24} strokeWidth={1.5}/><span className={state.visited.includes(id) ? 'park-ride-dot found' : 'park-ride-dot'} aria-hidden="true"/></button>)}</nav>}
      {changingTime && <NightClock revealing={nightTransition === 'revealing'} />}
    </main>
  );
}
