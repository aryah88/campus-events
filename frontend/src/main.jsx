// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// import toaster
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {/* toaster for success/error messages */}
    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
  </React.StrictMode>
)
