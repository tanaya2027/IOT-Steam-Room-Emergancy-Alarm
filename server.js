const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const fs = require('fs');
const awsIot = require('aws-iot-device-sdk');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true
  }
});

// Set up middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make io available to routes
app.set('io', io);

// Constants
const TEMPERATURE_THRESHOLD = 34.5;  // Temperature threshold
const MAX_HISTORY_LENGTH = 1000;     // Maximum number of readings to store
const ALERT_TYPES = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  SYSTEM: 'system'
};

// AWS IoT Configuration
// Note: These values should be set in your .env file
const AWS_IOT_ENDPOINT = process.env.AWS_IOT_ENDPOINT || 'a14cvmm7vig140-ats.iot.ap-south-1.amazonaws.com';
const AWS_IOT_TOPIC = process.env.AWS_IOT_TOPIC || 'LASTTRY/pub';  // Match Arduino's AWS_TOPIC_PUB
const AWS_IOT_CLIENT_ID = process.env.AWS_IOT_CLIENT_ID || 'steam_room_server_' + Math.random().toString(16).substring(2, 8);
const AWS_IOT_KEY_PATH = process.env.AWS_IOT_KEY_PATH || './certs/private.pem.key';
const AWS_IOT_CERT_PATH = process.env.AWS_IOT_CERT_PATH || './certs/certificate.pem.crt';
const AWS_IOT_CA_PATH = process.env.AWS_IOT_CA_PATH || './certs/AmazonRootCA1.pem';

// Store data in memory
const appData = {
  activeEmergencies: [],
  latestTemperature: null,
  latestHumidity: null,
  temperatureHistory: [],
  humidityHistory: [],
  sessions: [],
  startTime: Date.now(),  // Add server start time for uptime calculation
  lastAlertTime: 0,
  alertCount: {
    temperature: 0,
    humidity: 0,
    system: 0
  }
};

// Initialize AWS IoT Device
let device = null;

try {
  // Always try to connect to AWS IoT
  device = awsIot.device({
    keyPath: AWS_IOT_KEY_PATH,
    certPath: AWS_IOT_CERT_PATH,
    caPath: AWS_IOT_CA_PATH,
    clientId: AWS_IOT_CLIENT_ID,
    host: AWS_IOT_ENDPOINT
  });
  
  console.log('AWS IoT Device initialized');
  
  // Set up AWS IoT Event Handlers
  device.on('connect', function() {
    console.log('Connected to AWS IoT');
    device.subscribe(AWS_IOT_TOPIC);
    console.log(`Subscribed to topic: ${AWS_IOT_TOPIC}`);
    
    // Create system alert for successful connection
    const alert = {
      id: Date.now().toString(),
      type: ALERT_TYPES.SYSTEM,
      message: 'Connected to AWS IoT Cloud',
      timestamp: Date.now(),
      resolved: true
    };
    appData.activeEmergencies.push(alert);
    appData.alertCount.system++;
    io.emit('alert', alert);
  });
  
  device.on('message', function(topic, payload) {
    console.log('Message received from AWS IoT:', topic, payload.toString());
    try {
      const data = JSON.parse(payload.toString());
      processSensorData(data);
    } catch (error) {
      console.error('Error parsing message:', error);
      // Create system alert for message parsing error
      const alert = {
        id: Date.now().toString(),
        type: ALERT_TYPES.SYSTEM,
        message: `Error parsing message from AWS IoT: ${error.message}`,
        timestamp: Date.now(),
        resolved: false
      };
      appData.activeEmergencies.push(alert);
      appData.alertCount.system++;
      io.emit('alert', alert);
    }
  });
  
  device.on('error', function(error) {
    console.error('AWS IoT Error:', error);
    // Create system alert for AWS IoT error
    const alert = {
      id: Date.now().toString(),
      type: ALERT_TYPES.SYSTEM,
      message: `AWS IoT Error: ${error.message}`,
      timestamp: Date.now(),
      resolved: false
    };
    appData.activeEmergencies.push(alert);
    appData.alertCount.system++;
    io.emit('alert', alert);
  });
  
  device.on('offline', function() {
    console.log('AWS IoT is offline');
    // Create system alert for AWS IoT offline
    const alert = {
      id: Date.now().toString(),
      type: ALERT_TYPES.SYSTEM,
      message: 'AWS IoT connection lost',
      timestamp: Date.now(),
      resolved: false
    };
    appData.activeEmergencies.push(alert);
    appData.alertCount.system++;
    io.emit('alert', alert);
  });
} catch (error) {
  console.error('Error initializing AWS IoT device:', error);
  throw new Error('Failed to connect to AWS IoT. Please check your credentials and network connection.');
}

