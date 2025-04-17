// Initialize socket.io connection
const socket = io('http://localhost:8000', {
  withCredentials: true
});

// DOM elements
const tempDisplay = document.getElementById('temperature-value');
const humidityDisplay = document.getElementById('humidity-value');
const lastUpdateEl = document.getElementById('last-update');
const emergencyContainer = document.getElementById('emergency-alert');
const emergencyTemp = document.getElementById('emergency-temp');
const emergencyMsg = document.getElementById('emergency-message');
const resolveBtn = document.getElementById('resolve-emergency');
const tempChartCanvas = document.getElementById('temperature-chart');
const humidityChartCanvas = document.getElementById('humidity-chart');

// Charts configuration
let tempChart, humidityChart;
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 1000
  },
  scales: {
    x: {
      grid: {
        display: false
      }
    },
    y: {
      beginAtZero: false
    }
  },
  plugins: {
    legend: {
      display: true,
      position: 'top'
    }
  }
};

// STATIC DATA FOR SCREENSHOTS
const STATIC_TEMP_DATA = {
  labels: [
    "10:00", "10:05", "10:10", "10:15", "10:20", "10:25", "10:30", 
    "10:35", "10:40", "10:45", "10:50", "10:55", "11:00", "11:05", 
    "11:10", "11:15", "11:20", "11:25", "11:30", "11:35"
  ],
  temperatures: [
    25.2, 26.3, 27.8, 29.5, 31.2, 33.0, 34.5, 
    36.8, 38.2, 40.1, 41.5, 42.7, 43.9, 45.2, 
    47.0, 48.3, 49.1, 51.5, 53.2, 52.7
  ],
  humidity: [
    62, 60, 58, 57, 55, 52, 50, 
    49, 47, 46, 44, 42, 40, 38, 
    36, 34, 32, 30, 27, 25
  ]
};

// Initialize charts with static data
function initializeCharts() {
  // Temperature chart
  tempChart = new Chart(tempChartCanvas, {
    type: 'line',
    data: {
      labels: STATIC_TEMP_DATA.labels,
      datasets: [{
        label: 'Temperature (°C)',
        data: STATIC_TEMP_DATA.temperatures,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          title: {
            display: true,
            text: 'Temperature (°C)'
          }
        }
      }
    }
  });
  
  // Humidity chart
  humidityChart = new Chart(humidityChartCanvas, {
    type: 'line',
    data: {
      labels: STATIC_TEMP_DATA.labels,
      datasets: [{
        label: 'Humidity (%)',
        data: STATIC_TEMP_DATA.humidity,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        ...chartOptions.scales,
        y: {
          ...chartOptions.scales.y,
          title: {
            display: true,
            text: 'Humidity (%)'
          }
        }
      }
    }
  });
  
  // Set static data for display values
  tempDisplay.textContent = STATIC_TEMP_DATA.temperatures[STATIC_TEMP_DATA.temperatures.length - 1].toFixed(1);
  humidityDisplay.textContent = `${STATIC_TEMP_DATA.humidity[STATIC_TEMP_DATA.humidity.length - 1]}%`;
  lastUpdateEl.textContent = new Date().toLocaleString();
  
  // Show emergency alert with static data
  showStaticEmergencyAlert();
}

// Show static emergency alert for screenshots
function showStaticEmergencyAlert() {
  emergencyContainer.classList.add('active');
  emergencyTemp.textContent = `${STATIC_TEMP_DATA.temperatures[STATIC_TEMP_DATA.temperatures.length - 1].toFixed(1)}°C`;
  emergencyMsg.textContent = `Temperature exceeds emergency threshold of 50°C!`;
}

// Format date for display
function formatDate(date) {
  return new Date(date).toLocaleString();
}

// Update temperature display
function updateTemperatureDisplay(reading) {
  tempDisplay.textContent = reading.temperature.toFixed(1);
  humidityDisplay.textContent = `${reading.humidity.toFixed(1)}%`;
  lastUpdateEl.textContent = formatDate(reading.createdAt);
  
  // Check for emergency
  if (reading.emergency) {
    showEmergencyAlert(reading);
  }
  
  // Update chart
  updateTemperatureChart(reading);
}

// Show emergency alert
function showEmergencyAlert(reading) {
  emergencyContainer.classList.add('active');
  emergencyTemp.textContent = `${reading.temperature.toFixed(1)}°C`;
  emergencyMsg.textContent = `Temperature exceeds emergency threshold of 50°C!`;
  
  // Play alarm sound
  playAlarmSound();
}

// Play alarm sound
function playAlarmSound() {
  const alarmSound = new Audio('/audio/alarm.mp3');
  alarmSound.loop = true;
  alarmSound.play().catch(error => {
    console.error('Error playing alarm sound:', error);
  });
  
  // Store the audio element for later stopping
  window.currentAlarm = alarmSound;
}

// Stop alarm sound
function stopAlarmSound() {
  if (window.currentAlarm) {
    window.currentAlarm.pause();
    window.currentAlarm.currentTime = 0;
    window.currentAlarm = null;
  }
}

// Resolve emergency
function resolveEmergency(emergencyId) {
  fetch(`http://localhost:8000/api/emergencies/${emergencyId}/resolve`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    emergencyContainer.classList.remove('active');
    stopAlarmSound();
  })
  .catch(error => {
    console.error('Error resolving emergency:', error);
  });
}

