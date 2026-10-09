// A session owns one listener/watchdog; invalidate async continuations on cleanup.
export function startMotionSession<T>(o: {
 available: () => Promise<boolean>;
 subscribe: (receive: (sample: T) => void) => { remove: () => void };
 valid: (sample: T) => boolean; receive: (sample: T) => void;
 status: (available: boolean) => void; reset: () => void; staleMs: number;
 trace?: (event: "checking" | "subscribed" | "sample" | "invalid" | "stale" | "unavailable" | "error" | "stop") => void;
}) {
 let cancelled = false;
 let subscription: { remove: () => void } | undefined;
 let timer: ReturnType<typeof setTimeout> | undefined;
 const stop = () => { subscription?.remove(); subscription = undefined; clearTimeout(timer); o.reset(); };
 const arm = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
   if (!cancelled) { o.reset(); o.status(false); o.trace?.("stale"); }
   // Keep the one foreground listener alive. A real late sample can recover.
   // The watchdog only hides stale cues; it never creates motion or retries.
  }, o.staleMs);
 };
 o.reset();
 o.trace?.("checking");
 void o.available().then((available) => {
  if (cancelled) return;
  if (!available) { o.status(false); o.trace?.("unavailable"); return; }
  arm();
  subscription = o.subscribe((sample) => {
   if (cancelled) return;
   o.trace?.("sample");
   if (!o.valid(sample)) { o.trace?.("invalid"); return; }
   arm(); o.status(true); o.receive(sample);
  });
  o.trace?.("subscribed");
 }).catch(() => { if (!cancelled) { stop(); o.status(false); o.trace?.("error"); } });
 return () => { if (cancelled) return; cancelled = true; stop(); o.trace?.("stop"); };
}
