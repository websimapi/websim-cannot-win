import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App.js';

// --- Global State ---
window.websim = new WebsimSocket();
const lossesCollection = window.websim.collection('losses_v3');
window.lossesCollection = lossesCollection;

// --- App Entry Point ---
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);