const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./database/db');
const apiRoutes = require('./api/routes');
const { initializeClient } = require('./config/awsIotClient');
const { EmergencyAlert } = require('./database/models');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set up middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make io available to routes
app.set('io', io);

// Mock data for testing without database
const mockData = {
  activeEmergencies: [],
  latestTemperature: { temperature: 32.5, humidity: 65, createdAt: new Date(), emergency: false },
  sessions: []
};

// API routes
app.use('/api', (req, res, next) => {
  // Add mock data to request for API routes to use when database is unavailable
  req.mockData = mockData;
  next();
}, apiRoutes);

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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Try to get active emergencies from database, fall back to mock data
  try {
    EmergencyAlert.find({ resolved: false })
      .then(activeAlerts => {
        socket.emit('active-emergencies', activeAlerts);
      })
      .catch(error => {
        console.error('Error fetching active emergencies from database, using mock data:', error);
        socket.emit('active-emergencies', mockData.activeEmergencies);
      });
  } catch (error) {
    console.error('Database error, using mock data:', error);
    socket.emit('active-emergencies', mockData.activeEmergencies);
  }
  
  // Emit the latest temperature data
  socket.emit('temperature-update', mockData.latestTemperature);
  
  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialize AWS IoT client and handle messages
const awsIotClient = initializeClient();

if (awsIotClient) {
  // Handle connection to AWS IoT
  awsIotClient.on('connect', () => {
    console.log('Connected to AWS IoT');
    
    // Subscribe to MQTT topic
    awsIotClient.subscribe(process.env.AWS_TOPIC_SUB);
  });
  
  // Handle messages from AWS IoT
  awsIotClient.on('message', (topic, payload) => {
    console.log('Message received from AWS IoT', topic);
    
    try {
      const message = JSON.parse(payload.toString());
      
      // Check if this is an emergency alert
      if (message.temperature && message.temperature > process.env.EMERGENCY_TEMP_THRESHOLD) {
        // Create a new emergency alert
        try {
          const alert = new EmergencyAlert({
            temperature: message.temperature,
            message: `Emergency: Temperature exceeds ${process.env.EMERGENCY_TEMP_THRESHOLD}°C!`,
            deviceId: message.device_id || 'default_device',
            createdAt: new Date()
          });
          
          alert.save()
            .then(savedAlert => {
              // Emit emergency event
              io.emit('emergency-alert', savedAlert);
              mockData.activeEmergencies.push(savedAlert);
            })
            .catch(error => {
              console.error('Error saving MQTT emergency alert to database:', error);
              // Create mock alert for testing
              const mockAlert = {
                _id: Date.now().toString(),
                temperature: message.temperature,
                message: `Emergency: Temperature exceeds ${process.env.EMERGENCY_TEMP_THRESHOLD}°C!`,
                deviceId: message.device_id || 'default_device',
                createdAt: new Date(),
                resolved: false
              };
              io.emit('emergency-alert', mockAlert);
              mockData.activeEmergencies.push(mockAlert);
            });
        } catch (error) {
          console.error('Database error, using mock data for emergency:', error);
          // Create mock alert for testing
          const mockAlert = {
            _id: Date.now().toString(),
            temperature: message.temperature,
            message: `Emergency: Temperature exceeds ${process.env.EMERGENCY_TEMP_THRESHOLD}°C!`,
            deviceId: message.device_id || 'default_device',
            createdAt: new Date(),
            resolved: false
          };
          io.emit('emergency-alert', mockAlert);
          mockData.activeEmergencies.push(mockAlert);
        }
      }
      
      // Update mock data with latest temperature
      mockData.latestTemperature = {
        temperature: message.temperature,
        humidity: message.humidity,
        createdAt: new Date(),
        emergency: message.temperature > process.env.EMERGENCY_TEMP_THRESHOLD
      };
      
      // Emit the message to all connected clients
      io.emit('aws-mqtt-message', message);
      io.emit('temperature-update', mockData.latestTemperature);
    } catch (error) {
      console.error('Error processing MQTT message:', error);
    }
  });
  
  // Handle errors
  awsIotClient.on('error', (error) => {
    console.error('AWS IoT error:', error);
  });
} else {
  console.log('AWS IoT client not initialized. MQTT functionality will not be available.');
  
  // Set up a mock data generator for testing without AWS IoT connection
  setInterval(() => {
    // Generate random temperature between 30 and 55
    const randomTemp = (Math.random() * 25 + 30).toFixed(1);
    const randomHumidity = (Math.random() * 40 + 40).toFixed(1);
    const isEmergency = parseFloat(randomTemp) > process.env.EMERGENCY_TEMP_THRESHOLD;
    
    // Update mock data
    mockData.latestTemperature = {
      temperature: parseFloat(randomTemp),
      humidity: parseFloat(randomHumidity),
      createdAt: new Date(),
      emergency: isEmergency,
      deviceId: 'mock_device'
    };
    
    // Emit to connected clients
    io.emit('temperature-update', mockData.latestTemperature);
    
    // Create emergency alert if needed
    if (isEmergency) {
      const mockAlert = {
        _id: Date.now().toString(),
        temperature: parseFloat(randomTemp),
        message: `Emergency: Temperature exceeds ${process.env.EMERGENCY_TEMP_THRESHOLD}°C!`,
        deviceId: 'mock_device',
        createdAt: new Date(),
        resolved: false
      };
      
      mockData.activeEmergencies.push(mockAlert);
      io.emit('emergency-alert', mockAlert);
    }
    
    console.log(`Generated mock temperature: ${randomTemp}°C, Humidity: ${randomHumidity}%`);
  }, 10000); // Generate data every 10 seconds
}

// Try to connect to MongoDB but allow the app to run even if connection fails
try {
  connectDB()
    .then(() => {
      console.log('MongoDB connected successfully');
    })
    .catch(err => {
      console.warn('MongoDB connection failed. Running with limited functionality.', err.message);
    });
} catch (error) {
  console.warn('MongoDB connection attempt failed. Running with limited functionality.', error.message);
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}`);
}); 