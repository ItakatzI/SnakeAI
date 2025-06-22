# Snake AI Showdown

Welcome to **Snake AI Showdown**, a purely vanilla-JS demo of seven ever-smarter snakes battling it out on a 20×20 grid. This README is the project documentation: we explain each AI brain, share debugging war stories, and keep a (slightly hilarious) backlog of TODOs—especially for that rebellious MCTS snake.

🎮<a href="https://ikatzir.com/SnakeAI/" target="_blank"> Live Demo </a>


---

## 📦 Project Structure

```
snake-ai-showdown/
├── index.html        ← Landing page with “Launch Simulation”  
├── game.html         ← 7-tab canvas page, one snake per tab  
├── style.css         ← Dark-neon theme & responsive layout  
├── snake.js          ← Seven AI strategies + core game engine  
└── README.md         ← This file  
```

---

## 🚀 Getting Started

1. **Clone & serve**  
   ```
   git clone https://github.com/yourusername/snake-ai-showdown.git  
   cd snake-ai-showdown  
   # use any static server, e.g. `npx serve .` or `python -m http.server`  
   ```

2. **Open** `http://localhost:5000/index.html` (or your chosen port) in your browser.

---

## 🤖 AI Strategies Deep Dive

We have **seven** AI brains. For each: **Theory**, **Code**, **Outcome**, and a debugging anecdote.

### 1. 🟥 Random AI  
**Theory:** No planning—moves uniformly at random among legal neighbors.  
**Code:**  
```
function chooseRandom() {
  const moves = getNeighbors(head).filter(n => !isCollision(n));
  return moves[Math.floor(Math.random() * moves.length)];
}
```  
**Outcome:** Dies instantly ~30% of the time.  
**Anecdote:** Saw it bump the wall four times in a row—felt like watching drunk instructions.

---

### 2. 🟧 Greedy AI (A*)  
**Theory:** Computes the shortest path to the apple using A* with  
\( g(n)=\) steps from start, \( h(n)=\) Manhattan distance, so \( f(n)=g(n)+h(n)\).  
**Code:**  
```
function chooseGreedy() {
  const path = aStar(head, apple);
  return path ? path[1] : null;
}
```  
**Outcome:** Chases apples but often slams into its own tail.  
**Anecdote:** At 2 AM I forgot to exclude the tail cell—oops, infinite loop!

---

### 3. 🟨 Tail-Aware AI  
**Theory:** “If I eat that apple, can I still reach my tail?”  
1. A* → apple  
2. Simulate growth along that path  
3. BFS/A* from new head to new tail  
**Code:**  
```
function chooseTailAware() {
  const pA = aStar(head, apple);
  if (pA && isPathSafe(pA)) return pA[1];
  const pT = aStar(head, tail);
  return pT ? pT[1] : chooseRandom();
}
```  
**Outcome:** Survives much longer, rarely traps itself.  
**Anecdote:** It actually paused mid-game like it was thinking—so human.

---

### 4. 🟩 Loop-Safe AI  
**Theory:** Builds on Tail-Aware + loop detection & restart:  
1. Go for apple if safe  
2. Else chase tail  
3. Else random  
4. If last 200 heads <10 unique + no growth → `restart()`  
**Code:**  
```
function chooseLoopSafe() {
  if (isSafe(pathToApple)) return pathToApple[1];
  if (pathToTail) return pathToTail[1];
  if (isStuckInLoop()) { restart(); return; }
  return chooseRandom();
}
```  
**Outcome:** Rarely loops forever—mostly.  
**Anecdote:** Still managed a 10-second circling dance once.

---

### 5. 🔵 Lookahead AI (Minimax)  
**Theory:** Depth-3 minimax: simulate your own moves, score each state by  
- **+100× length**  
- **+2× free cells**  
- **−10× distance to apple**  
**Code:**  
```
function chooseLookahead(depth=3) {
  let best, bestScore = -Infinity;
  for (let mv of neighbors(head)) {
    const {snake2, apple2} = simulate(state, mv);
    const score = minimax({snake2, apple2}, depth-1);
    if (score > bestScore) bestScore = score, best = mv;
  }
  return best;
}
```  
**Outcome:** Plans ahead nicely, but sometimes still greedy.  
**Anecdote:** Once it ignored an apple if the risk score was “too high”—I let it win that round.

---

### 6. 🟣 Expectimax AI  
**Theory:** Like lookahead but treat the apple-spawn as a chance node:  
1. Snake moves → maximize  
2. Apple spawns randomly → average over N samples  
**Code:**  
```
function chooseExpectimax(depth=2) {
  // Maximize over moves, then average value over 5 random apple positions
}
```  
**Outcome:** Hesitates on risky apples—feels eerily “safe.”  

---

### 7. ⚫ MCTS AI (Safe Rollouts)  
**Theory:** Monte Carlo Tree Search with a safe-policy rollout:  
1. For each next move, run 20 rollouts (max 60 steps) on a cloned state  
2. Rollout policy: tail-aware → tail-chase → random  
3. Abort rollout early if loop detected  
4. Pick move with highest average survival  
**Code:**  
```
function chooseMCTS(sims=20, maxDepth=60) {
  // For each move, sum(simulateSafeRollout(move, maxDepth)); return argmax
}
```  
**Outcome:** Still loops more than disco dancers.  
**TODO (Funny):**  
- 🔧 Cap loop-break threshold—this snake needs therapy.  
- 🚀 Penalize revisits—teach it shame.

---

## 📝 Function Reference

- **`getNeighbors(pos)`**  
  Returns legal orthogonal neighbors.

- **`aStar(start, goal)`**  
  Classic A* with Manhattan heuristic → path array or `null`.

- **`isPathSafe(path)`**  
  Simulate growth, then BFS from head to tail.

- **`isStuckInLoop()`**  
  Checks last 200 head positions for loops.

- **`simulate(state, move)`**  
  Deep-clones a state for planning.

- **`simulateSafeRollout(move, maxSteps)`**  
  Safe-policy rollout used by MCTS.

---

## 🛠 TODO & Future Work

- **MCTS Refinement**  
  - [ ] Adapt loop-break threshold dynamically  
  - [ ] Penalize revisiting same cell in simulations  
  - [ ] Experiment with UCB1 instead of fixed-sample average

- **Performance**  
  - [ ] Lower simulation counts on mobiles  
  - [ ] Offload heavy work to Web Workers

- **UI/UX**  
  - [ ] Smooth tab transitions (no canvas flash)  
  - [ ] Add live scoreboards & stats per AI

- **Advanced Teasers**  
  - [ ] Genetic Algorithms: evolve decision weights  
  - [ ] Reinforcement Learning: train & import Q-network

Got ideas—or just want to watch the MCTS snake do this loop again? PRs welcome! 🐍🎉

---

## 📝 License

MIT © katzir & 🤖
