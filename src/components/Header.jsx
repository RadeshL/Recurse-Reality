import { Link } from 'react-router-dom'

function Header() {
  return (
    <header className="site-header">
      <div className="brand">
        <div style = {{display : "flex", alignItems : "center", gap : "15px"}}>
          <img src = "/logo4.png" width = {50} height={50}></img>
          <p className="brand-title">Recurse Reality</p>
        </div>
      </div>
      <nav className="nav-links">
        <Link to="/#about">Architecture</Link>
        <Link to="/#features">Features</Link>
        <Link to="/#feedback">Feedback</Link>
      </nav>
    </header>
  )
}

export default Header
