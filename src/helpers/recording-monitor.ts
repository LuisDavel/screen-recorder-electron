import { create } from "zustand";

// Types
export interface RecordingSession {
	id: string;
	startTime: Date;
	isActive: boolean;
	hasCamera: boolean;
	hasMicrophone: boolean;
	isPaused: boolean;
	windowHidden: boolean;
	backgroundOptimized: boolean;
}

export interface RecordingMonitorState {
	sessions: RecordingSession[];
	isAnyRecordingActive: boolean;
	windowVisible: boolean;
	backgroundMode: boolean;
	optimizationsEnabled: boolean;

	// Actions
	startSession: (
		id: string,
		hasCamera: boolean,
		hasMicrophone: boolean,
	) => void;
	stopSession: (id: string) => void;
	pauseSession: (id: string) => void;
	resumeSession: (id: string) => void;
	updateWindowVisibility: (visible: boolean) => void;
	enableBackgroundOptimizations: () => void;
	disableBackgroundOptimizations: () => void;
}

// Store for recording monitor
export const useRecordingMonitorStore = create<RecordingMonitorState>(
	(set) => ({
		sessions: [],
		isAnyRecordingActive: false,
		windowVisible: true,
		backgroundMode: false,
		optimizationsEnabled: false,

		startSession: (id: string, hasCamera: boolean, hasMicrophone: boolean) => {
			const newSession: RecordingSession = {
				id,
				startTime: new Date(),
				isActive: true,
				hasCamera,
				hasMicrophone,
				isPaused: false,
				windowHidden: false,
				backgroundOptimized: false,
			};

			set((state) => ({
				sessions: [...state.sessions.filter((s) => s.id !== id), newSession],
				isAnyRecordingActive: true,
			}));

			console.log(
				`Recording session started: ${id} (hasCamera: ${hasCamera}, hasMicrophone: ${hasMicrophone})`,
			);
			// Notify monitor after state update
			setTimeout(() => {
				RecordingMonitor.getInstance().onSessionStart(newSession);
			}, 0);
		},

		stopSession: (id: string) => {
			set((state) => {
				const updatedSessions = state.sessions.filter((s) => s.id !== id);
				return {
					sessions: updatedSessions,
					isAnyRecordingActive: updatedSessions.some((s) => s.isActive),
				};
			});

			console.log(`Recording session stopped: ${id}`);
			// Notify monitor after state update
			setTimeout(() => {
				RecordingMonitor.getInstance().onSessionStop(id);
			}, 0);
		},

		pauseSession: (id: string) => {
			set((state) => ({
				sessions: state.sessions.map((s) =>
					s.id === id ? { ...s, isPaused: true } : s,
				),
			}));

			console.log(`Recording session paused: ${id}`);
		},

		resumeSession: (id: string) => {
			set((state) => ({
				sessions: state.sessions.map((s) =>
					s.id === id ? { ...s, isPaused: false } : s,
				),
			}));

			console.log(`Recording session resumed: ${id}`);
		},

		updateWindowVisibility: (visible: boolean) => {
			set((state) => ({
				windowVisible: visible,
				backgroundMode: !visible && state.isAnyRecordingActive,
			}));

			console.log(
				`Window visibility changed: ${visible ? "visible" : "hidden"}`,
			);
			// Notify monitor after state update
			setTimeout(() => {
				RecordingMonitor.getInstance().onVisibilityChange(visible);
			}, 0);
		},

		enableBackgroundOptimizations: () => {
			set({ optimizationsEnabled: true });
			console.log("Background optimizations enabled");
		},

		disableBackgroundOptimizations: () => {
			set({ optimizationsEnabled: false });
			console.log("Background optimizations disabled");
		},
	}),
);

// Main Recording Monitor class
export class RecordingMonitor {
	private static instance: RecordingMonitor;
	private listeners: Set<RecordingMonitorListener> = new Set();
	private visibilityCheckInterval: NodeJS.Timeout | null = null;
	private performanceMonitor: PerformanceMonitor;

	private constructor() {
		this.performanceMonitor = new PerformanceMonitor();
		this.setupVisibilityDetection();
		// Remove monitoramento pesado de performance
		// this.setupPerformanceMonitoring();
		console.log("RecordingMonitor initialized (lightweight mode)");
	}

	public static getInstance(): RecordingMonitor {
		if (!RecordingMonitor.instance) {
			RecordingMonitor.instance = new RecordingMonitor();
		}
		return RecordingMonitor.instance;
	}

