import React from 'react'
import FashionAgentUI from './components/FashionAgentUI'
import './App.css'

function App() {
  return (
    <>
    <div className="page__logos">
      <a className="page__logo" href="#" aria-label="Digital Fashion House">
        <img src="assets/logo1.png" alt="Digital Fashion House" />
      </a>
    </div>
    <div className="app">
      <FashionAgentUI />
    </div>
    </>
  )
}

export default App
