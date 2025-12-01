import React from 'react'
import FashionAgentUI from './components/FashionAgentUI'
import './App.css'

function App() {
  return (
    <>
    <div className="page__logos">
      <a className="page__logo" href="#" aria-label="Trent Digital Fashion House">
        <img src="assets/logo1.png" alt="Trent Digital Fashion House" />
      </a>
      <a className="page__logo page__logo--secondary" href="#" aria-label="Trent Digital Fashion House Partner">
        <img src="assets/logo2.png" alt="Trent Digital Fashion House Partner" />
      </a>
    </div>
    <div className="app">
      <FashionAgentUI />
    </div>
    </>
  )
}

export default App
