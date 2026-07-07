/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * IPC Service
 * Handles communication between the React Frontend and the Electron Main Process.
 * Contains elegant fallbacks for standard web/browser environments (like AI Studio live preview).
 */

export interface ElectronWindow extends Window {
  electron?: {
    send: (channel: string, data?: any) => void;
    receive: (channel: string, func: (...args: any[]) => void) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
  };
}

const getElectronWindow = (): ElectronWindow | null => {
  if (typeof window !== 'undefined' && 'electron' in window) {
    return window as ElectronWindow;
  }
  return null;
};

export const isElectron = (): boolean => {
  return getElectronWindow() !== null;
};

export const ipcService = {
  /**
   * Send a message to the main process (fire-and-forget)
   */
  send(channel: string, data?: any): void {
    const win = getElectronWindow();
    if (win?.electron) {
      win.electron.send(channel, data);
    } else {
      console.log(`[IPC Sim - Send] ${channel}:`, data);
    }
  },

  /**
   * Listen for events from the main process
   */
  receive(channel: string, callback: (...args: any[]) => void): () => void {
    const win = getElectronWindow();
    if (win?.electron) {
      win.electron.receive(channel, callback);
      // Return unregister/cleanup function
      return () => {
        // In real Electron, we might need to remove listener.
      };
    } else {
      console.log(`[IPC Sim - Register] ${channel}`);
      return () => {};
    }
  },

  /**
   * Invoke a method in the main process and wait for the response (Promise-based)
   */
  async invoke(channel: string, data?: any): Promise<any> {
    const win = getElectronWindow();
    if (win?.electron) {
      return await win.electron.invoke(channel, data);
    } else {
      console.log(`[IPC Sim - Invoke] ${channel}:`, data);
      return this.simulateBrowserFallback(channel, data);
    }
  },

  /**
   * Simulated desktop operations when running in a standard web browser sandbox.
   * This ensures the application remains fully testable, interactive, and beautiful in the AI Studio live preview!
   */
  async simulateBrowserFallback(channel: string, data?: any): Promise<any> {
    switch (channel) {
      case 'select-folders':
        return {
          canceled: false,
          filePaths: ['/Users/SimulatedUser/Music/OfflinePlayerLibrary']
        };
      case 'get-app-version':
        return '1.0.0-beta';
      case 'get-system-info':
        return {
          platform: navigator.platform,
          arch: 'x64',
          freeMemGB: 8.5,
          totalMemGB: 16.0
        };
      default:
        return null;
    }
  }
};
