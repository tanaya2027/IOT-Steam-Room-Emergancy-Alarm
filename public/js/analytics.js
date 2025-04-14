// Initialize socket connection
const socket = io('http://localhost:3000');

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

const temperatureChart = new Chart(tempCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      data: [],
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
          },
          padding: { bottom: 10 }
        }
      }
    }
  }
});

const humidityChart = new Chart(humidityCtx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      data: [],
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
          },
          padding: { bottom: 10 }
        }
      }
    }
  }
});

const alertDistributionChart = new Chart(alertsCtx, {
  type: 'doughnut',
  data: {
    labels: ['Temperature', 'Humidity', 'System'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: [
        'rgba(255, 107, 107, 0.85)',
        'rgba(78, 205, 196, 0.85)',
        'rgba(255, 217, 61, 0.85)'
      ],
      hoverBackgroundColor: [
        'rgba(255, 107, 107, 1)',
        'rgba(78, 205, 196, 1)',
        'rgba(255, 217, 61, 1)'
      ],
      borderColor: 'rgba(17, 24, 39, 0.8)',
      borderWidth: 2,
      hoverBorderColor: 'rgba(255, 255, 255, 0.1)',
      hoverOffset: 5
    }]
  },
  options: doughnutChartOptions
});

// Current time range for charts
let currentRange = '20m';

// Update charts based on time range
function updateCharts() {
  const now = Date.now();
  
  socket.emit('getTemperatureData', { range: currentRange }, (data) => {
    const timestamps = data.labels.map(timestamp => new Date(timestamp).getTime());
    temperatureChart.data.labels = timestamps;
    temperatureChart.data.datasets[0].data = data.values;
    temperatureChart.update('none'); // Update without animation for smoother transitions
  });

  socket.emit('getHumidityData', { range: currentRange }, (data) => {
    const timestamps = data.labels.map(timestamp => new Date(timestamp).getTime());
    humidityChart.data.labels = timestamps;
    humidityChart.data.datasets[0].data = data.values;
    humidityChart.update('none'); // Update without animation for smoother transitions
  });

  socket.emit('getAlertDistribution', (data) => {
    alertDistributionChart.data.datasets[0].data = [
      data.temperatureAlerts,
      data.humidityAlerts,
      data.systemAlerts
    ];
    alertDistributionChart.update('none');
  });

  updateStats();
}

// Update statistics
function updateStats() {
  socket.emit('getAnalyticsStats', (stats) => {
    document.getElementById('avgTemp').textContent = `${stats.avgTemp.toFixed(1)}°C`;
    document.getElementById('avgHumidity').textContent = `${stats.avgHumidity.toFixed(1)}%`;
    document.getElementById('totalAlerts').textContent = stats.totalAlerts;
    document.getElementById('uptime').textContent = `${stats.uptime.toFixed(1)}%`;

    // Update trends
    const tempTrendEl = document.getElementById('tempTrend');
    const humidityTrendEl = document.getElementById('humidityTrend');

    tempTrendEl.textContent = `${Math.abs(stats.tempTrend).toFixed(1)}%`;
    tempTrendEl.className = stats.tempTrend > 0 ? 'trend-up' : 'trend-down';

    humidityTrendEl.textContent = `${Math.abs(stats.humidityTrend).toFixed(1)}%`;
    humidityTrendEl.className = stats.humidityTrend > 0 ? 'trend-up' : 'trend-down';
  });
}

// Handle time range buttons
document.querySelectorAll('.time-range-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelector('.time-range-btn.active').classList.remove('active');
    btn.classList.add('active');
    currentRange = btn.dataset.range;
    updateCharts();
  });
});

// Real-time temperature updates
socket.on('temperature-update', (data) => {
  if (currentRange === '20m') {
    updateCharts();
  }
});

// Initialize charts and add update indicators
document.addEventListener('DOMContentLoaded', () => {
  addUpdateIndicator('temperatureChart');
  addUpdateIndicator('humidityChart');
  
  // Initial update
  updateCharts();
  
  // Set up auto-refresh every 3 seconds
  setInterval(updateCharts, 3000);
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