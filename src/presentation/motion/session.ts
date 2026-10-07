// A session owns one listener/watchdog; invalidate async continuations on cleanup.
export function startMotionSession<T>(o: {
 available: () => Promise<boolean>;
 subscribe: (receive: (sample: T) => void) => { remove: () => void };
 valid: (sample: T) => boolean; receive: (sample: T) => void;
 status: (available: boolean) => void; reset: () => void; staleMs: number;
}) {
 let cancelled = false;
 let subscription: { remove: () => void } | undefined;
 let timer: ReturnType<typeof setTimeout> | undefined;
 const stop = () => { subscription?.remove(); subscription = undefined; clearTimeout(timer); o.reset(); };
 const arm = () => {
  clearTimeout(timer);
  timer = setTimeout(() => { if (!cancelled) { cancelled = true; stop(); o.status(false); } }, o.staleMs);
 };
 o.reset();
 void o.available().then((available) => {
  if (cancelled) return;
  if (!available) { o.status(false); return; }
  arm();
  subscription = o.subscribe((sample) => {
   if (cancelled || !o.valid(sample)) return;
   arm(); o.status(true); o.receive(sample);
  });
 }).catch(() => { if (!cancelled) { stop(); o.status(false); } });
 return () => { cancelled = true; stop(); };
}
