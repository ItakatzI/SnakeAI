// Initialize at top
let growthCounter = 0;
let lastLengths = [];
let lastHeads = [];
let prevLength = 1;

// Inside updateGame()
if (snake.length > prevLength) {
  growthCounter = 0;
  prevLength = snake.length;
  lastLengths = [];
  lastHeads = [];
} else {
  growthCounter++;
  lastLengths.push(snake.length);
  lastHeads.push(`${snake[0].x},${snake[0].y}`);
  if (lastLengths.length > 200) lastLengths.shift();
  if (lastHeads.length > 200) lastHeads.shift();
}

// Better loop detection
const loopDetected =
  growthCounter > 150 &&
  new Set(lastHeads.slice(-40)).size < 10;

if (loopDetected) {
  console.warn("Smarter loop detected. Restarting...");
  return gameOver();
}
