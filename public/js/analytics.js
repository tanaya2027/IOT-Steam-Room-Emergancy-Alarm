// Initialize socket connection
const socket = io('http://localhost:3000');

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
  }
};

// Time formatting function
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
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

// Chart configurations
const lineChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    title: {
      display: false
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleFont: {
        size: 13,
        weight: '600',
        family: "'Segoe UI', sans-serif"
      },
      bodyFont: {
        size: 12,
        family: "'Segoe UI', sans-serif"
      },
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      callbacks: {
        title: function(tooltipItems) {
          return formatTime(tooltipItems[0].label);
        },
        label: function(context) {
          return ` ${context.parsed.y.toFixed(1)}${context.dataset.unit}`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: false,
      grid: {
        color: 'rgba(255, 255, 255, 0.04)',
        drawBorder: false,
        lineWidth: 1
      },
      border: {
        display: false
      },
      ticks: {
        font: {
          size: 11,
          weight: '500',
          family: "'Segoe UI', sans-serif"
        },
        maxTicksLimit: 6,
        padding: 12,
        color: 'rgba(255, 255, 255, 0.7)'
      },
      suggestedMin: function(context) {
        const values = context.chart.data.datasets[0].data;
        const min = values.length ? Math.min(...values) : 0;
        return min - (min * 0.1);
      },
      suggestedMax: function(context) {
        const values = context.chart.data.datasets[0].data;
        const max = values.length ? Math.max(...values) : 100;
        return max + (max * 0.1);
      }
    },
    x: {
      grid: {
        display: false
      },
      border: {
        display: false
      },
      ticks: {
        font: {
          size: 11,
          weight: '500',
          family: "'Segoe UI', sans-serif"
        },
        maxTicksLimit: 10,
        maxRotation: 0,
        minRotation: 0,
        padding: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        callback: function(value) {
          return formatTime(value);
        },
        source: 'auto',
        align: 'center'
      }
    }
  },
  elements: {
    point: {
      radius: 2,
      hitRadius: 12,
      hoverRadius: 5,
      hoverBorderWidth: 2,
      hoverBackgroundColor: '#fff'
    },
    line: {
      tension: 0.3,
      borderWidth: 3,
      fill: true,
      cubicInterpolationMode: 'monotone'
    }
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false
  },
  animation: {
    duration: 300,
    easing: 'easeOutQuart'
  }
};

const doughnutChartOptions = {
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
        boxWidth: 14,
        padding: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        usePointStyle: true,
        pointStyle: 'circle'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      titleFont: {
        size: 13,
        weight: '600',
        family: "'Segoe UI', sans-serif"
      },
      bodyFont: {
        size: 12,
        family: "'Segoe UI', sans-serif"
      },
      padding: 12,
      cornerRadius: 8,
      displayColors: true,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      callbacks: {
        label: function(context) {
          const value = context.raw;
          const total = context.dataset.data.reduce((a, b) => a + b, 0);
          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return ` ${context.label}: ${value} (${percentage}%)`;
        }
      }
    }
  },
  elements: {
    arc: {
      borderWidth: 2,
      borderColor: 'rgba(17, 24, 39, 0.8)'
    }
  },
  animation: {
    animateRotate: true,
    animateScale: true,
    duration: 800,
    easing: 'easeOutQuart'
  }
};

// Initialize charts
const tempCtx = document.getElementById('temperatureChart').getContext('2d');
const humidityCtx = document.getElementById('humidityChart').getContext('2d');
const alertsCtx = document.getElementById('alertDistributionChart').getContext('2d');

// Create gradient for temperature chart
const tempGradient = tempCtx.createLinearGradient(0, 0, 0, 400);
tempGradient.addColorStop(0, 'rgba(255, 107, 107, 0.2)');
tempGradient.addColorStop(1, 'rgba(255, 107, 107, 0.0)');

// Create gradient for humidity chart
const humidityGradient = humidityCtx.createLinearGradient(0, 0, 0, 400);
humidityGradient.addColorStop(0, 'rgba(78, 205, 196, 0.2)');
humidityGradient.addColorStop(1, 'rgba(78, 205, 196, 0.0)');

// Initialize charts with static data
const temperatureChart = new Chart(tempCtx, {
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
    ...lineChartOptions,
    scales: {
      ...lineChartOptions.scales,
      y: {
        ...lineChartOptions.scales.y,
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: '500',
            family: "'Segoe UI', sans-serif"
          }
        }
      }
    }
  }
});

