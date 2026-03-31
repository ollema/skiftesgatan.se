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

function pick<T>(arr: T[]): T {
	return arr[randomInt(0, arr.length - 1)];
}

function shuffle<T>(arr: T[]): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = randomInt(0, i);
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
}

async function seedBookings() {
	const users = await db.select({ id: user.id, username: user.username }).from(user);
	const userMap = new Map(users.map((u) => [u.username, u.id]));

	const timeslots = await db.select().from(timeslot);
	const laundrySlots = timeslots.filter((ts) => ts.resource === 'laundry_room');
	const outdoorSlot = timeslots.find((ts) => ts.resource === 'outdoor_area');

	// Use roughly half the apartments
	const activeApartments = shuffle(APARTMENTS).slice(0, 16);

	const now = new Date();
	let laundryCount = 0;
	let outdoorCount = 0;

	for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
		const date = new Date(now);
		date.setDate(date.getDate() + dayOffset);
		const dateStr = formatDate(date);

		// Fill 2-4 of the 5 laundry slots each day
		const slotsToFill = randomInt(2, 4);
		for (const slot of shuffle(laundrySlots).slice(0, slotsToFill)) {
			const apt = pick(activeApartments);
			const userId = userMap.get(apt);
			if (!userId) continue;

			await db
				.insert(booking)
				.values({ userId, timeslotId: slot.id, resource: 'laundry_room', date: dateStr })
				.onConflictDoNothing();
			laundryCount++;
		}

		// Book the outdoor area ~40% of days
		if (outdoorSlot && Math.random() < 0.4) {
			const apt = pick(activeApartments);
			const userId = userMap.get(apt);
			if (userId) {
				await db
					.insert(booking)
					.values({
						userId,
						timeslotId: outdoorSlot.id,
						resource: 'outdoor_area',
						date: dateStr
					})
					.onConflictDoNothing();
				outdoorCount++;
			}
		}
	}

	console.log(`Seeded ~${laundryCount} laundry + ~${outdoorCount} outdoor bookings over 30 days`);
}

seedBookings()
	.catch(console.error)
	.then(() => process.exit(0));
