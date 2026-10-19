import { isExpectedAuthCallback } from './authRedirect';

interface LinkTransport {
  getInitialURL(): Promise<string | null>;
  addEventListener(type: 'url', listener: (event: { url: string }) => void): { remove(): void };
}
/** One ephemeral callback, captured before routing mounts its screen. Never persisted or logged. */
export class NativeAuthCallbacks {
  private state: { ready: boolean; url: string | null } = { ready: false, url: null };
  private revision = 0;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  snapshot = () => this.state;
  private publish(url: string | null) {
    this.state = { ready: true, url };
    for (const listener of this.listeners) listener();
  }
  reset() { this.revision++; this.publish(null); }
  capture(url: string): boolean {
    if (!url || !isExpectedAuthCallback(url, 'android')) return false;
    this.revision++; this.publish(url); return true;
  }
  start(transport: LinkTransport): () => void {
    const revision = ++this.revision;
    const subscription = transport.addEventListener('url', event => { this.capture(event.url); });
    void transport.getInitialURL().then(url => {
      if (revision !== this.revision) return;
      if (!url || !this.capture(url)) this.publish(null);
    }).catch(() => { if (revision === this.revision) this.publish(null); });
    return () => { this.revision++; subscription.remove(); };
  }
}
export const nativeAuthCallbacks = new NativeAuthCallbacks();
