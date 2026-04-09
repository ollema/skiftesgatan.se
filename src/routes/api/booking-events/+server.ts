import { produce } from 'sveltekit-sse';
import * as v from 'valibot';
import { RESOURCES, type Resource } from '$lib/types/bookings';
import { onBookingChanged, offBookingChanged } from '$lib/server/booking-events';

const bodySchema = v.object({ resource: v.picklist(RESOURCES) });

export function POST({ request }) {
	return produce(async function start({ emit }) {
		const body = await request.json();
		const { resource } = v.parse(bodySchema, body);

		const handler = (changedResource: Resource) => {
			if (changedResource === resource) {
				emit('booking-changed', new Date().toISOString());
			}
		};

		onBookingChanged(handler);

		return function stop() {
			offBookingChanged(handler);
		};
	});
}
