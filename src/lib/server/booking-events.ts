import { EventEmitter } from 'node:events';
import type { Resource } from '$lib/types/bookings';

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emitBookingChanged(resource: Resource): void {
	emitter.emit('booking-changed', resource);
}

export function onBookingChanged(cb: (resource: Resource) => void): void {
	emitter.on('booking-changed', cb);
}

export function offBookingChanged(cb: (resource: Resource) => void): void {
	emitter.off('booking-changed', cb);
}
