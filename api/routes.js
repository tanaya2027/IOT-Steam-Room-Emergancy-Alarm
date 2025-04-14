const express = require('express');
const router = express.Router();
const { TemperatureReading, Session, EmergencyAlert } = require('../database/models');
const moment = require('moment');

// Route to receive temperature data from NodeMCU
router.post('/temperature', async (req, res) => {
  try {
    const { temperature, humidity, timestamp, emergency } = req.body;
    
    // Update mock data
    if (req.mockData) {
      req.mockData.latestTemperature = {
        temperature,
        humidity,
        emergency: emergency || (temperature > process.env.EMERGENCY_TEMP_THRESHOLD),
        deviceId: req.body.device_id || 'default_device',
        createdAt: new Date()
      };
    }
    
    try {
      // Create new temperature reading
      const reading = new TemperatureReading({
        temperature,
        humidity,
        emergency: emergency || (temperature > process.env.EMERGENCY_TEMP_THRESHOLD),
        deviceId: req.body.device_id || 'default_device',
        createdAt: new Date()
      });
      
      await reading.save();
      
      // Emit event through socket.io (will be implemented in server.js)
      if (req.app.get('io')) {
        req.app.get('io').emit('temperature-update', reading);
      }
      
      res.status(201).json({ message: 'Temperature data recorded successfully', data: reading });
    } catch (dbError) {
      console.error('Database error when saving temperature data:', dbError);
      
      // Use mock data as fallback
      if (req.app.get('io')) {
        req.app.get('io').emit('temperature-update', req.mockData.latestTemperature);
      }
      
      res.status(201).json({ 
        message: 'Temperature data processed (DB unavailable)', 
        data: req.mockData.latestTemperature 
      });
    }
  } catch (error) {
    console.error('Error processing temperature data:', error);
    res.status(500).json({ message: 'Error processing temperature data', error: error.message });
  }
});

// Route to receive emergency alerts
router.post('/temperature/emergency', async (req, res) => {
  try {
    const { temperature, timestamp, message } = req.body;
    
    // Create a mock alert for fallback
    const mockAlert = {
      _id: Date.now().toString(),
      temperature,
      message: message || `Emergency: Temperature exceeds ${process.env.EMERGENCY_TEMP_THRESHOLD}°C!`,
      deviceId: req.body.device_id || 'default_device',
      createdAt: new Date(),
      resolved: false
    };
    
    // Add to mock data
    if (req.mockData) {
      req.mockData.activeEmergencies.push(mockAlert);
    }
    
    try {
      // Create new emergency alert
      const alert = new EmergencyAlert({
        temperature,
        message: message || `Emergency: Temperature exceeds ${process.env.EMERGENCY_TEMP_THRESHOLD}°C!`,
        deviceId: req.body.device_id || 'default_device',
        createdAt: new Date()
      });
      
      await alert.save();
      
      // Emit emergency event through socket.io
      if (req.app.get('io')) {
        req.app.get('io').emit('emergency-alert', alert);
      }
      
      res.status(201).json({ message: 'Emergency alert recorded successfully', data: alert });
    } catch (dbError) {
      console.error('Database error when saving emergency alert:', dbError);
      
      // Use mock data as fallback
      if (req.app.get('io')) {
        req.app.get('io').emit('emergency-alert', mockAlert);
      }
      
      res.status(201).json({ 
        message: 'Emergency alert processed (DB unavailable)', 
        data: mockAlert 
      });
    }
  } catch (error) {
    console.error('Error processing emergency alert:', error);
    res.status(500).json({ message: 'Error processing emergency alert', error: error.message });
  }
});

