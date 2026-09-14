/** A failed probe is retried; concurrent callers share one connection attempt. */
export class DatabaseConnectionMonitor {
  public connected = false;
  private pending: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;
  private generation = 0;
  constructor(private probe: () => Promise<unknown>, private initialDelay = 1000, private maxDelay = 30000, private healthyInterval = 30000) {
    this.delay = initialDelay;
  }
  public async check(): Promise<boolean> {
    if (this.pending) return this.pending;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const generation = this.generation;
    this.pending = (async () => {
      let connected = false;
      try { await this.probe(); connected = true; } catch { /* Retry below. */ }
      if (generation !== this.generation) return this.connected;
      this.connected = connected;
      const nextDelay = connected ? this.healthyInterval : this.delay;
      this.delay = connected ? this.initialDelay : Math.min(this.delay * 2, this.maxDelay);
      this.timer = setTimeout(() => { this.timer = null; void this.check(); }, nextDelay);
      this.timer.unref();
      return connected;
    })();
    try { return await this.pending; }
    finally { this.pending = null; }
  }
  public stop(): void {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.delay = this.initialDelay;
  }
}
