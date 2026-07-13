import { generateLogbookForSeries } from './generateLogbook';

async function run() {
	try {
		console.log('Starting test generation...');
		const { buffer } = await generateLogbookForSeries(
			'q3WD7pU04E6i2BauQeArcqfFdIPdXUQH',
			'2b791cc3-f89e-48d5-b247-59bfed0bc51a',
			{}
		);
		console.log('Success! Generated buffer size:', buffer.byteLength);
	} catch (err) {
		console.error('Test failed:', err);
	}
}

run();
