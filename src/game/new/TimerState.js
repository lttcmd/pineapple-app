/**
 * TimerState - Clean timer management
 * Handles individual player timers with clear expiration logic
 */

export class TimerState {
  constructor(durationMs, phaseType) {
    this.startTime = Date.now();
    this.durationMs = durationMs;
    this.phaseType = phaseType;
    this.deadline = this.startTime + durationMs;
    this.isActive = true;
  }
  
  /**
   * Check if timer has expired
   */
  isExpired() {
    return this.isActive && Date.now() >= this.deadline;
  }
  
  /**
   * Get remaining time in milliseconds
   */
  getTimeRemaining() {
    if (!this.isActive) return 0;
    return Math.max(0, this.deadline - Date.now());
  }
  
  /**
   * Get remaining time in seconds (rounded up)
   */
  getTimeRemainingSeconds() {
    return Math.ceil(this.getTimeRemaining() / 1000);
  }
  
  /**
   * Get timer progress (0.0 to 1.0)
   */
  getProgress() {
    if (!this.isActive) return 1.0;
    const elapsed = Date.now() - this.startTime;
    return Math.min(1.0, Math.max(0.0, elapsed / this.durationMs));
  }
  
  /**
   * Stop the timer
   */
  stop() {
    this.isActive = false;
  }
  
  /**
   * Get timer info for client
   */
  toClientInfo() {
    return {
      phaseType: this.phaseType,
      deadlineEpochMs: this.deadline,
      durationMs: this.durationMs,
      timeRemaining: this.getTimeRemaining(),
      timeRemainingSeconds: this.getTimeRemainingSeconds(),
      progress: this.getProgress()
    };
  }
  
  /**
   * Create a new timer for the next phase
   */
  static createForPhase(phaseType) {
    let durationMs;
    switch (phaseType) {
      case 'fantasyland':
        durationMs = 50000; // 50 seconds
        break;
      case 'initial-set':
      case 'round':
        durationMs = 10000; // 10 seconds
        break;
      default:
        throw new Error(`Unknown phase type: ${phaseType}`);
    }
    
    return new TimerState(durationMs, phaseType);
  }
}
