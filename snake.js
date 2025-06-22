class SnakeGame {
  constructor(canvas, strategy) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext('2d');
    this.strategy = strategy;
    this.tileCount = 20;
    this.speed     = 150;

    // Resize buffer to fit integer grid
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const gs = Math.floor(Math.min(cw, ch) / this.tileCount);
    canvas.width  = gs * this.tileCount;
    canvas.height = gs * this.tileCount;
    this.gridSize = gs;

    this.reset();
    this.loop = setInterval(() => this.update(), this.speed);
  }

  reset() {
    this.snake         = [{ x: (this.tileCount/2)|0, y: (this.tileCount/2)|0 }];
    this.apple         = this.spawnApple();
    this.prevLength    = 1;
    this.growthCounter = 0;
    this.lastHeads     = [];
  }

  spawnApple() {
    let pos;
    do {
      pos = { 
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
    } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawTile(this.apple, 'red');
    this.snake.forEach((seg,i) => this.drawTile(seg, i===0?'lime':'green'));
  }

  drawTile(p, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      p.x * this.gridSize,
      p.y * this.gridSize,
      this.gridSize - 1,
      this.gridSize - 1
    );
  }

  update() {
    const move = this.chooseMove();
    if (!move) return this.restart();

    this.snake.unshift(move);
    // Eat?
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

    // Collision?
    if (this.isCollision(move)) return this.restart();

    // Loop detection for Smart
    if (this.snake.length > this.prevLength) {
      this.prevLength    = this.snake.length;
      this.growthCounter = 0;
      this.lastHeads.length = 0;
    } else {
      this.growthCounter++;
      this.lastHeads.push(`${move.x},${move.y}`);
      if (this.lastHeads.length > 200) this.lastHeads.shift();
    }
    if (this.strategy === 'smart'
        && this.growthCounter > 150
        && new Set(this.lastHeads.slice(-40)).size < 10
    ) {
      return this.restart();
    }

    this.draw();
  }

  restart() {
    clearInterval(this.loop);
    this.reset();
    this.loop = setInterval(() => this.update(), this.speed);
  }

  isCollision(p) {
    return (
      p.x < 0 || p.y < 0 ||
      p.x >= this.tileCount || p.y >= this.tileCount ||
      this.snake.slice(1).some(s => s.x === p.x && s.y === p.y)
    );
  }

  getNeighbors(p) {
    return [
      {x:p.x+1,y:p.y}, {x:p.x-1,y:p.y},
      {x:p.x,  y:p.y+1}, {x:p.x,  y:p.y-1}
    ].filter(n =>
      n.x >= 0 && n.y >= 0 &&
      n.x < this.tileCount && n.y < this.tileCount
    );
  }

  chooseMove() {
    const head = this.snake[0];

    if (this.strategy === 'random') {
      const m = this.getNeighbors(head).filter(n => !this.isCollision(n));
      return m[Math.floor(Math.random() * m.length)];
    }

    const path = this.aStar(head, this.apple);
    if (this.strategy === 'greedy') {
      return path?.[1] || null;
    }
    if (this.strategy === 'safe') {
      return (path?.length > 1 && this.isPathSafe(path))
        ? path[1]
        : null;
    }
    // smart:
    if (path?.length > 1 && this.isPathSafe(path)) {
      return path[1];
    }
    const tail = this.snake[this.snake.length-1];
    const tp   = this.aStar(head, tail);
    if (tp?.length > 1) {
      return tp[1];
    }
    const m = this.getNeighbors(head).filter(n => !this.isCollision(n));
    return m[Math.floor(Math.random() * m.length)];
  }

  isPathSafe(path) {
    const sim = JSON.parse(JSON.stringify(this.snake));
    path.slice(1).forEach(s => sim.unshift(s));
    sim.length = this.snake.length + 1;
    const tail = sim[sim.length-1];
    const occ  = new Set(sim.map(p => `${p.x},${p.y}`));
    occ.delete(`${tail.x},${tail.y}`);
    const q   = [{x:path[0].x,y:path[0].y}];
    const vis = new Set([`${path[0].x},${path[0].y}`]);
    while (q.length) {
      const c = q.shift();
      if (c.x === tail.x && c.y === tail.y) return true;
      this.getNeighbors(c).forEach(n => {
        const k = `${n.x},${n.y}`;
        if (!vis.has(k) && !occ.has(k)) {
          vis.add(k);
          q.push(n);
        }
      });
    }
    return false;
  }

  aStar(start, goal) {
    const key      = p => `${p.x},${p.y}`;
    const open     = [start];
    const from     = {};
    const gScore   = {[key(start)]: 0};
    const fScore   = {[key(start)]: this.heuristic(start,goal)};
    const occ      = new Set(this.snake.map(p => key(p)));

    while (open.length) {
      open.sort((a,b) => fScore[key(a)] - fScore[key(b)]);
      const cur = open.shift();
      if (cur.x===goal.x && cur.y===goal.y) {
        return this.reconstruct(from,cur);
      }
      this.getNeighbors(cur).forEach(n => {
        const k = key(n);
        if (occ.has(k) && k !== key(goal)) return;
        const tg = gScore[key(cur)] + 1;
        if (tg < (gScore[k]||Infinity)) {
          from[k]    = cur;
          gScore[k]  = tg;
          fScore[k]  = tg + this.heuristic(n,goal);
          if (!open.some(x => key(x) === k)) open.push(n);
        }
      });
    }
    return null;
  }

  heuristic(a,b) {
    return Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
  }

  reconstruct(from, cur) {
    const path = [cur], key = p => `${p.x},${p.y}`;
    while (from[key(cur)]) {
      cur = from[key(cur)];
      path.unshift(cur);
    }
    return path;
  }
}

// Expose globally
window.SnakeGame = SnakeGame;
