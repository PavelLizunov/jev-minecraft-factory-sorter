import React from 'react';
import { Volume2, VolumeX, HelpCircle } from 'lucide-react';

export default function Header({ isMuted, toggleSound, health, count, onOpenAbout }) {
  return (
    <header className="app-header">
      <div className="brand">
        <img
          src="/favicon.svg"
          alt="Jev Factory Core"
          className="brand-logo-img pixelated"
          width="36"
          height="36"
        />
        <div>
          <h1>Jev <span>Minecraft Factory Sorter</span></h1>
          <p>Modded materials & mobs. Typed decisions. 6 storage branches.</p>
        </div>
      </div>
      <div className="header-right">
        <span className="header-caption">WORKSHOP / 01</span>
        <span className="catalog-count mono">{count ? `${count} blocks & mobs` : 'Loading catalog'}</span>
        <span className={`connection ${['ready', 'configured'].includes(health) ? '' : 'is-warning'}`}>
          <i />
          {health === 'ready' ? 'Jev connected' : health === 'configured' ? 'Jev configured' : health === 'loading' ? 'Connecting' : 'Jev unavailable'}
        </span>
        <button
          className="guide-button"
          onClick={onOpenAbout}
          aria-label="Open Factory Guide"
          title="What is this showcase?"
        >
          <HelpCircle size={15} />
          <span className="hidden sm:inline">Guide</span>
        </button>
        <button
          className="icon-button"
          onClick={toggleSound}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          title={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>
    </header>
  );
}
