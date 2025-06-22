# 🐍 Snake AI Showdown

An interactive simulation comparing four snake-playing AIs side by side. Each AI operates with a different level of intelligence, from random moves to advanced pathfinding with survival logic.

🎮 **Live Demo**: [https://ItakatzI.github.io/SnakeAI](#)

---

## 🤖 AI Strategies Compared

| AI Name       | Description                                       |
|---------------|---------------------------------------------------|
| Random AI     | Picks valid directions randomly. Dumb but fun.    |
| Greedy AI     | Uses A* to reach apples, but may trap itself.     |
| Tail-Aware AI | Checks if the tail is reachable after A*.         |
| Smart AI      | Uses safe A*, tail fallback, loop detection.      |

---

## 🧠 Concepts Illustrated

- Pathfinding (A*)
- Game logic simulation
- Autonomy and safety checks
- Visual AI comparison

---

## 🗂 File Structure
```
/
├── index.html # Landing page
├── game.html # Simulation grid with 4 AIs
├── style.css # Shared styling
├── snake.js # AI logic & simulation engine
└── README.md # Project overview
```
---

## 🛠 How to Run

1. Open `index.html` and click “Start Simulation”
2. Observe all four games auto-play side-by-side
3. Each canvas restarts automatically on failure

---

## 📜 License

MIT — use, remix, or fork freely.

Built with ❤️ by Katzir & AI.