
// Simulation of the dashboard logic to debug why text might be 3
// We will mock the Date to be today, and create sessions that should give 10 streak.

const today = new Date();
const sessions = [];

// Generate 10 days of sessions ending TODAY
for (let i = 0; i < 10; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);

    console.log(`Generating day ${i}: Local ${d.toLocaleDateString()} UTC ${d.toISOString()}`);
}