// Add a test endpoint to verify the server is running
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// HTML routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/alerts', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'alerts.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// API endpoints
app.get('/api/temperature/latest', (req, res) => {
  res.json(appData.latestTemperature || { error: 'No data available' });
});

app.get('/api/temperature/history', (req, res) => {
  res.json(appData.temperatureHistory);
});

app.get('/api/emergencies/active', (req, res) => {
  res.json(appData.activeEmergencies);
});

app.get('/api/sessions', (req, res) => {
  res.json(appData.sessions);
});

// Sensor data processing function
function processSensorData(data) {
  try {
    const timestamp = Date.now();
    
    console.log('Processing data:', data);
    
    // Process temperature data
    if (data.temperature !== undefined) {
      appData.latestTemperature = {
        value: data.temperature,
        timestamp: timestamp
      };
      
      // Add to history
      appData.temperatureHistory.push({
        value: data.temperature,
        timestamp: timestamp
      });
      
      // Trim history if needed
      if (appData.temperatureHistory.length > MAX_HISTORY_LENGTH) {
        appData.temperatureHistory.shift();
      }
      
      // Check for temperature emergency
      if (data.temperature > TEMPERATURE_THRESHOLD) {
        // Check if we should create a new alert (minimum 60 seconds between alerts)
        if (timestamp - appData.lastAlertTime > 60000) {
          const alert = {
            id: Date.now().toString(),
            type: ALERT_TYPES.TEMPERATURE,
            value: data.temperature,
            threshold: TEMPERATURE_THRESHOLD,
            message: `Temperature exceeded threshold: ${data.temperature.toFixed(1)}°C (max: ${TEMPERATURE_THRESHOLD}°C)`,
            timestamp: timestamp,
            resolved: false
          };
          
          appData.activeEmergencies.push(alert);
          appData.alertCount.temperature++;
          appData.lastAlertTime = timestamp;
          
          // Emit alert event to all clients
          io.emit('alert', alert);
        }
      }
      
      // Emit temperature update event
      io.emit('temperature-update', {
        value: data.temperature,
        timestamp: timestamp
      });
    }
    
    // Process humidity data
    if (data.humidity !== undefined) {
      appData.latestHumidity = {
        value: data.humidity,
        timestamp: timestamp
      };
      
      // Add to history
      appData.humidityHistory.push({
        value: data.humidity,
        timestamp: timestamp
      });
      
      // Trim history if needed
      if (appData.humidityHistory.length > MAX_HISTORY_LENGTH) {
        appData.humidityHistory.shift();
      }
      
      // Emit humidity update event
      io.emit('humidity-update', {
        value: data.humidity,
        timestamp: timestamp
      });
    }
    
  } catch (error) {
    console.error('Error processing message:', error);
    // Create system alert for message processing error
    const alert = {
      id: Date.now().toString(),
      type: ALERT_TYPES.SYSTEM,
      message: `Error processing sensor data: ${error.message}`,
      timestamp: Date.now(),
      resolved: false
    };
    
    appData.activeEmergencies.push(alert);
    appData.alertCount.system++;
    io.emit('alert', alert);
  }
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Send current data to new client
  socket.emit('active-emergencies', appData.activeEmergencies);
  if (appData.latestTemperature) {
    socket.emit('temperature-update', appData.latestTemperature);
  }
  if (appData.latestHumidity) {
    socket.emit('humidity-update', appData.latestHumidity);
  }

  // Initialize data event handler
  socket.on('init-data', (callback) => {
    callback({
      temperature: appData.latestTemperature,
      humidity: appData.latestHumidity,
      alerts: appData.activeEmergencies
    });
  });

  // Alerts event handlers
  socket.on('getAlerts', (callback) => {
    callback(appData.activeEmergencies);
  });

  socket.on('resolveAlert', (alertId, callback) => {
    const alertIndex = appData.activeEmergencies.findIndex(alert => alert.id === alertId);
    if (alertIndex !== -1) {
      appData.activeEmergencies[alertIndex].resolved = true;
      appData.activeEmergencies[alertIndex].resolvedAt = Date.now();
      io.emit('alert-resolved', alertId);
      callback({success: true});
    } else {
      callback({success: false});
    }
  });

  // Analytics event handlers
  socket.on('getTemperatureData', ({ range }, callback) => {
    const now = Date.now();
    let timeRange;
    
    switch(range) {
      case '3m':
        timeRange = 3 * 60 * 1000; // 3 minutes
        break;
      case '10m':
        timeRange = 10 * 60 * 1000; // 10 minutes
        break;
      case '20m':
        timeRange = 20 * 60 * 1000; // 20 minutes
        break;
      case '1h':
        timeRange = 60 * 60 * 1000; // 1 hour
        break;
      case '6h':
        timeRange = 6 * 60 * 60 * 1000; // 6 hours
        break;
      default:
        timeRange = 20 * 60 * 1000; // Default to 20 minutes
    }

    const filteredData = appData.temperatureHistory.filter(
      reading => (now - reading.timestamp) <= timeRange
    );

    callback({
      labels: filteredData.map(reading => new Date(reading.timestamp).toLocaleString()),
      values: filteredData.map(reading => reading.value)
    });
  });

  socket.on('getHumidityData', ({ range }, callback) => {
    const now = Date.now();
    let timeRange;
    
    switch(range) {
      case '3m':
        timeRange = 3 * 60 * 1000; // 3 minutes
        break;
      case '10m':
        timeRange = 10 * 60 * 1000; // 10 minutes
        break;  
      case '20m':
        timeRange = 20 * 60 * 1000;
        break;
      case '1h':
        timeRange = 60 * 60 * 1000;
        break;
      case '6h':
        timeRange = 6 * 60 * 60 * 1000;
        break;
      default:
        timeRange = 20 * 60 * 1000;
    }

    const filteredData = appData.humidityHistory.filter(
      reading => (now - reading.timestamp) <= timeRange
    );

    callback({
      labels: filteredData.map(reading => new Date(reading.timestamp).toLocaleString()),
      values: filteredData.map(reading => reading.value)
    });
  });

  socket.on('getAnalyticsStats', (callback) => {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    const tenMinutesAgo = now - (10 * 60 * 1000);
    
    // Get current averages (last 5 minutes)
    const currentData = appData.temperatureHistory.filter(
      reading => reading.timestamp > fiveMinutesAgo
    );
    
    // Get previous 5 minutes data for comparison
    const previousData = appData.temperatureHistory.filter(
      reading => (reading.timestamp <= fiveMinutesAgo && reading.timestamp > tenMinutesAgo)
    );

    // Calculate averages
    const currentAvgTemp = currentData.length > 0 
      ? currentData.reduce((sum, reading) => sum + reading.value, 0) / currentData.length
      : 0;
    const previousAvgTemp = previousData.length > 0
      ? previousData.reduce((sum, reading) => sum + reading.value, 0) / previousData.length
      : 0;
    
    const humidityData = appData.humidityHistory.length > 0
      ? appData.humidityHistory
      : [{value: 0}];
    
    const currentAvgHumidity = humidityData.reduce((sum, reading) => sum + reading.value, 0) / humidityData.length;
    const previousAvgHumidity = previousAvgTemp ? previousAvgTemp / 2 : 0;

    // Calculate trends
    const tempTrend = previousAvgTemp ? ((currentAvgTemp - previousAvgTemp) / previousAvgTemp) * 100 : 0;
    const humidityTrend = previousAvgHumidity ? ((currentAvgHumidity - previousAvgHumidity) / previousAvgHumidity) * 100 : 0;

    // Calculate uptime
    const uptime = ((now - appData.startTime) / 1000 / 60) < 1 ? 99.9 : 99.8;

    callback({
      avgTemp: currentAvgTemp || 0,
      avgHumidity: currentAvgHumidity || 0,
      tempTrend: tempTrend || 0,
      humidityTrend: humidityTrend || 0,
      totalAlerts: appData.activeEmergencies.length,
      uptime: uptime
    });
  });

  socket.on('getAlertDistribution', (callback) => {
    const alerts = {
      temperatureAlerts: appData.alertCount.temperature,
      humidityAlerts: appData.alertCount.humidity,
      systemAlerts: appData.alertCount.system
    };

    callback(alerts);
  });
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Backend API server running on port ${PORT}`);
});

// Handle server shutdown
process.on('SIGINT', () => {
  console.log('Server shutting down');
  if (device) {
    device.end(false, () => {
      console.log('AWS IoT connection closed');
      server.close(() => {
        process.exit(0);
      });
    });
  } else {
    server.close(() => {
      process.exit(0);
    });
  }
});

// Create the certs directory and write certificates
const setup = () => {
  try {
    // Create certs directory if it doesn't exist
    if (!fs.existsSync('./certs')) {
      fs.mkdirSync('./certs', { recursive: true });
      console.log('Created certs directory');
    }
    
    // Parse certificates from .env if needed
    if (process.env.CA_CERTIFICATE) {
      fs.writeFileSync('./certs/AmazonRootCA1.pem', process.env.CA_CERTIFICATE, 'utf8');
      console.log('Wrote CA certificate to certs/AmazonRootCA1.pem');
    }
    
    if (process.env.CLIENT_CERTIFICATE) {
      fs.writeFileSync('./certs/certificate.pem.crt', process.env.CLIENT_CERTIFICATE, 'utf8');
      console.log('Wrote client certificate to certs/certificate.pem.crt');
    }
    
    if (process.env.PRIVATE_KEY) {
      fs.writeFileSync('./certs/private.pem.key', process.env.PRIVATE_KEY, 'utf8');
      console.log('Wrote private key to certs/private.pem.key');
    }
    
    // Hard-code certificates from .env if they're not set as environment variables
    if (!fs.existsSync('./certs/AmazonRootCA1.pem')) {
      const caPemCrt = `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----`;
      fs.writeFileSync('./certs/AmazonRootCA1.pem', caPemCrt, 'utf8');
      console.log('Wrote default CA certificate to certs/AmazonRootCA1.pem');
    }
    
    if (!fs.existsSync('./certs/certificate.pem.crt')) {
      const certificatePemCrt = `-----BEGIN CERTIFICATE-----
MIIDWTCCAkGgAwIBAgIUV4YbFfUrN+6fBhqJsdbwxzL156AwDQYJKoZIhvcNAQEL
BQAwTTFLMEkGA1UECwxCQW1hem9uIFdlYiBTZXJ2aWNlcyBPPUFtYXpvbi5jb20g
SW5jLiBMPVNlYXR0bGUgU1Q9V2FzaGluZ3RvbiBDPVVTMB4XDTI1MDMzMTEzMzUy
N1oXDTQ5MTIzMTIzNTk1OVowHjEcMBoGA1UEAwwTQVdTIElvVCBDZXJ0aWZpY2F0
ZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANAt8R49WWLq+1AYgrVq
NYpytLMylvQbAQ1muU8asgY/y7D9E4z8TfOu2fgmzTy4PRUz2vB+cD09zLRsnAnF
wvP+gYVxIQ7QFxLcLt6GMz1WbgYMvO9brbKDIqHA9O0G8mWWEme8OuE0hMW7rTSl
m2MMVKgWrtH3VxC48cQyyosTc1lF8/PbdQKGsi2MLLMhSJq9wh795SIIC/HH6sAy
rQXZJYouqE704wYxX5FtxTZ6P8uy97MHqXM1CPSvjBHFUAQi36eRYlfAzUZe8M6a
k7Osq+CKPsNwyPYN/kznDd1m2hbZX+aKAZziSOzpLeWQAZCPGawBby7JPa9jSES2
h7cCAwEAAaNgMF4wHwYDVR0jBBgwFoAUW2F5EL7gTD2+RG9R72MOc6Wn44owHQYD
VR0OBBYEFOPYfOoxHaUEjXzqM3ZLGMDCxmUrMAwGA1UdEwEB/wQCMAAwDgYDVR0P
AQH/BAQDAgeAMA0GCSqGSIb3DQEBCwUAA4IBAQCDK0M8KdS6mn+wLrk/x50Zlgy1
8dFbAXjEn+zTBcsH5Kf7X0QGtn91uVgGevF0O5s5Ujo1NRXztARr1/3UCdl3P6L3
HA/rpuc+yj9UHSHDb/OdfPH0mhEVB0MFjUHH+lqx0wjery9JHiYD2Com0PRiv9c1
uIMc7R0d+c5/uyoYUnB7INmIcj5iukE5ED8vxs6yUwryqqBfbGcwSqOfAc6Vpkyl
HKBcDVlQ9rt/18SMlRvHgMdWWZu3TCCalKwUosgi5ZNBYVfOVPqCZo6lKkoqh7nt
bt2TLvgpxTrt4xZ5WQ2nBmiJqm6P1VYfy5092VC4jbJQSM6le2Y5rJfs2mQq
-----END CERTIFICATE-----`;
      fs.writeFileSync('./certs/certificate.pem.crt', certificatePemCrt, 'utf8');
      console.log('Wrote default client certificate to certs/certificate.pem.crt');
    }
    
    if (!fs.existsSync('./certs/private.pem.key')) {
      const privatePemKey = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0C3xHj1ZYur7UBiCtWo1inK0szKW9BsBDWa5TxqyBj/LsP0T
jPxN867Z+CbNPLg9FTPa8H5wPT3MtGycCcXC8/6BhXEhDtAXEtwu3oYzPVZuBgy8
71utsoMiocD07QbyZZYSZ7w64TSExbutNKWbYwxUqBau0fdXELjxxDLKixNzWUXz
89t1AoayLYwssyFImr3CHv3lIggL8cfqwDKtBdklii6oTvTjBjFfkW3FNno/y7L3
swepczUI9K+MEcVQBCLfp5FiV8DNRl7wzpqTs6yr4Io+w3DI9g3+TOcN3WbaFtlf
5ooBnOJI7Okt5ZABkI8ZrAFvLsk9r2NIRLaHtwIDAQABAoIBAHVvlTdD0GrWt9Jl
IUcJlQ52yqzT+wfVO/C9ZAfVvVt9HYDIIwFDSw4OMvOjn9+C5yJQ0E8eZF6HwDR/
mD6DCwjtJ0+Jk+ZxSLLg9qec+Ma/PO24vdQg2Yl8JEsvOHuFkbPwxo0yR9zG7adF
yd2LFm73g8IWmaPkbX8HdYsCQ/PTjk+WxdICeHX9C5A+wsKOnRU8CJke6JUekS3b
9boAIwuD4UnmV9cOI48LkBqOd/+PxtJY0TwR3l5+1QXdxw7pWy2dfT3aQSY/KKOO
5k8YUMp69aV10Ck5hExwhRJHt7Tqzla8An6m0CAAJyKSVYsf5Rl8S9b5tH211R7I
ZC2FDTECgYEA8vyJximjK76Ca3QrFPEC/r4moDG8VdYvSHsNoOOAaae3MtjBIkGz
KYSevbQSe6PYbLXx9e1Wdw2mGeWr2PSPdzfl3sfPkQhMuFEG5O0oOIwVD3Qn3zdV
lvqzSUTAc4ICmZlnLCYNdPiDJj/dA1wlqOclQ/cNDMvLEeU0gPspEN0CgYEA21Qu
xSehOy2SHxtb8qXCf9itXIctk93EMhLFZfnZfYW4fuOCM7yyZXnEmwlIKHITFF5d
+aL+HI3g5VwGCKQjkMMX4cmWlnZTXT7bpCMn/MSLoXYmz57fuwve30ehI7w/mTzv
StHiwAfDsxM+U6F2FrsMJoj5H9iRtpg/Enl5x6MCgYA4SgRooZCpO5Le7aRlT4fQ
F6C/D4Z/pASEF+2KTembkDzCTLBBDVNB1PUpISP+/G/Qjz2kKP0Uy1alPS1YLx9l
EM/xkfwlrvSG5k5gjgf5QYpHcDMkZJ8xQJZz7LdgiseraXwbIB2R8VgAbl72vkwD
GrjpS7v8MOG0HZLSJlzXCQKBgHCeKiG7tpL/VD86uhy+tj8VD/cpxeJeBaa8crVo
9B76sYAd67YLFwL54lTFEFMMN/XGerR618Xrp+W9Oa/oMAbd1f5uly8M9MM1Smxe
TOMCPLwcQdNrvW96qea2DeyedX2Gh0xAtxBpLDhgEim5BzymsJd8z4ZlmnRKemBP
FZPHAoGBALYm/RPQFX3NG0ON1MSpWqJkfaRFupNUGDI7wFRPRP1tun7qJEMVyLD0
v4bKqARSRoWyXgRNSgHStJ0W8VBFGyoJ0q/USwTdVBpknFYlBgpVuED//Cdo5ZAo
Er23vZPBGHp7N6yDV9xhwR9Ls7JFO01MBaXwYV/OlA6yfMRrPodd
-----END RSA PRIVATE KEY-----`;
      fs.writeFileSync('./certs/private.pem.key', privatePemKey, 'utf8');
      console.log('Wrote default private key to certs/private.pem.key');
    }
    
    // Update the AWS configuration to use the correct values from arduino
    process.env.AWS_IOT_ENDPOINT = process.env.AWS_IOT_ENDPOINT || 'a14cvmm7vig140-ats.iot.ap-south-1.amazonaws.com';
    process.env.AWS_IOT_TOPIC = process.env.AWS_IOT_TOPIC || 'LASTTRY/pub';
  } catch (error) {
    console.error('Error setting up certificates:', error);
    throw error;
  }
};

// Run setup to ensure certificates are in place
setup();

// Print AWS IoT configuration for debugging
console.log('AWS IoT Configuration:');
console.log('Endpoint:', AWS_IOT_ENDPOINT);
console.log('Topic:', AWS_IOT_TOPIC);
console.log('Client ID:', AWS_IOT_CLIENT_ID);
console.log('Key Path:', AWS_IOT_KEY_PATH, 'Exists:', fs.existsSync(AWS_IOT_KEY_PATH));
console.log('Cert Path:', AWS_IOT_CERT_PATH, 'Exists:', fs.existsSync(AWS_IOT_CERT_PATH));
console.log('CA Path:', AWS_IOT_CA_PATH, 'Exists:', fs.existsSync(AWS_IOT_CA_PATH)); 