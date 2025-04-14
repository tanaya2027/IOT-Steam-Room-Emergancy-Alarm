// Get the shared socket instance
const socket = window.steamRoomSocket;

// DOM Elements
const activeAlertsContainer = document.getElementById('active-alerts');
const resolvedAlertsContainer = document.getElementById('resolved-alerts');
const alertTemplate = document.getElementById('alert-template');
const filterButtons = document.querySelectorAll('.alerts-filter button');

// Current filter state
let currentFilter = 'all';

// Mock data for testing
const mockAlerts = [
    {
        id: '1',
        type: 'temperature',
        title: 'High Temperature Alert',
        message: 'Temperature exceeded safe threshold',
        temperature: 42.5,
        humidity: 65.2,
        timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
        resolved: false
    },
    {
        id: '2',
        type: 'humidity',
        title: 'High Humidity Alert',
        message: 'Humidity levels are above normal',
        temperature: 38.2,
        humidity: 92.5,
        timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
        resolved: false
    },
    {
        id: '3',
        type: 'system',
        title: 'System Alert',
        message: 'Sensor calibration required',
        temperature: 35.8,
        humidity: 75.0,
        timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
        resolved: false
    },
    {
        id: '4',
        type: 'temperature',
        title: 'High Temperature Alert',
        message: 'Temperature spike detected',
        temperature: 41.2,
        humidity: 68.5,
        timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
        resolved: true
    },
    {
        id: '5',
        type: 'humidity',
        title: 'High Humidity Alert',
        message: 'Excessive moisture detected',
        temperature: 37.5,
        humidity: 95.0,
        timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
        resolved: true
    }
];

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    if (!socket) {
        console.error('Socket connection not available');
        return;
    }

    setupEventListeners();
    renderAlerts(mockAlerts);
});

// Set up event listeners
function setupEventListeners() {
    // Filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setActiveFilter(filter);
            filterAlerts(filter);
        });
    });

    // Socket events
    socket.on('emergency-alert', (alert) => {
        addNewAlert(alert);
        playAlertSound();
    });

    socket.on('alert-resolved', (alertId) => {
        moveAlertToResolved(alertId);
    });
}

// Render alerts in their respective containers
function renderAlerts(alerts) {
    // Clear existing alerts
    activeAlertsContainer.innerHTML = '';
    resolvedAlertsContainer.innerHTML = '';

    // Sort alerts by timestamp, newest first
    const sortedAlerts = [...alerts].sort((a, b) => b.timestamp - a.timestamp);

    sortedAlerts.forEach(alert => {
        const alertElement = createAlertElement(alert);
        if (alert.resolved) {
            resolvedAlertsContainer.appendChild(alertElement);
        } else {
            activeAlertsContainer.appendChild(alertElement);
        }
    });

    // Show "No alerts" message if containers are empty
    if (activeAlertsContainer.children.length === 0) {
        activeAlertsContainer.innerHTML = '<p class="no-alerts">No active alerts</p>';
    }
    if (resolvedAlertsContainer.children.length === 0) {
        resolvedAlertsContainer.innerHTML = '<p class="no-alerts">No resolved alerts</p>';
    }
}

// Create a new alert element from template
function createAlertElement(alert) {
    const element = alertTemplate.content.cloneNode(true);
    const alertCard = element.querySelector('.alert-card');

    // Set alert type icon and class
    const icon = element.querySelector('.alert-icon');
    if (alert.type === 'temperature') {
        icon.className = 'alert-icon fas fa-temperature-high text-danger';
        alertCard.classList.add('temperature-alert');
    } else if (alert.type === 'humidity') {
        icon.className = 'alert-icon fas fa-droplet text-warning';
        alertCard.classList.add('humidity-alert');
    } else {
        icon.className = 'alert-icon fas fa-triangle-exclamation text-warning';
        alertCard.classList.add('system-alert');
    }

    // Set timestamp
    element.querySelector('.alert-timestamp').textContent = new Date(alert.timestamp).toLocaleString();

    // Set title and message
    element.querySelector('.alert-title').textContent = alert.title;
    element.querySelector('.alert-message').textContent = alert.message;

    // Set readings
    element.querySelector('.temperature-reading .value').textContent = `${alert.temperature.toFixed(1)}°C`;
    element.querySelector('.humidity-reading .value').textContent = `${alert.humidity.toFixed(1)}%`;

    // Handle resolve button
    const resolveBtn = element.querySelector('.resolve-btn');
    if (alert.resolved) {
        resolveBtn.remove();
    } else {
        resolveBtn.addEventListener('click', () => resolveAlert(alert.id));
    }

    // Add alert ID for reference
    alertCard.dataset.alertId = alert.id;

    return element;
}

// Filter alerts based on type
function filterAlerts(filter) {
    const alerts = document.querySelectorAll('.alert-card');
    alerts.forEach(alert => {
        if (filter === 'all' || alert.classList.contains(`${filter}-alert`)) {
            alert.style.display = 'block';
        } else {
            alert.style.display = 'none';
        }
    });
}

// Set active filter button
function setActiveFilter(filter) {
    filterButtons.forEach(button => {
        if (button.dataset.filter === filter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    currentFilter = filter;
}

// Resolve an alert
function resolveAlert(alertId) {
    const alert = mockAlerts.find(a => a.id === alertId);
    if (alert) {
        alert.resolved = true;
        renderAlerts(mockAlerts);
    }
}

// Move an alert from active to resolved container
function moveAlertToResolved(alertId) {
    const alertElement = document.querySelector(`[data-alert-id="${alertId}"]`);
    if (alertElement) {
        const resolveBtn = alertElement.querySelector('.resolve-btn');
        if (resolveBtn) {
            resolveBtn.remove();
        }
        resolvedAlertsContainer.insertBefore(alertElement, resolvedAlertsContainer.firstChild);
    }
}

// Add a new alert to the active container
function addNewAlert(alert) {
    const alertElement = createAlertElement(alert);
    activeAlertsContainer.insertBefore(alertElement, activeAlertsContainer.firstChild);
    
    // Remove "No alerts" message if it exists
    const noAlertsMsg = activeAlertsContainer.querySelector('.no-alerts');
    if (noAlertsMsg) {
        noAlertsMsg.remove();
    }
}

// Play alert sound
function playAlertSound() {
    const audio = new Audio('/audio/alert.mp3');
    audio.play().catch(error => {
        console.error('Error playing alert sound:', error);
    });
} 