// Route to receive session data
router.post('/session', async (req, res) => {
  try {
    const { duration_seconds, max_temperature } = req.body;
    
    // Create mock session for fallback
    const mockSession = {
      _id: Date.now().toString(),
      duration: duration_seconds,
      maxTemperature: max_temperature,
      deviceId: req.body.device_id || 'default_device',
      date: new Date()
    };
    
    // Add to mock data
    if (req.mockData && req.mockData.sessions) {
      req.mockData.sessions.push(mockSession);
    }
    
    try {
      // Create new session
      const session = new Session({
        duration: duration_seconds,
        maxTemperature: max_temperature,
        deviceId: req.body.device_id || 'default_device',
        date: new Date()
      });
      
      await session.save();
      
      // Emit session event through socket.io
      if (req.app.get('io')) {
        req.app.get('io').emit('session-update', session);
      }
      
      res.status(201).json({ message: 'Session data recorded successfully', data: session });
    } catch (dbError) {
      console.error('Database error when saving session data:', dbError);
      
      // Use mock data as fallback
      if (req.app.get('io')) {
        req.app.get('io').emit('session-update', mockSession);
      }
      
      res.status(201).json({ 
        message: 'Session data processed (DB unavailable)', 
        data: mockSession 
      });
    }
  } catch (error) {
    console.error('Error processing session data:', error);
    res.status(500).json({ message: 'Error processing session data', error: error.message });
  }
});

// Route to get recent temperature readings
router.get('/temperature', async (req, res) => {
  try {
    const { limit = 100, startDate, endDate } = req.query;
    
    try {
      let query = {};
      
      // Add date range if provided
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      const readings = await TemperatureReading.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
        
      res.status(200).json({ data: readings });
    } catch (dbError) {
      console.error('Database error when fetching temperature data:', dbError);
      
      // Return mock data as fallback (just the current temperature)
      const mockReadings = req.mockData ? [req.mockData.latestTemperature] : [];
      res.status(200).json({ 
        data: mockReadings,
        notice: 'Using limited mock data due to database unavailability'
      });
    }
  } catch (error) {
    console.error('Error fetching temperature data:', error);
    res.status(500).json({ message: 'Error fetching temperature data', error: error.message });
  }
});

// Route to get emergency alerts
router.get('/emergencies', async (req, res) => {
  try {
    const { resolved = 'all' } = req.query;
    
    try {
      let query = {};
      
      // Filter by resolved status if specified
      if (resolved !== 'all') {
        query.resolved = resolved === 'true';
      }
      
      const alerts = await EmergencyAlert.find(query).sort({ createdAt: -1 });
      
      res.status(200).json({ data: alerts });
    } catch (dbError) {
      console.error('Database error when fetching emergency alerts:', dbError);
      
      // Return mock data as fallback
      let mockAlerts = [];
      if (req.mockData && req.mockData.activeEmergencies) {
        // Filter by resolved status if needed
        if (resolved !== 'all') {
          const isResolved = resolved === 'true';
          mockAlerts = req.mockData.activeEmergencies.filter(alert => alert.resolved === isResolved);
        } else {
          mockAlerts = req.mockData.activeEmergencies;
        }
      }
      
      res.status(200).json({ 
        data: mockAlerts,
        notice: 'Using mock data due to database unavailability'
      });
    }
  } catch (error) {
    console.error('Error fetching emergency alerts:', error);
    res.status(500).json({ message: 'Error fetching emergency alerts', error: error.message });
  }
});

// Route to resolve an emergency alert
router.put('/emergencies/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const alert = await EmergencyAlert.findByIdAndUpdate(
        id, 
        { resolved: true, resolvedAt: new Date() },
        { new: true }
      );
      
      if (!alert) {
        // Check mock data if no alert found in database
        if (req.mockData && req.mockData.activeEmergencies) {
          const mockAlertIndex = req.mockData.activeEmergencies.findIndex(a => a._id === id);
          if (mockAlertIndex >= 0) {
            const mockAlert = req.mockData.activeEmergencies[mockAlertIndex];
            mockAlert.resolved = true;
            mockAlert.resolvedAt = new Date();
            
            // Emit alert resolution event
            if (req.app.get('io')) {
              req.app.get('io').emit('emergency-resolved', mockAlert);
            }
            
            return res.status(200).json({ 
              message: 'Emergency alert resolved (mock data)', 
              data: mockAlert 
            });
          }
          return res.status(404).json({ message: 'Emergency alert not found' });
        }
        return res.status(404).json({ message: 'Emergency alert not found' });
      }
      
      // Emit alert resolution event
      if (req.app.get('io')) {
        req.app.get('io').emit('emergency-resolved', alert);
      }
      
      res.status(200).json({ message: 'Emergency alert resolved', data: alert });
    } catch (dbError) {
      console.error('Database error when resolving emergency alert:', dbError);
      
      // Use mock data as fallback
      if (req.mockData && req.mockData.activeEmergencies) {
        const mockAlertIndex = req.mockData.activeEmergencies.findIndex(a => a._id === id);
        if (mockAlertIndex >= 0) {
          const mockAlert = req.mockData.activeEmergencies[mockAlertIndex];
          mockAlert.resolved = true;
          mockAlert.resolvedAt = new Date();
          
          // Emit alert resolution event
          if (req.app.get('io')) {
            req.app.get('io').emit('emergency-resolved', mockAlert);
          }
          
          return res.status(200).json({ 
            message: 'Emergency alert resolved (mock data)', 
            data: mockAlert 
          });
        }
      }
      
      res.status(500).json({ message: 'Error resolving emergency alert', error: dbError.message });
    }
  } catch (error) {
    console.error('Error resolving emergency alert:', error);
    res.status(500).json({ message: 'Error resolving emergency alert', error: error.message });
  }
});

