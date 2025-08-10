// Debugging utility to trace combo and chain mechanics
export class ComboDebugger {
  private static instance: ComboDebugger | null = null;
  private logs: string[] = [];
  private enabled: boolean = true;
  
  static getInstance(): ComboDebugger {
    if (!ComboDebugger.instance) {
      ComboDebugger.instance = new ComboDebugger();
    }
    return ComboDebugger.instance;
  }
  
  log(message: string, type: 'match' | 'combo' | 'chain' | 'score' | 'end' = 'match'): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
    const emoji = this.getEmojiForType(type);
    const logMessage = `[${timestamp}] ${emoji} ${message}`;
    
    this.logs.push(logMessage);
    
    // Keep only last 50 logs (combo logs can be frequent)
    if (this.logs.length > 50) {
      this.logs.shift();
    }
    
    // Update debug display if it exists
    this.updateDebugDisplay();
  }
  
  private getEmojiForType(type: string): string {
    switch (type) {
      case 'match': return '🎯';
      case 'combo': return '🔥';
      case 'chain': return '⛓️';
      case 'score': return '💰';
      case 'end': return '🏁';
      default: return '🎯';
    }
  }
  
  private updateDebugDisplay(): void {
    const debugElement = document.getElementById('comboPointingLog');
    if (debugElement) {
      // Show last 15 logs with HTML formatting
      const recentLogs = this.logs.slice(-15);
      debugElement.innerHTML = recentLogs.join('<br>');
      // Auto-scroll to bottom
      debugElement.scrollTop = debugElement.scrollHeight;
    }
  }
  
  clear(): void {
    this.logs = [];
    this.updateDebugDisplay();
  }
  
  getLogs(): string[] {
    return [...this.logs];
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Helper function for quick access
export function comboLog(message: string, type: 'match' | 'combo' | 'chain' | 'score' | 'end' = 'match'): void {
  ComboDebugger.getInstance().log(message, type);
}