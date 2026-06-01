import './App.css'
import Header from './components/Header.jsx'
import Questions from './pages/Questions'
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

function ScrollToHash() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash])

  return null
}

function Landing() {
  return (
    <div className="app-shell" id="top">
      <div className="hero-layout">
        <Header />
        <section className="hero-section">
          <div className="hero-copy">
            <p className="eyebrow">Recurse Reality</p>
            <h1>Time-travel debugger for recursion</h1>
            <p className="hero-description">
              Explore, modify, and branch recursion execution with a deterministic
              event-driven engine. Every call, return, backtrack, and timeline split
              is modeled as data for powerful visual exploration.
            </p>
            <div className="hero-actions">
              <Link to="/questions" className="button button-primary">
                Get started
              </Link>
              <a href="#about" className="button button-secondary">
                Learn more
              </a>
            </div>
          </div>
        </section>
      </div>

      <section id="about" className="section about-section">
      <div className="section-copy">
        <p className="section-eyebrow">Experience recursion visually</p>
        <h2>Step inside the algorithm</h2>
        <p>
          Recurse Reality transforms recursion and backtracking into an interactive
          experience. Watch recursive calls branch into dynamic trees, replay every
          decision step-by-step, and explore how values travel back through the
          execution flow in both 2D and immersive 3D environments.
        </p>
      </div>

      <div className="architecture-grid">
        <div className="architecture-card">
          Visualize recursive calls as living branching trees
        </div>

        <div className="architecture-card">
          Replay execution step-by-step with timeline controls
        </div>

        <div className="architecture-card">
          Track return values flowing through backtracking paths
        </div>

        <div className="architecture-card">
          Explore recursion interactively in immersive 3D space
        </div>

        <div className="architecture-card">
          Understand algorithms through motion, state, and interaction
        </div>
      </div>
      </section>

      <section id="features" className="section features-section">
        <h2>Key features</h2>
        <div className="features-grid">
          <article className="feature-card">
            <h3>Event-sourced execution</h3>
            <p>
              Every computation step is emitted as an event, making recursion
              transparent and replayable.
            </p>
          </article>
          <article className="feature-card">
            <h3>Backtracking visualization</h3>
            <p>
              Watch return values flow back through the call stack with explicit
              backtrack events.
            </p>
          </article>
          <article className="feature-card">
            <h3>Branching timelines</h3>
            <p>
              Modify the past to spawn alternate recursion paths and compare
              divergent executions.
            </p>
          </article>
          <article className="feature-card">
            <h3>Time travel controls</h3>
            <p>
              Scrub through execution history step by step and rebuild state up to
              any point in time.
            </p>
          </article>
        </div>
      </section>

      <section id="feedback" className="section feedback-section">
        <div className="section-copy">
          <p className="section-eyebrow">Feedback</p>
          <h2>Share your thoughts</h2>
          <p>
            Help us make Recurse Reality better. Submit your name, email, and
            a quick message so we can improve the experience.
          </p>
        </div>
        <form
          className="feedback-form"
          action="https://formspree.io/f/mdajwnlw"
          method="POST"
        >
          <div className="feedback-row">
            <input type="text" name="name" placeholder="Your Name" required />
            <input type="email" name="email" placeholder="Your Email" required />
          </div>
          <textarea name="message" placeholder="Message" rows="6" required />
          <button type="submit" className="button button-primary">
            Send
          </button>
        </form>
      </section>

      <footer id="footer" className="footer-section">
      <div className="footer-brand">
        <p className="footer-eyebrow">Recurse Reality</p>

        <p className="footer-description">
          An interactive recursion and backtracking visualizer that transforms
          algorithms into immersive experiences through animated execution trees,
          replayable timelines, and real-time state exploration in 2D and 3D.
        </p>

        <p className="footer-credit">
          An ⚡  by <span>RD3SH</span>
        </p>
      </div>

      <div className="footer-links">
        <a href="#about">Experience</a>
        <a href="#features">Features</a>
        <a href="#top">Back to top</a>

        <a
          href="https://github.com/RadeshL/Recurse-Reality"
          target="_blank"
          rel="noreferrer"
        >
          GitHub ↗
        </a>
      </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Router>
      <ScrollToHash />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/questions" element={<Questions />} />
      </Routes>
    </Router>
  )
}

export default App