	// Setup visibility detection
	private setupVisibilityDetection(): void {
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", () => {
				const visible = !document.hidden;
				useRecordingMonitorStore.getState().updateWindowVisibility(visible);
			});
		}

		// Electron-specific window events
		if (typeof window !== "undefined" && (window as any).electronAPI) {
			(window as any).electronAPI.onWindowMinimized?.(() => {
				console.log("Electron window minimized");
				this.handleWindowMinimized();
			});

			(window as any).electronAPI.onWindowRestored?.(() => {
				console.log("Electron window restored");
				this.handleWindowRestored();
			});
		}

		// Backup visibility check for edge cases
		this.startVisibilityPolling();
	}

	private startVisibilityPolling(): void {
		// Remover polling pesado para economizar recursos
		// this.visibilityCheckInterval = setInterval(() => {
		//   if (typeof document !== "undefined") {
		//     const currentVisibility = !document.hidden;
		//     const storedVisibility =
		//       useRecordingMonitorStore.getState().windowVisible;

		//     if (currentVisibility !== storedVisibility) {
		//       console.log("Visibility mismatch detected, correcting...");
		//       useRecordingMonitorStore
		//         .getState()
		//         .updateWindowVisibility(currentVisibility);
		//     }
		//   }
		// }, 5000); // Check every 5 seconds
		console.log("Visibility polling disabled to save resources");
	}

	private setupPerformanceMonitoring(): void {
		this.performanceMonitor.start();
	}

	// Event handlers
	public onSessionStart(session: RecordingSession): void {
		this.notifyListeners("sessionStart", session);

		if (session.hasCamera || session.hasMicrophone) {
			console.log(
				"Camera or microphone recording detected - enabling background optimizations",
			);
			useRecordingMonitorStore.getState().enableBackgroundOptimizations();
		}

		// Prevent system sleep
		this.preventSystemSleep();
	}

	public onSessionStop(sessionId: string): void {
		this.notifyListeners("sessionStop", { sessionId });

		const { isAnyRecordingActive } = useRecordingMonitorStore.getState();
		if (!isAnyRecordingActive) {
			console.log("No active recordings - disabling background optimizations");
			useRecordingMonitorStore.getState().disableBackgroundOptimizations();
			this.allowSystemSleep();
		}
	}

	public onVisibilityChange(visible: boolean): void {
		const { isAnyRecordingActive } = useRecordingMonitorStore.getState();

		if (!visible && isAnyRecordingActive) {
			console.log("Recording active in background - maintaining performance");
			this.enableBackgroundMode();
		} else if (visible) {
			console.log("Window visible - normal operation mode");
			this.disableBackgroundMode();
		}

		this.notifyListeners("visibilityChange", { visible });
	}

	private handleWindowMinimized(): void {
		const { isAnyRecordingActive } = useRecordingMonitorStore.getState();

		if (isAnyRecordingActive) {
			console.warn(
				"Window minimized during recording - switching to background mode",
			);
			this.enableBackgroundMode();

			// Show notification if possible
			this.showBackgroundNotification();
		}
	}

	private handleWindowRestored(): void {
		console.log("Window restored - switching back to normal mode");
		this.disableBackgroundMode();
	}

	// Background mode management
	private enableBackgroundMode(): void {
		console.log("Enabling background recording mode");

		// Notify listeners to switch to timer-based rendering
		this.notifyListeners("backgroundModeEnabled", {});

		// Reduce non-essential operations
		this.reduceBackgroundOperations();
	}

	private disableBackgroundMode(): void {
		console.log("Disabling background recording mode");

		// Notify listeners to switch back to requestAnimationFrame
		this.notifyListeners("backgroundModeDisabled", {});

		// Resume normal operations
		this.resumeNormalOperations();
	}

	private reduceBackgroundOperations(): void {
		// Reduce UI updates
		document.body.classList.add("recording-background-mode");

		// Pause non-essential animations
		this.notifyListeners("reduceOperations", {});
	}

	private resumeNormalOperations(): void {
		// Resume UI updates
		document.body.classList.remove("recording-background-mode");

		// Resume animations
		this.notifyListeners("resumeOperations", {});
	}

	private preventSystemSleep(): void {
		// This would be handled by the main process
		console.log("Requesting system stay awake during recording");
	}

	private allowSystemSleep(): void {
		console.log("Allowing system to sleep - no active recordings");
	}

	private showBackgroundNotification(): void {
		if ("Notification" in window && Notification.permission === "granted") {
			new Notification("Gravação em Segundo Plano", {
				body: "A gravação continua rodando em segundo plano.",
				icon: "/icon.png",
				tag: "background-recording",
			});
		}
	}

	// Listener management
	public addListener(listener: RecordingMonitorListener): void {
		this.listeners.add(listener);
	}

	public removeListener(listener: RecordingMonitorListener): void {
		this.listeners.delete(listener);
	}

	private notifyListeners(event: string, data: unknown): void {
		this.listeners.forEach((listener) => {
			try {
				listener.onRecordingEvent?.(event, data);
			} catch (error) {
				console.error("Error in recording monitor listener:", error);
			}
		});
	}

	// Cleanup
	public dispose(): void {
		if (this.visibilityCheckInterval) {
			clearInterval(this.visibilityCheckInterval);
			this.visibilityCheckInterval = null;
		}

		this.performanceMonitor.stop();
		this.listeners.clear();

		console.log("RecordingMonitor disposed");
	}

	// Getters
	public getActiveRecordings(): RecordingSession[] {
		return useRecordingMonitorStore
			.getState()
			.sessions.filter((s) => s.isActive);
	}

	public hasActiveCameraRecording(): boolean {
		return this.getActiveRecordings().some((s) => s.hasCamera);
	}

	public hasActiveMicrophoneRecording(): boolean {
		return this.getActiveRecordings().some((s) => s.hasMicrophone);
	}

	public isInBackgroundMode(): boolean {
		return useRecordingMonitorStore.getState().backgroundMode;
	}
}

