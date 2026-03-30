import { db } from './index';
import { timeslot } from './schema';

const TIMESLOT_SEEDS = [
	{ startHour: 7, endHour: 10 },
	{ startHour: 10, endHour: 13 },
	{ startHour: 13, endHour: 16 },
	{ startHour: 16, endHour: 19 },
	{ startHour: 19, endHour: 22 }
];

async function seed() {
	for (const ts of TIMESLOT_SEEDS) {
		await db.insert(timeslot).values(ts).onConflictDoNothing();
	}
	console.log('Seeded 5 timeslots');
}

seed()
	.catch(console.error)
	.then(() => process.exit(0));
