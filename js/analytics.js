// Initialize socket.io connection
const socket = io();

// DOM elements
const dailyUsersCanvas = document.getElementById('daily-users-chart');
const avgTempCanvas = document.getElementById('avg-temperature-chart');
const avgDurationCanvas = document.getElementById('avg-duration-chart');
const sessionsTable = document.getElementById('sessions-table-body');
const dateRangeForm = document.getElementById('date-range-form');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');

// Charts
let dailyUsersChart, avgTempChart, avgDurationChart;

// Chart colors
const chartColors = {
  users: 'rgb(75, 192, 192)',
  temperature: 'rgb(255, 99, 132)',
  duration: 'rgb(54, 162, 235)'
};

// Initialize charts
function initializeCharts() {
  // Daily users chart
  dailyUsersChart = new Chart(dailyUsersCanvas, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [{
        label: 'Number of Users',
        data: [],
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
  
  // Average temperature chart
  avgTempChart = new Chart(avgTempCanvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Average Max Temperature (°C)',
        data: [],
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
  
  // Average duration chart
  avgDurationChart = new Chart(avgDurationCanvas, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Average Session Duration (minutes)',
        data: [],
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

// Fetch daily statistics
function fetchDailyStats(startDate, endDate) {
  let url = '/api/stats/daily';
  
  if (startDate && endDate) {
    url += `?startDate=${startDate}&endDate=${endDate}`;
  }
  
  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        updateDailyCharts(data.data);
      } else {
        console.log('No daily statistics available');
      }
    })
    .catch(error => {
      console.error('Error fetching daily statistics:', error);
    });
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