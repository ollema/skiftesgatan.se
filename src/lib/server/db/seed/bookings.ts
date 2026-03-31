import { db } from '../index';
import { user } from '../auth.schema';
import { timeslot, booking } from '../booking.schema';
import { APARTMENTS } from '../../auth.config';

function randomInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDate(d: Date) {
	return d.toISOString().split('T')[0];
}

function randomFutureDate() {
	const date = new Date();
	date.setDate(date.getDate() + randomInt(1, 30));
	return formatDate(date);
}

async function seedBookings() {
	const users = await db.select({ id: user.id, username: user.username }).from(user);
	const userMap = new Map(users.map((u) => [u.username, u.id]));

	const timeslots = await db.select().from(timeslot);
	const laundrySlots = timeslots.filter((ts) => ts.resource === 'laundry_room');
	const outdoorSlot = timeslots.find((ts) => ts.resource === 'outdoor_area');

	let laundryCount = 0;
	let outdoorCount = 0;

	for (const apt of APARTMENTS.slice(0, 16)) {
		const userId = userMap.get(apt);
		if (!userId) continue;

		// One laundry booking on a random future date and slot
		const slot = laundrySlots[randomInt(0, laundrySlots.length - 1)];
		await db
			.insert(booking)
			.values({ userId, timeslotId: slot.id, resource: 'laundry_room', date: randomFutureDate() })
			.onConflictDoNothing();
		laundryCount++;

		// ~40% chance of an outdoor booking
		if (outdoorSlot && Math.random() < 0.4) {
			await db
				.insert(booking)
				.values({
					userId,
					timeslotId: outdoorSlot.id,
					resource: 'outdoor_area',
					date: randomFutureDate()
				})
				.onConflictDoNothing();
			outdoorCount++;
		}
	}

	console.log(`Seeded ${laundryCount} laundry + ${outdoorCount} outdoor bookings`);
}

seedBookings()
	.catch(console.error)
	.then(() => process.exit(0));
