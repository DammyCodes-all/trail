import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionGlobalConfig } from 'motion/react';
import App from './App.tsx';
import './../../assets/app.css';

// Honor the OS-level setting: motion components degrade to static state when
// prefers-reduced-motion is set.
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  MotionGlobalConfig.skipAnimations = true;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
