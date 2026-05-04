import { EventEmitter } from 'node:events';
import type { Resource } from '$lib/types/bookings';

const emitter = new EventEmitter();
emitter.setMaxListeners(256);

const CHANGE = 'change';

export const bookingEvents = {
	emit(resource: Resource): void {
		emitter.emit(CHANGE, resource);
	},
	subscribe(resource: Resource, cb: () => void): () => void {
		const listener = (changed: Resource) => {
			if (changed === resource) cb();
		};
		emitter.on(CHANGE, listener);
		return () => emitter.off(CHANGE, listener);
	}
};
