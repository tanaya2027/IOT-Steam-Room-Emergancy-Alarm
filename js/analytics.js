// Initialize socket.io connection
const socket = io();

// STATIC DATA FOR SCREENSHOTS
const STATIC_ANALYTICS_DATA = {
  temperature: {
    current: 52.7,
    avg: 39.8,
    trend: '+2.3%',
    hourly: [25.2, 26.3, 27.8, 29.5, 31.2, 33.0, 34.5, 36.8, 38.2, 40.1, 41.5, 42.7, 43.9, 45.2, 47.0, 48.3, 49.1, 51.5, 53.2, 52.7],
    hourlyLabels: Array.from({length: 20}, (_, i) => new Date(Date.now() - (19-i) * 180000).getTime())
  },
  humidity: {
    current: 25,
    avg: 43.7,
    trend: '-4.2%',
    hourly: [62, 60, 58, 57, 55, 52, 50, 49, 47, 46, 44, 42, 40, 38, 36, 34, 32, 30, 27, 25],
    hourlyLabels: Array.from({length: 20}, (_, i) => new Date(Date.now() - (19-i) * 180000).getTime())
  },
  alerts: {
    total: 7,
    trend: '+40%',
    distribution: [5, 1, 1],
    distributionLabels: ['Temperature', 'Humidity', 'System']
  },
  uptime: {
    value: '99.8%',
    trend: '+0.3%',
    days: '312'
  },
  users: {
    daily: [15, 18, 22, 19, 25, 27, 24],
    dailyLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    total: 150,
    avgPerDay: 21.4
  },
  sessions: {
    avgDuration: 28.5, // minutes
    avgTemp: 38.2, // °C
    avgMaxTemp: 45.6 // °C
  }
};

// DOM elements
const dailyUsersCanvas = document.getElementById('daily-users-chart');
const avgTempCanvas = document.getElementById('avg-temperature-chart');
const avgDurationCanvas = document.getElementById('avg-duration-chart');
const sessionsTable = document.getElementById('sessions-table-body');
const dateRangeForm = document.getElementById('date-range-form');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

// Temperature and humidity analytics chart elements
const temperatureChartCanvas = document.getElementById('temperatureChart');
const humidityChartCanvas = document.getElementById('humidityChart');
const alertDistributionChartCanvas = document.getElementById('alertDistributionChart');

// Charts
let dailyUsersChart, avgTempChart, avgDurationChart;
let temperatureChart, humidityChart, alertDistributionChart;

// Chart colors
const chartColors = {
  users: 'rgb(75, 192, 192)',
  temperature: 'rgb(255, 99, 132)',
  humidity: 'rgb(54, 162, 235)',
  duration: 'rgb(54, 162, 235)'
};

