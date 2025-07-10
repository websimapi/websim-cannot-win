// --- Global State ---
const room = new WebsimSocket();
const lossesCollection = room.collection('losses_v3');

// --- App Entry Point ---
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<App />);