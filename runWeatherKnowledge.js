const { spawn } = require('child_process');
const path = require('path');

console.log('🌤️ Starting weather knowledge population...');


const child = spawn('node', ['populateWeatherKnowledge.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Weather knowledge population completed successfully!');
    console.log('🌤️ Your chatbot now has access to comprehensive weather knowledge!');
  } else {
    console.log(`❌ Weather knowledge population failed with code ${code}`);
  }
});

child.on('error', (error) => {
  console.error('❌ Error running weather knowledge population:', error);
});
