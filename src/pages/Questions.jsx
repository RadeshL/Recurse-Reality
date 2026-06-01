import Header from '../components/Header'
import './questions.css'

export default function Questions() {
  return (
    <div className="questions-page">
      <Header />
      <main className="questions-container">
        <div className="question-card">
          <p className="question-text">Given an array [1,2,3,4,5], find the sum of the elements in the array</p>
        </div>
      </main>
    </div>
  )
}
