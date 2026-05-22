// Shared Socket.IO connection — imported by all pages
// socket.js just creates and exports the socket instance

window.socket = io(); // connects to same origin

// Optional: log connection state
window.socket.on('connect', () => {
  console.log('[Socket] Connected:', window.socket.id);
});

window.socket.on('disconnect', () => {
  console.log('[Socket] Disconnected');
});
