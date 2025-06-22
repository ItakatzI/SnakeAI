const canvasIds = ["ai-random", "ai-greedy", "ai-safe", "ai-smart"];
const strategies = ["random", "greedy", "safe", "smart"];
const gridSize = 10;
const tileCount = 20;

class SnakeGame {
  constructor(canvas, strategy) {
    this.ctx = canvas.getContext("2d");
    this.canvas = canvas;
    this.strategy = strategy;
    this.reset();
    this.loop = setInterval(() => this.update(), this.speed);
  }

  reset() {
    this.snake = [{ x: 10, y: 10 }];
    this.apple = this.spawnApple();
    this.speed = 150;
    this.growthCounter = 0;
    this.prevLength = 1;
    this.lastHeads = [];
    this.lastLengths = [];
  }

  spawnApple() {
    let pos;
    do {
      pos = { x: Math.floor(Math.random() * tileCount), y: Math.floor(Math.random() * tileCount) };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawTile(this.apple, "red");
    this.snake.forEach((s, i) => this.drawTile(s, i === 0 ? "lime" : "green"));
  }

  drawTile(pos, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(pos.x * gridSize, pos.y * gridSize, gridSize - 1, gridSize - 1);
  }

  update() {
    let move = this.chooseMove();
    if (!move) {
      this.restart();
      return;
    }

    this.snake.unshift(move);

    if (move.x === this.apple.x && move.y === this.apple.y) {
      this.apple = this.spawnApple();
      if (this.speed > 50) {
        clearInterval(this.loop);
        this.speed -= 5;
        this.loop = setInterval(() => this.update(), this.speed);
      }
    } else {
      this.snake.pop();
    }

    if (this.isCollision(move)) {
      this.restart();
      return;
    }

    // Smarter loop detection
    if (this.snake.length > this.prevLength) {
      this.growthCounter = 0;
      this.prevLength = this.snake.length;
      this.lastLengths = [];
      this.lastHeads = [];
    } else {
      this.growthCounter++;
      this.lastLengths.push(this.snake.length);
      this.lastHeads.push(`${this.snake[0].x},${this.snake[0].y}`);
      if (this.lastLengths.length > 200) this.lastLengths.shift();
      if (this.lastHeads.length > 200) this.lastHeads.shift();
    }

    const loopDetected =
      this.strategy === "smart" &&
      this.growthCounter > 150 &&
      new Set(this.lastHeads.slice(-40)).size < 10;

    if (loopDetected) {
      console.warn("Smarter loop detected. Restarting...");
      this.restart();
      return;
    }

    this.draw();
  }

  restart() {
    clearInterval(this.loop);
    this.reset();
    this.loop = setInterval(() => this.update(), this.speed);
  }

  isCollision(pos) {
    return (
      pos.x < 0 || pos.y < 0 ||
      pos.x >= tileCount || pos.y >= tileCount ||
      this.snake.slice(1).some(p => p.x === pos.x && p.y === pos.y)
    );
  }

  getNeighbors(pos) {
    return [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ].filter(p => p.x >= 0 && p.y >= 0 && p.x < tileCount && p.y < tileCount);
  }

  chooseMove() {
    const head = this.snake[0];

    if (this.strategy === "random") {
      let moves = this.getNeighbors(head).filter(m => !this.isCollision(m));
      return moves[Math.floor(Math.random() * moves.length)];
    }

    let path = this.aStar(head, this.apple);
    if (this.strategy === "greedy") {
      return path?.[1];
    }

    if (this.strategy === "safe") {
      if (path && path.length > 1 && this.isPathSafe(path)) return path[1];
      return null;
    }

    if (this.strategy === "smart") {
      if (path && path.length > 1 && this.isPathSafe(path)) return path[1];

      let tail = this.snake[this.snake.length - 1];
      let tailPath = this.aStar(head, tail);
      if (tailPath && tailPath.length > 1) return tailPath[1];

      let moves = this.getNeighbors(head).filter(m => !this.isCollision(m));
      return moves[Math.floor(Math.random() * moves.length)];
    }

    return null;
  }

  isPathSafe(path) {
    let simSnake = JSON.parse(JSON.stringify(this.snake));
    path.slice(1).forEach(step => simSnake.unshift(step));
    simSnake.length = this.snake.length + 1;

    let tail = simSnake[simSnake.length - 1];
    let head = simSnake[0];
    const occupied = new Set(simSnake.map(p => `${p.x},${p.y}`));
    occupied.delete(`${tail.x},${tail.y}`);

    const q = [head];
    const visited = new Set([`${head.x},${head.y}`]);

    while (q.length) {
      const curr = q.shift();
      if (curr.x === tail.x && curr.y === tail.y) return true;

      this.getNeighbors(curr).forEach(n => {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key) && !occupied.has(key)) {
          visited.add(key);
          q.push(n);
        }
      });
    }
    return false;
  }

  aStar(start, goal) {
    const key = (p) => `${p.x},${p.y}`;
    const openSet = [start];
    const cameFrom = {};
    const gScore = { [key(start)]: 0 };
    const fScore = { [key(start)]: this.heuristic(start, goal) };
    const occupied = new Set(this.snake.map(p => key(p)));

    while (openSet.length) {
      openSet.sort((a, b) => fScore[key(a)] - fScore[key(b)]);
      const current = openSet.shift();
      if (current.x === goal.x && current.y === goal.y) return this.reconstruct(cameFrom, current);

      for (let neighbor of this.getNeighbors(current)) {
        const nKey = key(neighbor);
        if (occupied.has(nKey) && nKey !== key(goal)) continue;
        let tentative = gScore[key(current)] + 1;
        if (tentative < (gScore[nKey] || Infinity)) {
          cameFrom[nKey] = current;
          gScore[nKey] = tentative;
          fScore[nKey] = tentative + this.heuristic(neighbor, goal);
          if (!openSet.some(p => key(p) === nKey)) openSet.push(neighbor);
        }
      }
    }

    return null;
  }

  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  reconstruct(cameFrom, current) {
    const path = [current];
    const key = (p) => `${p.x},${p.y}`;
    while (cameFrom[key(current)]) {
      current = cameFrom[key(current)];
      path.unshift(current);
    }
    return path;
  }
}

// Initialize all games on page load
window.onload = () => {
  canvasIds.forEach((id, i) => {
    const canvas = document.getElementById(id);
    if (canvas) new SnakeGame(canvas, strategies[i]);
  });
};