// Route to get sessions data
router.get('/sessions', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    try {
      let query = {};
      
      // Add date range if provided
      if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      
      const sessions = await Session.find(query).sort({ date: -1 });
      
      res.status(200).json({ data: sessions });
    } catch (dbError) {
      console.error('Database error when fetching session data:', dbError);
      
      // Return mock data as fallback
      const mockSessions = req.mockData ? req.mockData.sessions || [] : [];
      res.status(200).json({ 
        data: mockSessions,
        notice: 'Using mock data due to database unavailability'
      });
    }
  } catch (error) {
    console.error('Error fetching session data:', error);
    res.status(500).json({ message: 'Error fetching session data', error: error.message });
  }
});

// Route to get daily statistics
router.get('/stats/daily', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : moment().subtract(7, 'days').toDate();
    const end = endDate ? new Date(endDate) : new Date();
    
    try {
      // Aggregate sessions by day
      const dailyStats = await Session.aggregate([
        {
          $match: {
            date: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            count: { $sum: 1 },
            avgDuration: { $avg: "$duration" },
            avgMaxTemperature: { $avg: "$maxTemperature" },
            totalDuration: { $sum: "$duration" }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);
      
      res.status(200).json({ data: dailyStats });
    } catch (dbError) {
      console.error('Database error when fetching daily statistics:', dbError);
      
      // Generate mock statistics for the last 7 days
      const mockStats = [];
      const mockSessions = req.mockData ? req.mockData.sessions || [] : [];
      
      // If we have some mock sessions, generate stats from them
      if (mockSessions.length > 0) {
        // Group them by day
        const sessionsByDay = {};
        mockSessions.forEach(session => {
          const dayKey = moment(session.date).format('YYYY-MM-DD');
          if (!sessionsByDay[dayKey]) {
            sessionsByDay[dayKey] = [];
          }
          sessionsByDay[dayKey].push(session);
        });
        
        // Generate stats for each day
        Object.keys(sessionsByDay).forEach(day => {
          const sessions = sessionsByDay[day];
          const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
          const totalMaxTemp = sessions.reduce((sum, s) => sum + s.maxTemperature, 0);
          
          mockStats.push({
            _id: day,
            count: sessions.length,
            avgDuration: totalDuration / sessions.length,
            avgMaxTemperature: totalMaxTemp / sessions.length,
            totalDuration: totalDuration
          });
        });
      } else {
        // Generate random data for the past 7 days if no sessions available
        for (let i = 0; i < 7; i++) {
          const day = moment().subtract(i, 'days').format('YYYY-MM-DD');
          mockStats.push({
            _id: day,
            count: Math.floor(Math.random() * 10) + 1,
            avgDuration: Math.floor(Math.random() * 1800) + 600, // 10-40 minutes in seconds
            avgMaxTemperature: Math.floor(Math.random() * 10) + 35, // 35-45°C
            totalDuration: Math.floor(Math.random() * 18000) + 3600 // 1-6 hours in seconds
          });
        }
      }
      
      res.status(200).json({ 
        data: mockStats.sort((a, b) => a._id.localeCompare(b._id)),
        notice: 'Using mock data due to database unavailability'
      });
    }
  } catch (error) {
    console.error('Error fetching daily statistics:', error);
    res.status(500).json({ message: 'Error fetching daily statistics', error: error.message });
  }
});

module.exports = router; 