// Initialize charts with static data
function initializeCharts() {
  // Initialize temperature chart if element exists
  if (temperatureChartCanvas) {
    // Create gradient for temperature chart
    const tempCtx = temperatureChartCanvas.getContext('2d');
    const tempGradient = tempCtx.createLinearGradient(0, 0, 0, 400);
    tempGradient.addColorStop(0, 'rgba(255, 107, 107, 0.2)');
    tempGradient.addColorStop(1, 'rgba(255, 107, 107, 0.0)');
    
    temperatureChart = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: STATIC_ANALYTICS_DATA.temperature.hourlyLabels,
        datasets: [{
          data: STATIC_ANALYTICS_DATA.temperature.hourly,
          borderColor: '#ff6b6b',
          backgroundColor: tempGradient,
          fill: true,
          borderWidth: 3,
          unit: '°C'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            callbacks: {
              label: function(context) {
                return ` ${context.parsed.y.toFixed(1)}°C`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // Initialize humidity chart if element exists
  if (humidityChartCanvas) {
    // Create gradient for humidity chart
    const humidityCtx = humidityChartCanvas.getContext('2d');
    const humidityGradient = humidityCtx.createLinearGradient(0, 0, 0, 400);
    humidityGradient.addColorStop(0, 'rgba(78, 205, 196, 0.2)');
    humidityGradient.addColorStop(1, 'rgba(78, 205, 196, 0.0)');
    
    humidityChart = new Chart(humidityCtx, {
      type: 'line',
      data: {
        labels: STATIC_ANALYTICS_DATA.humidity.hourlyLabels,
        datasets: [{
          data: STATIC_ANALYTICS_DATA.humidity.hourly,
          borderColor: '#4ecdc4',
          backgroundColor: humidityGradient,
          fill: true,
          borderWidth: 3,
          unit: '%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            callbacks: {
              label: function(context) {
                return ` ${context.parsed.y.toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: {
              display: true,
              text: 'Humidity (%)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  // Initialize alert distribution chart if element exists
  if (alertDistributionChartCanvas) {
    alertDistributionChart = new Chart(alertDistributionChartCanvas, {
      type: 'doughnut',
      data: {
        labels: STATIC_ANALYTICS_DATA.alerts.distributionLabels,
        datasets: [{
          data: STATIC_ANALYTICS_DATA.alerts.distribution,
          backgroundColor: [
            '#ff6b6b',
            '#4ecdc4',
            '#ffd93d'
          ],
          borderColor: 'rgba(17, 24, 39, 0.8)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        radius: '90%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                size: 12,
                weight: '500',
                family: "'Segoe UI', sans-serif"
              },
              color: 'rgba(255, 255, 255, 0.9)'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(17, 24, 39, 0.95)'
          }
        }
      }
    });
  }
  
  // Daily users chart
  if (dailyUsersCanvas) {
    dailyUsersChart = new Chart(dailyUsersCanvas, {
      type: 'bar',
      data: {
        labels: STATIC_ANALYTICS_DATA.users.dailyLabels,
        datasets: [{
          label: 'Number of Users',
          data: STATIC_ANALYTICS_DATA.users.daily,
          backgroundColor: chartColors.users,
          borderColor: chartColors.users,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Number of Users'
            },
            ticks: {
              precision: 0
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  }
  
  // Average temperature chart - Use last 7 days of hourly data averaged
  if (avgTempCanvas) {
    avgTempChart = new Chart(avgTempCanvas, {
      type: 'line',
      data: {
        labels: STATIC_ANALYTICS_DATA.users.dailyLabels,
        datasets: [{
          label: 'Average Max Temperature (°C)',
          data: [37.2, 38.5, 40.1, 42.3, 45.6, 48.2, 52.7],
          borderColor: chartColors.temperature,
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Temperature (°C)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  }
  
  // Average duration chart
  if (avgDurationCanvas) {
    avgDurationChart = new Chart(avgDurationCanvas, {
      type: 'line',
      data: {
        labels: STATIC_ANALYTICS_DATA.users.dailyLabels,
        datasets: [{
          label: 'Average Session Duration (minutes)',
          data: [25.3, 26.5, 24.8, 27.2, 29.5, 32.1, 34.2],
          borderColor: chartColors.duration,
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            title: {
              display: true,
              text: 'Duration (minutes)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Date'
            }
          }
        }
      }
    });
  }
  
  // Update summary statistics with static data
  updateSummaryStatsWithStaticData();
  
  // Fill sessions table with static data
  if (sessionsTable) {
    populateSessionsTableWithStaticData();
  }
  
  // Add update indicators to charts
  if (typeof addUpdateIndicator === 'function') {
    if (temperatureChartCanvas) addUpdateIndicator('temperatureChart');
    if (humidityChartCanvas) addUpdateIndicator('humidityChart');
  }
}

// Add update indicator to charts
function addUpdateIndicator(chartId) {
  const container = document.getElementById(chartId).parentElement;
  const indicator = document.createElement('div');
  indicator.className = 'update-indicator';
  indicator.innerHTML = `
    <span class="dot"></span>
    <span class="text">Live - Updated every 3s</span>
  `;
  container.appendChild(indicator);
}

// Update summary statistics with static data
function updateSummaryStatsWithStaticData() {
  if (document.getElementById('total-users')) 
    document.getElementById('total-users').textContent = STATIC_ANALYTICS_DATA.users.total;
  if (document.getElementById('avg-users'))
    document.getElementById('avg-users').textContent = STATIC_ANALYTICS_DATA.users.avgPerDay.toFixed(1);
  if (document.getElementById('avg-max-temp'))
    document.getElementById('avg-max-temp').textContent = `${STATIC_ANALYTICS_DATA.sessions.avgMaxTemp.toFixed(1)}°C`;
  if (document.getElementById('avg-session-time'))
    document.getElementById('avg-session-time').textContent = formatDuration(Math.round(STATIC_ANALYTICS_DATA.sessions.avgDuration * 60));
  
  // Update the analytics cards
  if (document.getElementById('avgTemp'))
    document.getElementById('avgTemp').textContent = STATIC_ANALYTICS_DATA.temperature.avg.toFixed(1) + '°C';
  if (document.getElementById('tempTrend'))
    document.getElementById('tempTrend').textContent = STATIC_ANALYTICS_DATA.temperature.trend;
  if (document.getElementById('avgHumidity'))
    document.getElementById('avgHumidity').textContent = STATIC_ANALYTICS_DATA.humidity.avg.toFixed(1) + '%';
  if (document.getElementById('humidityTrend'))
    document.getElementById('humidityTrend').textContent = STATIC_ANALYTICS_DATA.humidity.trend;
  if (document.getElementById('totalAlerts'))
    document.getElementById('totalAlerts').textContent = STATIC_ANALYTICS_DATA.alerts.total;
  if (document.getElementById('uptimeValue'))
    document.getElementById('uptimeValue').textContent = STATIC_ANALYTICS_DATA.uptime.value;
  if (document.getElementById('uptime'))
    document.getElementById('uptime').textContent = STATIC_ANALYTICS_DATA.uptime.value;
}

// Populate sessions table with static data
function populateSessionsTableWithStaticData() {
  sessionsTable.innerHTML = '';
  
  // Create some sample session data
  const today = new Date();
  const sessions = [
    { date: new Date(today - 2 * 60 * 60 * 1000), user: 'User 123', duration: 32, maxTemp: 51.7 },
    { date: new Date(today - 5 * 60 * 60 * 1000), user: 'User 456', duration: 25, maxTemp: 48.3 },
    { date: new Date(today - 8 * 60 * 60 * 1000), user: 'User 789', duration: 18, maxTemp: 43.9 },
    { date: new Date(today - 12 * 60 * 60 * 1000), user: 'User 234', duration: 42, maxTemp: 47.2 },
    { date: new Date(today - 24 * 60 * 60 * 1000), user: 'User 567', duration: 22, maxTemp: 39.5 }
  ];
  
  sessions.forEach(session => {
    const row = document.createElement('tr');
    
    // Date & time
    const dateCell = document.createElement('td');
    dateCell.textContent = session.date.toLocaleString();
    row.appendChild(dateCell);
    
    // User ID
    const userCell = document.createElement('td');
    userCell.textContent = session.user;
    row.appendChild(userCell);
    
    // Duration
    const durationCell = document.createElement('td');
    durationCell.textContent = formatDuration(session.duration * 60);
    row.appendChild(durationCell);
    
    // Max temperature
    const tempCell = document.createElement('td');
    tempCell.textContent = `${session.maxTemp.toFixed(1)}°C`;
    row.appendChild(tempCell);
    
    sessionsTable.appendChild(row);
  });
}

// Format date for display
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

// Format duration from seconds to minutes:seconds
function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Replace fetchDailyStats with a function that uses static data
function fetchDailyStats(startDate, endDate) {
  // Update charts with static data directly
  updateDailyCharts([]);
}

// Fetch session data
function fetchSessions(startDate, endDate) {
  let url = '/api/sessions';
  
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`;
  }
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        updateSessionsTable(data.data);
      } else {
        sessionsTable.innerHTML = '<tr><td colspan="4">No session data available</td></tr>';
      }
    })
    .catch(error => {
      console.error('Error fetching session data:', error);
    });
}

// Update daily charts with statistics
function updateDailyCharts(stats) {
  // Clear existing data
  dailyUsersChart.data.labels = [];
  dailyUsersChart.data.datasets[0].data = [];
  
  avgTempChart.data.labels = [];
  avgTempChart.data.datasets[0].data = [];
  
  avgDurationChart.data.labels = [];
  avgDurationChart.data.datasets[0].data = [];
  
  // Add new data
  stats.forEach(day => {
    const dateLabel = formatDate(day._id);
    
    // Daily users chart
    dailyUsersChart.data.labels.push(dateLabel);
    dailyUsersChart.data.datasets[0].data.push(day.count);
    
    // Average temperature chart
    avgTempChart.data.labels.push(dateLabel);
    avgTempChart.data.datasets[0].data.push(day.avgMaxTemperature.toFixed(1));
    
    // Average duration chart (convert seconds to minutes)
    avgDurationChart.data.labels.push(dateLabel);
    avgDurationChart.data.datasets[0].data.push((day.avgDuration / 60).toFixed(1));
  });
  
  // Update charts
  dailyUsersChart.update();
  avgTempChart.update();
  avgDurationChart.update();
  
  // Update summary statistics
  updateSummaryStats(stats);
}

// Update summary statistics
function updateSummaryStats(stats) {
  const totalUsers = stats.reduce((sum, day) => sum + day.count, 0);
  const avgUsersPerDay = totalUsers / stats.length;
  
  const avgMaxTemp = stats.reduce((sum, day) => sum + day.avgMaxTemperature, 0) / stats.length;
  
  const avgSessionDuration = stats.reduce((sum, day) => sum + day.avgDuration, 0) / stats.length;
  
  document.getElementById('total-users').textContent = totalUsers;
  document.getElementById('avg-users').textContent = avgUsersPerDay.toFixed(1);
  document.getElementById('avg-max-temp').textContent = `${avgMaxTemp.toFixed(1)}°C`;
  document.getElementById('avg-session-time').textContent = formatDuration(Math.round(avgSessionDuration));
}

// Update sessions table
function updateSessionsTable(sessions) {
  sessionsTable.innerHTML = '';
  
  sessions.forEach(session => {
    const row = document.createElement('tr');
    
    // Date & time
    const dateCell = document.createElement('td');
    dateCell.textContent = new Date(session.date).toLocaleString();
    row.appendChild(dateCell);
    
    // Duration
    const durationCell = document.createElement('td');
    durationCell.textContent = formatDuration(session.duration);
    row.appendChild(durationCell);
    
    // Max temperature
    const tempCell = document.createElement('td');
    tempCell.textContent = `${session.maxTemperature.toFixed(1)}°C`;
    row.appendChild(tempCell);
    
    // Device ID
    const deviceCell = document.createElement('td');
    deviceCell.textContent = session.deviceId;
    row.appendChild(deviceCell);
    
    sessionsTable.appendChild(row);
  });
}

// Handle date range form submission
function handleDateRangeSubmit(event) {
  event.preventDefault();
  
  const startDate = startDateInput.value;
  const endDate = endDateInput.value;
  
  if (startDate && endDate) {
    fetchDailyStats(startDate, endDate);
    fetchSessions(startDate, endDate);
  }
}

// Add document ready event listener to initialize charts
document.addEventListener('DOMContentLoaded', function() {
  // Initialize all charts with static data
  initializeCharts();
  
  // Set up time range buttons for temperature and humidity charts
  setupTimeRangeButtons();
});

// Set up time range buttons
function setupTimeRangeButtons() {
  const timeRangeButtons = document.querySelectorAll('.time-range-btn');
  if (timeRangeButtons.length > 0) {
    timeRangeButtons.forEach(button => {
      button.addEventListener('click', function() {
        // Find the parent chart container to only affect buttons in that container
        const chartContainer = this.closest('.chart-container');
        if (!chartContainer) return;
        
        // Remove active class from all buttons in this container only
        chartContainer.querySelectorAll('.time-range-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // Add active class to the clicked button
        this.classList.add('active');
      });
    });
  }
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', () => {
  // Set default date range (last 7 days)
  const today = new Date();
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  endDateInput.valueAsDate = today;
  startDateInput.valueAsDate = lastWeek;
  
  // Initialize charts
  initializeCharts();
  
  // Fetch initial data
  fetchDailyStats(startDateInput.value, endDateInput.value);
  fetchSessions(startDateInput.value, endDateInput.value);
  
  // Listen for form submission
  dateRangeForm.addEventListener('submit', handleDateRangeSubmit);
  
  // Listen for socket events
  socket.on('session-update', () => {
    // Refresh data when a new session is recorded
    fetchDailyStats(startDateInput.value, endDateInput.value);
    fetchSessions(startDateInput.value, endDateInput.value);
  });
}); 