import { db } from './index';
import { timeslot } from './schema';

const TIMESLOT_SEEDS = [
	{ startHour: 7, endHour: 10, resource: 'laundry_room' as const },
	{ startHour: 10, endHour: 13, resource: 'laundry_room' as const },
	{ startHour: 13, endHour: 16, resource: 'laundry_room' as const },
	{ startHour: 16, endHour: 19, resource: 'laundry_room' as const },
	{ startHour: 19, endHour: 22, resource: 'laundry_room' as const },
	{ startHour: 7, endHour: 22, resource: 'outdoor_area' as const }
];

async function seed() {
	for (const ts of TIMESLOT_SEEDS) {
		await db.insert(timeslot).values(ts).onConflictDoNothing();
	}
	console.log('Seeded 6 timeslots (5 laundry + 1 outdoor)');
}

seed()
	.catch(console.error)
	.then(() => process.exit(0));
