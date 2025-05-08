// src/fmodManager.ts
declare global {
    interface Window { FMOD: any; }
  }
  const FMOD = window.FMOD;        // ← grab the global
  //const Module = window.Module!;   // ← (only if you need Module)
  
  export class FmodManager {
    private studio!: any;
    private core!: any;
  
    /** Call once, after user gesture *and* after the FMOD runtime is ready */
    public async initialize(): Promise<void> {
      if (!FMOD) throw new Error('FMOD runtime not loaded');
      this.studio = await FMOD.Studio.System_create();
      this.core   = await this.studio.getCoreSystem();
      await this.studio.initialize(
        1024,
        FMOD.Studio.INITFLAGS.NORMAL,
        FMOD.INITFLAGS.NORMAL,
        null
      );
      await this.loadBank('Master.bank');
      await this.loadBank('Interactions.bank');
    }
  
    private async loadBank(name: string) {
      return this.studio.loadBankFile(`/Fmod/${name}`, FMOD.Studio.LOAD_BANK_FLAGS.NORMAL);
    }
  
    public async playOneShot(eventPath: string) {
      const desc = await this.studio.getEvent(eventPath);
      const inst = await desc.createInstance();
      await inst.start();
      await inst.release();
    }
  }
  