# Recurse-Reality

An interactive visualization system for understanding recursion through animated flow diagrams and timeline controls.

## 🎯 Overview

Recurse-Reality is a sophisticated React application that visualizes recursive function calls as animated flow diagrams. It transforms complex recursive algorithms into intuitive visual representations, making it perfect for learning, teaching, and debugging recursive logic.

## ✨ Key Features

### 🌳 Recursion Visualization
- **Tree Structure**: Visualizes recursive calls as a hierarchical tree
- **Animated Edges**: Shows function calls and returns with smooth animations
- **Node Values**: Displays accumulated return values in real-time
- **Moving Values**: Animated value propagation along return edges

### ⏱️ Timeline Controls
- **Play/Pause**: Automatic step-by-step execution
- **Step Controls**: Forward/backward navigation through events
- **Speed Control**: Adjustable playback speed (Slow/Normal/Fast)
- **Scrubbable Slider**: Jump to any point in execution timeline
- **Event Panel**: Click events to jump directly to that state

### 🎨 Modern UI
- **Dark Theme**: Professional dark interface with neon accents
- **Grid Background**: Subtle grid pattern for depth
- **Responsive Design**: Adapts to different screen sizes
- **Smooth Animations**: Hardware-accelerated transitions

### 💾 Data Persistence
- **Supabase Integration**: Stores execution sessions in database
- **Event Sourcing**: Replays execution from stored events
- **Session Management**: Multiple execution history

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Recurse-Reality

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Architecture

### Core Components

#### FlowCanvas
Main visualization container that manages:
- ReactFlow integration for node/edge rendering
- Timeline control state management
- Event generation and processing
- Animation orchestration

#### EventPanel
Timeline sidebar displaying:
- Chronological list of CALL/RETURN events
- Click-to-jump functionality
- Current event highlighting

#### CustomNode
Specialized node component showing:
- Function call labels
- Accumulated return values
- Active state styling

#### AnimatedEdge
Enhanced edge component featuring:
- Directional animations
- Moving value displays
- Call/return differentiation

### State Management

#### Hybrid Timeline System
The project uses a sophisticated dual-system approach:

**State Reconstruction** (`projectState`)
- Instant state reconstruction for any timeline position
- Used for slider navigation, event clicks, and rewinding
- Deterministic and reproducible

**Transition Animation** (`playStep`)
- Step-by-step animation for playback mode
- Single edge animation at a time
- Natural execution flow simulation

#### Event Sourcing
- **CALL Events**: Function invocations with parameters
- **RETURN Events**: Function completions with return values
- **Temporal Ordering**: Precise execution sequence
- **State Reconstruction**: Replay from any point

## 🎮 Usage Guide

### Basic Operation

1. **Run Visualization**: Click "Run sum([1,2,3,4,5], 0, 4)" to start
2. **Watch Animation**: Observe the recursive tree being built
3. **Timeline Control**: Use play/pause to control playback
4. **Navigate**: Click events in the panel or use the slider

### Timeline Controls

#### Playback Controls
- **▶️ Play**: Start automatic step-by-step execution
- **⏸ Pause**: Stop automatic playback
- **⏮ Back**: Step backward one event
- **⏭ Forward**: Step forward one event

#### Speed Settings
- **Slow**: 600ms between steps
- **Normal**: 300ms between steps  
- **Fast**: 100ms between steps

#### Navigation
- **Timeline Slider**: Drag to jump to any execution point
- **Event Panel**: Click any event to jump directly
- **Instant Reconstruction**: No animation, immediate state display

### Understanding the Visualization

#### Node Types
- **Root Node**: Initial function call
- **Branch Nodes**: Recursive calls
- **Leaf Nodes**: Base case terminations

#### Edge Types
- **Call Edges** (Green): Function invocations
- **Return Edges** (Red): Value returns with animation

#### Value Display
- **Node Values**: Accumulated results above nodes
- **Moving Values**: Numbers traveling along return edges
- **Final Result**: Complete computation at root

## 🔧 Technical Implementation

### Key Algorithms

#### Recursive Tree Generation
```javascript
function buildTree(arr, l, r, parentId = null, events = []) {
  const currentId = `node-${nodeId++}`;
  
  // CALL event
  events.push({ type: "CALL", id: currentId, l, r, parentId });
  
  if (l === r) {
    // Base case
    events.push({ type: "RETURN", id: currentId, parentId, value: arr[l] });
    return { value: arr[l], id: currentId };
  }
  
  // Recursive case
  const mid = Math.floor((l + r) / 2);
  const left = buildTree(arr, l, mid, currentId, events);
  const right = buildTree(arr, mid + 1, r, currentId, events);
  const result = left.value + right.value;
  
  // RETURN event
  events.push({ type: "RETURN", id: currentId, parentId, value: result });
  return { value: result, id: currentId };
}
```

#### State Projection
```javascript
export function projectState(events, uptoIndex) {
  const state = {
    nodes: [],
    edges: [],
    nodeValues: {},
    activeEdges: new Set(),
    activeNodes: new Set()
  };
  
  // Replay events up to specified index
  for (let i = 0; i <= uptoIndex; i++) {
    const event = events[i];
    // Apply event transformations
  }
  
  return state;
}
```

### Performance Optimizations

#### React Integration
- **useCallback**: Memoized event handlers
- **useEffect**: Optimized side effects
- **State Management**: Minimal re-renders
- **Component Splitting**: Focused responsibility

#### Animation Engine
- **RequestAnimationFrame**: Smooth 60fps animations
- **Cancellation Tokens**: Clean animation interruption
- **State Isolation**: Prevents animation conflicts
- **Memory Management**: Efficient cleanup

## 🎨 Customization

### Styling
- **Color Scheme**: Modify CSS variables for themes
- **Animation Timing**: Adjust `EDGE_DURATION` and `NODE_DELAY`
- **Layout Spacing**: Configure tree layout parameters

### Algorithms
- **Recursive Function**: Replace `buildTree` with custom logic
- **Event Types**: Extend with new event categories
- **Visualization**: Add custom node/edge types

## 🐛 Troubleshooting

### Common Issues

#### Animation Not Playing
- Check browser console for errors
- Ensure ReactFlow dependencies are loaded
- Verify event generation completed successfully

#### Timeline Controls Not Responsive
- Wait for current animation to complete
- Check if `isAnimating` state is blocking
- Try pausing and restarting playback

#### Database Connection Issues
- Verify Supabase configuration in `.env`
- Check network connectivity
- Confirm API key permissions

### Debug Mode
Enable detailed logging by setting:
```javascript
const DEBUG = true;
```

This will output detailed state transitions and event processing to the console.

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Code Style
- **ESLint**: Follow configured linting rules
- **Prettier**: Use consistent formatting
- **TypeScript**: Strong typing where applicable
- **Comments**: Document complex algorithms

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Submit pull request with description

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **ReactFlow**: Powerful graph visualization library
- **Supabase**: Backend-as-a-Service platform
- **Vite**: Fast development build tool
- **Tailwind CSS**: Utility-first CSS framework

## 📞 Support

For questions, issues, or contributions:
- Create an issue in the repository
- Check existing documentation
- Review example implementations

---

**Recurse-Reality** - Making recursion visible, one call at a time.
