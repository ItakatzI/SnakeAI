class SnakeGame {
  constructor(canvas, strategy) {
    this.canvas    = canvas;
    this.ctx       = canvas.getContext('2d');
    this.strategy  = strategy;
    this.tileCount = 20;
    this.speed     = 150;

    // Fit canvas to an integer grid
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    const gs = Math.floor(Math.min(cw, ch) / this.tileCount);
    canvas.width  = gs * this.tileCount;
    canvas.height = gs * this.tileCount;
    this.gridSize = gs;

    // Bind so `this.restart()` works inside update
    this.update  = this.update.bind(this);
    this.restart = this.restart.bind(this);

    this.reset();
    this.loop = setInterval(this.update, this.speed);
  }

  reset() {
    this.snake         = [{ x: (this.tileCount/2)|0, y: (this.tileCount/2)|0 }];
    this.apple         = this._spawnAppleFor(this.snake);
    this.prevLength    = 1;
    this.growthCounter = 0;
    this.lastHeads     = [];
  }

  // ─── MAIN LOOP ────────────────────────────────────────────────────
  update() {
    let move;
    switch (this.strategy) {
      case 'random':     move = this._chooseRandom();      break;
      case 'greedy':     move = this._chooseGreedy();      break;
      case 'safe':       move = this._chooseSafe();        break;
      case 'smart':      move = this._chooseSmart();       break;
      case 'lookahead':  move = this._chooseLookahead(3);  break;
      case 'expectimax': move = this._chooseExpectimax(2); break;
      case 'mcts':       move = this._chooseMCTS(20, 60);  break;
      default:           move = null;
    }
    if (!move) return this.restart();

    this.snake.unshift(move);
    if (move.x === this.apple.x && move.y === this.apple.y) {
      this.apple = this._spawnAppleFor(this.snake);
    } else {
      this.snake.pop();
    }

    if (this._isCollision(move)) return this.restart();

    // Loop detection reset
    if (this.snake.length > this.prevLength) {
      this.prevLength    = this.snake.length;
      this.growthCounter = 0;
      this.lastHeads.length = 0;
    } else {
      this.growthCounter++;
      this.lastHeads.push(`${move.x},${move.y}`);
      if (this.lastHeads.length > 200) this.lastHeads.shift();
    }

    this._draw();
  }

  restart() {
    clearInterval(this.loop);
    this.reset();
    this.loop = setInterval(this.update, this.speed);
  }

  // ─── AI LEVEL 1: Random ─────────────────────────────────────────
  _chooseRandom() {
    const head  = this.snake[0];
    const moves = this._neighbors(head).filter(n => !this._isCollision(n));
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ─── AI LEVEL 2: Greedy (A*) ────────────────────────────────────
  _chooseGreedy() {
    const head = this.snake[0];
    const path = this._aStar(head, this.apple);
    return path?.[1] || null;
  }

  // ─── AI LEVEL 3: Tail-Aware ────────────────────────────────────
  _chooseSafe() {
    const head = this.snake[0];
    const path = this._aStar(head, this.apple);
    return (path?.length > 1 && this._isPathSafe(path)) ? path[1] : null;
  }

  // ─── AI LEVEL 4: Loop-Safe ──────────────────────────────────────
  _chooseSmart() {
    const head = this.snake[0];
    const pA   = this._aStar(head, this.apple);
    if (pA?.length > 1 && this._isPathSafe(pA)) return pA[1];
    const tail = this.snake[this.snake.length - 1];
    const pT   = this._aStar(head, tail);
    if (pT?.length > 1) return pT[1];
    return this._chooseRandom();
  }

  // ─── AI LEVEL 5: Lookahead Minimax ──────────────────────────────
  _chooseLookahead(depth) {
    const head = this.snake[0];
    let best = null, bestScore = -Infinity;
    for (let mv of this._neighbors(head).filter(n => !this._isCollision(n))) {
      const state = this._simulateState(this.snake, this.apple, mv);
      const score = this._minimax(state, depth - 1);
      if (score > bestScore) {
        bestScore = score;
        best      = mv;
      }
    }
    return best;
  }
  _minimax({ snake, apple }, depth) {
    if (depth === 0) return this._evaluate(snake, apple);
    const head = snake[0];
    let maxS = -Infinity;
    for (let mv of this._neighbors(head).filter(n => !this._isCollision(n))) {
      const nxt = this._simulateState(snake, apple, mv);
      const sc  = this._minimax(nxt, depth - 1);
      if (sc > maxS) maxS = sc;
    }
    return maxS;
  }

  // ─── AI LEVEL 6: Expectimax ────────────────────────────────────
  _chooseExpectimax(depth) {
    const head = this.snake[0];
    let best = null, bestScore = -Infinity;
    for (let mv of this._neighbors(head).filter(n => !this._isCollision(n))) {
      const state = this._simulateState(this.snake, this.apple, mv);
      const sc    = this._expectimax(state, depth - 1);
      if (sc > bestScore) {
        bestScore = sc;
        best      = mv;
      }
    }
    return best;
  }
  _expectimax({ snake, apple }, depth) {
    if (depth === 0) return this._evaluate(snake, apple);
    const head = snake[0];
    let maxS = -Infinity;
    // Snake’s move
    for (let mv of this._neighbors(head).filter(n => !this._isCollision(n))) {
      const nxt = this._simulateState(snake, apple, mv);
      const sc  = this._expectimax(nxt, depth - 1);
      if (sc > maxS) maxS = sc;
    }
    // Apple’s chance node: average over 5 random spawns
    if (depth > 0) {
      let sum = 0, N = 5;
      for (let i = 0; i < N; i++) {
        const pos = this._spawnAppleFor(snake);
        sum += this._expectimax({ snake, apple: pos }, depth - 1);
      }
      return (maxS + sum / N) / 2;
    }
    return maxS;
  }

  // ─── AI LEVEL 7: MCTS w/ Safe Rollouts ─────────────────────────
  _chooseMCTS(simCount = 20, maxDepth = 60) {
    const head = this.snake[0];
    let best = null, bestScore = -Infinity;
    for (let mv of this._neighbors(head).filter(n => !this._isCollision(n))) {
      let total = 0;
      for (let i = 0; i < simCount; i++) {
        total += this._simulateSafeRollout(mv, maxDepth);
      }
      const avg = total / simCount;
      if (avg > bestScore) {
        bestScore = avg;
        best      = mv;
      }
    }
    return best;
  }
  _simulateSafeRollout(initialMove, maxSteps) {
    let simSnake = this.snake.map(p => ({ x: p.x, y: p.y }));
    let simApple = { ...this.apple };
    simSnake.unshift({ x: initialMove.x, y: initialMove.y });
    if (initialMove.x === simApple.x && initialMove.y === simApple.y) {
      simApple = this._spawnAppleFor(simSnake);
    } else {
      simSnake.pop();
    }

    let steps = 0;
    const recent = new Set();
    while (steps < maxSteps) {
      const pm = this._rolloutPolicy(simSnake, simApple);
      if (!pm) break;

      simSnake.unshift({ x: pm.x, y: pm.y });
      if (pm.x === simApple.x && pm.y === simApple.y) {
        simApple = this._spawnAppleFor(simSnake);
      } else {
        simSnake.pop();
      }

      const key = `${pm.x},${pm.y}`;
      recent.add(key);
      if (recent.size < steps * 0.1 && steps > 10) break;
      if (recent.size > 200) recent.clear();

      steps++;
    }
    return steps;
  }
  _rolloutPolicy(snakeArr, applePos) {
    const head = snakeArr[0];
    const pA   = this._aStarSim(head, applePos, snakeArr);
    if (pA && this._isPathSafeSim(pA, snakeArr)) return pA[1];
    const tail = snakeArr[snakeArr.length - 1];
    const pT   = this._aStarSim(head, tail, snakeArr);
    if (pT && pT.length > 1) return pT[1];
    const moves = this._neighbors(head)
      .filter(n => !snakeArr.slice(1).some(s => s.x === n.x && s.y === n.y));
    return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
  }

  // ─── PATHFINDING UTILITIES ──────────────────────────────────────
  _aStar(start, goal) {
    // delegate to the sim variant but with the real snake
    return this._aStarSim(start, goal, this.snake);
  }

  _aStarSim(start, goal, snakeArr) {
    const key = p => `${p.x},${p.y}`;
    const open = [start], from = {},
          gS = { [key(start)]: 0 },
          fS = { [key(start)]: this._heuristic(start, goal) },
          occ = new Set(snakeArr.map(p => key(p)));

    while (open.length) {
      open.sort((a, b) => fS[key(a)] - fS[key(b)]);
      let cur = open.shift();
      if (cur.x === goal.x && cur.y === goal.y) {
        const path = [cur];
        while (from[key(cur)]) {
          cur = from[key(cur)];
          path.unshift(cur);
        }
        return path;
      }
      this._neighbors(cur).forEach(n => {
        const k = key(n);
        if (occ.has(k) && k !== key(goal)) return;
        const tg = gS[key(cur)] + 1;
        if (tg < (gS[k] || Infinity)) {
          from[k] = cur;
          gS[k]   = tg;
          fS[k]   = tg + this._heuristic(n, goal);
          if (!open.some(x => key(x) === k)) open.push(n);
        }
      });
    }
    return null;
  }

  _isPathSafe(path) {
    // ensure tail-reachability on the real snake
    return this._isPathSafeSim(path, this.snake);
  }

  _isPathSafeSim(path, snakeArr) {
    const sim = snakeArr.map(p => ({ x: p.x, y: p.y }));
    path.slice(1).forEach(pt => sim.unshift({ x: pt.x, y: pt.y }));
    sim.length = snakeArr.length + 1;
    const tail = sim[sim.length - 1];
    const occ  = new Set(sim.map(p => `${p.x},${p.y}`));
    occ.delete(`${tail.x},${tail.y}`);

    const q = [sim[0]];
    const vis = new Set([`${sim[0].x},${sim[0].y}`]);
    while (q.length) {
      const c = q.shift();
      if (c.x === tail.x && c.y === tail.y) return true;
      this._neighbors(c).forEach(n => {
        const k = `${n.x},${n.y}`;
        if (!vis.has(k) && !occ.has(k)) {
          vis.add(k);
          q.push(n);
        }
      });
    }
    return false;
  }

  _spawnAppleFor(snakeArr) {
    let pos;
    do {
      pos = {
        x: Math.floor(Math.random() * this.tileCount),
        y: Math.floor(Math.random() * this.tileCount)
      };
    } while (snakeArr.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  _neighbors(p) {
    return [
      { x: p.x + 1, y: p.y },
      { x: p.x - 1, y: p.y },
      { x: p.x,     y: p.y + 1 },
      { x: p.x,     y: p.y - 1 }
    ].filter(n =>
      n.x >= 0 && n.y >= 0 &&
      n.x < this.tileCount && n.y < this.tileCount
    );
  }

  _isCollision(p) {
    return (
      p.x < 0 || p.y < 0 ||
      p.x >= this.tileCount || p.y >= this.tileCount ||
      this.snake.slice(1).some(s => s.x === p.x && s.y === p.y)
    );
  }

  _heuristic(a,b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  _simulateState(snake, apple, mv) {
    const ns = snake.map(p => ({ x: p.x, y: p.y }));
    ns.unshift({ x: mv.x, y: mv.y });
    if (!(mv.x === apple.x && mv.y === apple.y)) ns.pop();
    return { snake: ns, apple };
  }

  _evaluate(snake, apple) {
    const head = snake[0];
    const dist = Math.abs(head.x - apple.x) + Math.abs(head.y - apple.y);
    const occ  = new Set(snake.map(p => `${p.x},${p.y}`));
    const q    = [{ x: head.x, y: head.y }];
    const vis  = new Set([`${head.x},${head.y}`]);
    while (q.length) {
      const c = q.shift();
      this._neighbors(c).forEach(n => {
        const k = `${n.x},${n.y}`;
        if (!vis.has(k) && !occ.has(k)) {
          vis.add(k);
          q.push(n);
        }
      });
    }
    return snake.length * 100 + vis.size * 2 - dist * 10;
  }

  _draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawTile(this.apple, 'red');
    this.snake.forEach((s, i) => this.drawTile(s, i === 0 ? 'lime' : 'green'));
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
}
