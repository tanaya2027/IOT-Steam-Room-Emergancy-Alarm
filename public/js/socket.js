// Initialize Socket.IO connection to backend
const socket = io('http://localhost:8000', {
    withCredentials: true,
    transports: ['websocket', 'polling']
});

// Connection event handlers
socket.on('connect', () => {
    console.log('Connected to backend server');
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

socket.on('disconnect', () => {
    console.log('Disconnected from backend server');
});

// Export socket instance
window.steamRoomSocket = socket; 