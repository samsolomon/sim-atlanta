const realImmediate = setImmediate; // kept, in case a test leaves fake timers installed

/** One turn of the event loop. A long synchronous test awaits this between its steps, so Vitest's
 * worker hears its parent: the messages have a fixed 60 s limit (see test-setup.ts). */
export const turn = () => new Promise<void>(resolve => { realImmediate(resolve); });