// Update temperature chart
function updateTemperatureChart(reading) {
  const maxDataPoints = 20;
  
  // Add new data point to temperature chart
  tempChart.data.labels.push(formatDate(reading.createdAt));
  tempChart.data.datasets[0].data.push(reading.temperature);
  
  // Add new data point to humidity chart
  humidityChart.data.labels.push(formatDate(reading.createdAt));
  humidityChart.data.datasets[0].data.push(reading.humidity);
  
  // Limit the number of data points
  if (tempChart.data.labels.length > maxDataPoints) {
    tempChart.data.labels.shift();
    tempChart.data.datasets[0].data.shift();
  }
  
  if (humidityChart.data.labels.length > maxDataPoints) {
    humidityChart.data.labels.shift();
    humidityChart.data.datasets[0].data.shift();
  }
  
  // Update charts
  tempChart.update();
  humidityChart.update();
}

// Fetch historical temperature data
function fetchTemperatureHistory() {
  fetch('http://localhost:8000/api/temperature?limit=20')
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        // Get the most recent reading for display
        const latestReading = data.data[0];
        updateTemperatureDisplay(latestReading);
        
        // Add historical data to charts
        data.data.reverse().forEach(reading => {
          tempChart.data.labels.push(formatDate(reading.createdAt));
          tempChart.data.datasets[0].data.push(reading.temperature);
          
          humidityChart.data.labels.push(formatDate(reading.createdAt));
          humidityChart.data.datasets[0].data.push(reading.humidity);
        });
        
        tempChart.update();
        humidityChart.update();
      }
    })
    .catch(error => {
      console.error('Error fetching temperature history:', error);
    });
}

// Check for active emergencies
function checkActiveEmergencies() {
  fetch('http://localhost:8000/api/emergencies?resolved=false')
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        const latestEmergency = data.data[0];
        showEmergencyAlert(latestEmergency);
        
        // Setup resolve button
        resolveBtn.onclick = () => resolveEmergency(latestEmergency._id);
      }
    })
    .catch(error => {
      console.error('Error checking active emergencies:', error);
    });
}

// Socket.io event handlers
socket.on('temperature-update', (reading) => {
  updateTemperatureDisplay(reading);
});

socket.on('emergency-alert', (alert) => {
  showEmergencyAlert(alert);
  
  // Setup resolve button
  resolveBtn.onclick = () => resolveEmergency(alert._id);
});

socket.on('emergency-resolved', () => {
  emergencyContainer.classList.remove('active');
  stopAlarmSound();
});

socket.on('active-emergencies', (alerts) => {
  if (alerts && alerts.length > 0) {
    const latestEmergency = alerts[0];
    showEmergencyAlert(latestEmergency);
    
    // Setup resolve button
    resolveBtn.onclick = () => resolveEmergency(latestEmergency._id);
  }
});

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  initializeCharts();
  fetchTemperatureHistory();
  checkActiveEmergencies();
  
  // Setup resolve button for general use
  resolveBtn.onclick = () => {
    fetch('http://localhost:8000/api/emergencies?resolved=false')
      .then(response => response.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          resolveEmergency(data.data[0]._id);
        } else {
          emergencyContainer.classList.remove('active');
          stopAlarmSound();
        }
      })
      .catch(error => {
        console.error('Error resolving emergency:', error);
      });
  };
}); 