const humidityChart = new Chart(humidityCtx, {
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
    ...lineChartOptions,
    scales: {
      ...lineChartOptions.scales,
      y: {
        ...lineChartOptions.scales.y,
        title: {
          display: true,
          text: 'Humidity (%)',
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: '500',
            family: "'Segoe UI', sans-serif"
          }
        }
      }
    }
  }
});

const alertDistributionChart = new Chart(alertsCtx, {
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
  options: doughnutChartOptions
});

// Add update indicators to charts
addUpdateIndicator('temperatureChart');
addUpdateIndicator('humidityChart');

// Update static statistics on page load
document.addEventListener('DOMContentLoaded', function() {
  // Update average temperature stats
  document.getElementById('avgTemp').textContent = STATIC_ANALYTICS_DATA.temperature.avg.toFixed(1) + '°C';
  document.getElementById('tempTrend').textContent = STATIC_ANALYTICS_DATA.temperature.trend;
  
  // Update average humidity stats
  document.getElementById('avgHumidity').textContent = STATIC_ANALYTICS_DATA.humidity.avg.toFixed(1) + '%';
  document.getElementById('humidityTrend').textContent = STATIC_ANALYTICS_DATA.humidity.trend;
  
  // Update alerts stats
  document.getElementById('totalAlerts').textContent = STATIC_ANALYTICS_DATA.alerts.total;
  document.getElementById('alertsTrend').textContent = STATIC_ANALYTICS_DATA.alerts.trend;
  
  // Update uptime stats
  document.getElementById('uptimeValue').textContent = STATIC_ANALYTICS_DATA.uptime.value;
  document.getElementById('uptimeTrend').textContent = STATIC_ANALYTICS_DATA.uptime.trend;
  document.getElementById('uptimeDays').textContent = STATIC_ANALYTICS_DATA.uptime.days;
  
  // Update time range buttons
  const timeRangeButtons = document.querySelectorAll('.time-range-btn');
  if (timeRangeButtons.length > 0) {
    timeRangeButtons[0].classList.add('active');
  }
});

// Function to update charts with new data
function updateCharts(range = '1h') {
  // Update temperature chart
  socket.emit('getTemperatureData', { range }, (data) => {
    if (data && data.timestamps && data.values) {
      // Clear existing data
      temperatureChart.data.labels = [];
      temperatureChart.data.datasets[0].data = [];
      
      // Add the new data
      temperatureChart.data.labels = data.timestamps;
      temperatureChart.data.datasets[0].data = data.values;
      
      // Add metadata for tooltips
      temperatureChart.data.datasets[0].formattedLabels = data.labels;
      temperatureChart.data.datasets[0].formattedValues = data.points.map(p => p.formattedValue);
      
      // Update the chart
      temperatureChart.update();
      
      // Show "last updated" timestamp
      const lastUpdatedEl = document.querySelector('#temperatureChart').parentElement.querySelector('.last-updated');
      if (lastUpdatedEl && data.points.length > 0) {
        const lastPoint = data.points[data.points.length - 1];
        lastUpdatedEl.textContent = `Last updated: ${lastPoint.formattedTime}`;
      }
    }
  });
  
  // Update humidity chart
  socket.emit('getHumidityData', { range }, (data) => {
    if (data && data.timestamps && data.values) {
      // Clear existing data
      humidityChart.data.labels = [];
      humidityChart.data.datasets[0].data = [];
      
      // Add the new data
      humidityChart.data.labels = data.timestamps;
      humidityChart.data.datasets[0].data = data.values;
      
      // Add metadata for tooltips
      humidityChart.data.datasets[0].formattedLabels = data.labels;
      humidityChart.data.datasets[0].formattedValues = data.points.map(p => p.formattedValue);
      
      // Update the chart
      humidityChart.update();
      
      // Show "last updated" timestamp
      const lastUpdatedEl = document.querySelector('#humidityChart').parentElement.querySelector('.last-updated');
      if (lastUpdatedEl && data.points.length > 0) {
        const lastPoint = data.points[data.points.length - 1];
        lastUpdatedEl.textContent = `Last updated: ${lastPoint.formattedTime}`;
      }
    }
  });
  
  // Update alert distribution chart
  socket.emit('getAlertDistribution', (data) => {
    if (data) {
      alertDistributionChart.data.datasets[0].data = [
        data.temperatureAlerts || 0,
        data.humidityAlerts || 0,
        data.systemAlerts || 0
      ];
      alertDistributionChart.update();
    }
  });
}

