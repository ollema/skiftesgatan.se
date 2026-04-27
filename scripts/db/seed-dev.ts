import 'dotenv/config';
import { seedDatabase } from './seed-data';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required for db:seed:dev');
	process.exit(1);
}

await seedDatabase(url, { withBookings: true });
console.log('✓ dev seeded');
