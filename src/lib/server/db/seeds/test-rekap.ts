import { db } from '../index';
import { practicumSchedule, practicumSeries } from '../schema';

async function test() {
    const seriesOptions = await db.query.practicumSeries.findMany();
    console.log("Series Count:", seriesOptions.length);

    const scopedSchedules = await db.query.practicumSchedule.findMany({
		with: { instructors: { with: { user: true } } }
	});
    console.log("Schedules Count:", scopedSchedules.length);
    let instructorsFound = 0;
    for (const s of scopedSchedules) {
        instructorsFound += s.instructors.length;
    }
    console.log("Instructors found in schedules:", instructorsFound);
    process.exit(0);
}
test();