// Update analytics stats
function updateStats() {
  socket.emit('getAnalyticsStats', (data) => {
    if (data) {
      // Update average temperature
      const avgTempEl = document.getElementById('avgTemp');
      if (avgTempEl) avgTempEl.textContent = data.avgTemp.toFixed(1) + '°C';
      
      // Update average humidity
      const avgHumidityEl = document.getElementById('avgHumidity');
      if (avgHumidityEl) avgHumidityEl.textContent = data.avgHumidity.toFixed(1) + '%';
      
      // Update trends
      const tempTrendEl = document.getElementById('tempTrend');
      if (tempTrendEl) {
        const tempTrendValue = data.tempTrend.toFixed(1);
        const trend = data.tempTrend >= 0 ? '+' : '';
        tempTrendEl.textContent = `${trend}${tempTrendValue}%`;
        
        // Update trend icon
        const tempTrendIcon = tempTrendEl.previousElementSibling;
        if (tempTrendIcon) {
          tempTrendIcon.className = data.tempTrend >= 0 ? 
            'fas fa-arrow-trend-up trend-up' : 
            'fas fa-arrow-trend-down trend-down';
        }
      }
      
      const humidityTrendEl = document.getElementById('humidityTrend');
      if (humidityTrendEl) {
        const humidityTrendValue = data.humidityTrend.toFixed(1);
        const trend = data.humidityTrend >= 0 ? '+' : '';
        humidityTrendEl.textContent = `${trend}${humidityTrendValue}%`;
        
        // Update trend icon
        const humidityTrendIcon = humidityTrendEl.previousElementSibling;
        if (humidityTrendIcon) {
          humidityTrendIcon.className = data.humidityTrend >= 0 ? 
            'fas fa-arrow-trend-up trend-up' : 
            'fas fa-arrow-trend-down trend-down';
        }
      }
      
      // Update total alerts
      const totalAlertsEl = document.getElementById('totalAlerts');
      if (totalAlertsEl) totalAlertsEl.textContent = data.totalAlerts;
      
      // Update uptime
      const uptimeEl = document.getElementById('uptime');
      if (uptimeEl) uptimeEl.textContent = data.uptime.toFixed(1) + '%';
    }
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Set up chart update indicators
  addUpdateIndicator('temperatureChart');
  addUpdateIndicator('humidityChart');
  
  // Add "last updated" elements under charts
  const chartContainers = document.querySelectorAll('.chart-container');
  chartContainers.forEach(container => {
    const lastUpdated = document.createElement('div');
    lastUpdated.className = 'last-updated';
    lastUpdated.style.cssText = 'font-size: 11px; color: rgba(255,255,255,0.6); text-align: right; margin-top: 5px;';
    lastUpdated.textContent = 'Fetching data...';
    container.appendChild(lastUpdated);
  });
  
  // Set up time range buttons
  const timeRangeButtons = document.querySelectorAll('.time-range-btn');
  let currentRange = '1h'; // Default range
  
  timeRangeButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      timeRangeButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      // Get the range value from button's data attribute
      currentRange = this.dataset.range || '1h';
      
      // Update charts with the new range
      updateCharts(currentRange);
    });
    
    // Set initial active button
    if (button.dataset.range === currentRange) {
      button.classList.add('active');
    }
  });
  
  // Initial update
  updateCharts(currentRange);
  updateStats();
  
  // Setup auto-refresh
  setInterval(() => {
    updateCharts(currentRange);
    updateStats();
  }, 30000); // Update every 30 seconds
  
  // Listen for live updates
  socket.on('temperature-update', (data) => {
    // Fetch latest data to keep charts in sync
    updateCharts(currentRange);
    updateStats();
  });
  
  socket.on('alert', (data) => {
    // Update alert stats and distribution
    updateStats();
  });
});

// Add styles for update indicator
const style = document.createElement('style');
style.textContent = `
  .update-indicator {
    position: absolute;
    top: 10px;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(17, 24, 39, 0.8);
    padding: 6px 12px;
    border-radius: 16px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .update-indicator .dot {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }
  
  .update-indicator .text {
    font-weight: 500;
  }
  
  @keyframes pulse {
    0% {
      transform: scale(0.95);
      opacity: 0.5;
    }
    50% {
      transform: scale(1.05);
      opacity: 1;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(style); 