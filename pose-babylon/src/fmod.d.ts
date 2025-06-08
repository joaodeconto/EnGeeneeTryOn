export namespace FMOD {
    namespace Studio {
      /** the actual exported factory function */
      function System_create(): Promise<System>;
      interface System {
        /** get the low-level core system */
        getCoreSystem(): Promise<any>;
        initialize(maxChannels: number, studioFlags: number, coreFlags: number, extra: any): Promise<void>;
        loadBankFile(path: string, flags: number): Promise<Bank>;
        getEvent(path: string): Promise<EventDescription>;
      }
      const INITFLAGS: { NORMAL: number };
      const LOAD_BANK_FLAGS: { NORMAL: number };
      interface Bank { /* … */ }
      interface EventDescription {
        createInstance(): Promise<EventInstance>;
      }
      interface EventInstance {
        start(): Promise<void>;
        release(): Promise<void>;
      }
    }
    const INITFLAGS: { NORMAL: number };
  }

declare global {
    interface Window {
        FMOD: typeof FMOD;
    }
}

export {}
  