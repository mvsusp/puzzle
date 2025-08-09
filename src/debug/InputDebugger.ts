// Debugging utility to trace input flow
export class InputDebugger {
  private static instance: InputDebugger | null = null;
  private logs: string[] = [];
  private enabled: boolean = true;
  
  static getInstance(): InputDebugger {
    if (!InputDebugger.instance) {
      InputDebugger.instance = new InputDebugger();
    }
    return InputDebugger.instance;
  }
  
  log(component: string, message: string): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString().split('T')[1].substring(0, 12);
    const logMessage = `[${timestamp}] ${component}: ${message}`;
    
    this.logs.push(logMessage);
    console.log(`🔍 ${logMessage}`);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift();
    }
    
    // Update debug display if it exists
    this.updateDebugDisplay();
  }
  
  private updateDebugDisplay(): void {
    const debugElement = document.getElementById('inputDebugLog');
    if (debugElement) {
      // Show last 10 logs with HTML formatting
      const recentLogs = this.logs.slice(-10);
      debugElement.innerHTML = recentLogs.join('<br>');
      // Auto-scroll to bottom
      debugElement.scrollTop = debugElement.scrollHeight;
    }
  }
  
  clear(): void {
    this.logs = [];
  }
  
  getLogs(): string[] {
    return [...this.logs];
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

// Helper function for quick access
export function debugLog(component: string, message: string): void {
  InputDebugger.getInstance().log(component, message);
}