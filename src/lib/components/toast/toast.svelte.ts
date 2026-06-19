export interface ToastOptions {
	description?: string;
	duration?: number; // duration in ms
	persistent?: boolean; // if true, doesn't auto-close
	position?: ToastPosition;
}

export type ToastType = 'success' | 'info' | 'warning' | 'destructive';

export type ToastPosition =
	| 'top-left'
	| 'top-center'
	| 'top-right'
	| 'left-center'
	| 'right-center'
	| 'bottom-left'
	| 'bottom-center'
	| 'bottom-right';

export interface ToastItem {
	id: string;
	title: string;
	description?: string;
	type: ToastType;
	duration: number;
	persistent: boolean;
	position: ToastPosition;
	progress: number;
	remainingTime: number;
	isPaused: boolean;
	createdAt: number;
}

class ToastState {
	// A map of position to array of active toasts
	toasts = $state<Record<ToastPosition, ToastItem[]>>({
		'top-left': [],
		'top-center': [],
		'top-right': [],
		'bottom-left': [],
		'bottom-center': [],
		'bottom-right': [],
		'left-center': [],
		'right-center': []
	});

	// Default configuration
	defaultPosition: ToastPosition = 'bottom-right';
	defaultDuration = 4000;

	add(title: string, type: ToastType, options?: ToastOptions) {
		const id = Math.random().toString(36).substring(2, 9);
		const position = options?.position || this.defaultPosition;
		const duration = options?.duration ?? this.defaultDuration;
		const persistent = options?.persistent ?? false;

		const newToast: ToastItem = {
			id,
			title,
			description: options?.description,
			type,
			duration,
			persistent,
			position,
			progress: 100,
			remainingTime: duration,
			isPaused: false,
			createdAt: Date.now()
		};

		// Push to position queue
		this.toasts[position] = [...this.toasts[position], newToast];

		if (!persistent) {
			this.startTimer(position, id, duration);
		}

		return id;
	}

	startTimer(position: ToastPosition, id: string, duration: number) {
		const interval = 16; // ~60fps updates

		const timer = setInterval(() => {
			const toastList = this.toasts[position];
			const toastIndex = toastList.findIndex((t) => t.id === id);

			if (toastIndex === -1) {
				clearInterval(timer);
				return;
			}

			const toast = toastList[toastIndex];

			if (toast.isPaused) {
				return;
			}

			toast.remainingTime = Math.max(0, toast.remainingTime - interval);
			toast.progress = (toast.remainingTime / toast.duration) * 100;

			if (toast.remainingTime <= 0) {
				clearInterval(timer);
				this.dismiss(position, id);
			}
		}, interval);
	}

	pause(position: ToastPosition, id: string) {
		const toast = this.toasts[position].find((t) => t.id === id);
		if (toast) {
			toast.isPaused = true;
		}
	}

	resume(position: ToastPosition, id: string) {
		const toast = this.toasts[position].find((t) => t.id === id);
		if (toast) {
			toast.isPaused = false;
		}
	}

	dismiss(position: ToastPosition, id: string) {
		this.toasts[position] = this.toasts[position].filter((t) => t.id !== id);
	}

	success(title: string, options?: ToastOptions) {
		return this.add(title, 'success', options);
	}

	info(title: string, options?: ToastOptions) {
		return this.add(title, 'info', options);
	}

	warning(title: string, options?: ToastOptions) {
		return this.add(title, 'warning', options);
	}

	destructive(title: string, options?: ToastOptions) {
		return this.add(title, 'destructive', options);
	}
}

export const toast = new ToastState();