// Performance monitoring
class PerformanceMonitor {
	private monitoringInterval: NodeJS.Timeout | null = null;
	private metrics: PerformanceMetrics = {
		fps: 0,
		memoryUsage: 0,
		cpuUsage: 0,
		lastUpdate: Date.now(),
	};

	public start(): void {
		// Desabilitar monitoramento de performance para economizar recursos
		// this.monitoringInterval = setInterval(() => {
		//   this.updateMetrics();
		// }, 10000); // Update every 10 seconds
		console.log("Performance monitoring disabled to save resources");
	}

	public stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}
	}

	private updateMetrics(): void {
		// Memory usage
		if ("memory" in performance) {
			this.metrics.memoryUsage =
				(performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
		}

		// FPS estimation (simplified)
		this.metrics.fps = this.estimateFPS();
		this.metrics.lastUpdate = Date.now();

		// Log if performance is degraded
		if (this.metrics.memoryUsage > 500) {
			// >500MB
			console.warn(
				"High memory usage detected:",
				this.metrics.memoryUsage,
				"MB",
			);
		}

		if (this.metrics.fps < 20) {
			console.warn("Low FPS detected:", this.metrics.fps);
		}
	}

	private estimateFPS(): number {
		// This is a simplified FPS estimation
		// In a real implementation, you'd track actual frame renders
		return 30; // Placeholder
	}

	public getMetrics(): PerformanceMetrics {
		return { ...this.metrics };
	}
}

// Types and interfaces
export interface RecordingMonitorListener {
	onRecordingEvent?(event: string, data: unknown): void;
}

export interface PerformanceMetrics {
	fps: number;
	memoryUsage: number;
	cpuUsage: number;
	lastUpdate: number;
}

// Hook for components to use the monitor
export function useRecordingMonitor() {
	const store = useRecordingMonitorStore();

	return {
		// Store state
		sessions: store.sessions,
		isAnyRecordingActive: store.isAnyRecordingActive,
		windowVisible: store.windowVisible,
		backgroundMode: store.backgroundMode,
		optimizationsEnabled: store.optimizationsEnabled,

		// Store actions
		startSession: store.startSession,
		stopSession: store.stopSession,
		pauseSession: store.pauseSession,
		resumeSession: store.resumeSession,
		updateWindowVisibility: store.updateWindowVisibility,
		enableBackgroundOptimizations: store.enableBackgroundOptimizations,
		disableBackgroundOptimizations: store.disableBackgroundOptimizations,

		// Convenience methods
		startRecording: (
			id: string,
			hasCamera: boolean = false,
			hasMicrophone: boolean = false,
		) => {
			store.startSession(id, hasCamera, hasMicrophone);
		},
		stopRecording: (id: string) => {
			store.stopSession(id);
		},
		isRecordingActive: store.isAnyRecordingActive,
		isInBackground: store.backgroundMode,
	};
}

// Initialize global instance
export const recordingMonitor = RecordingMonitor.getInstance();

// Auto-setup when module loads
if (typeof window !== "undefined") {
	// Request notification permission
	if ("Notification" in window && Notification.permission === "default") {
		Notification.requestPermission().then((permission) => {
			console.log("Notification permission:", permission);
		});
	}
}
