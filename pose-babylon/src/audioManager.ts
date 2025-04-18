export class AudioManager {
    private bgAudio: HTMLAudioElement;
    private sfxClick: HTMLAudioElement;
    private isMuted: boolean = false;
  
    constructor(bgPath: string, clickPath: string) {
      this.bgAudio = new Audio(bgPath);
      this.bgAudio.loop = true;
      this.bgAudio.volume = 0.5;
  
      this.sfxClick = new Audio(clickPath);
      this.sfxClick.volume = 1.0;
    }
  
    playBgMusic() {
      if (!this.isMuted) {
        this.bgAudio.play().catch(err => console.warn("BG Music play failed:", err));
      }
    }
  
    pauseBgMusic() {
      this.bgAudio.pause();
    }
  
    playClickSfx() {
      if (!this.isMuted) {
        this.sfxClick.currentTime = 0;
        this.sfxClick.play().catch(err => console.warn("SFX play failed:", err));
      }
    }
  
    mute() {
      this.isMuted = true;
      this.bgAudio.muted = true;
      this.sfxClick.muted = true;
    }
  
    unmute() {
      this.isMuted = false;
      this.bgAudio.muted = false;
      this.sfxClick.muted = false;
    }
  
    toggleMute() {
      this.isMuted ? this.unmute() : this.mute();
    }
  
    setVolume(bgVol: number, sfxVol: number) {
      this.bgAudio.volume = bgVol;
      this.sfxClick.volume = sfxVol;
    }
  }
  