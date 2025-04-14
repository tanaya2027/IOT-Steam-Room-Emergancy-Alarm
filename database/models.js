const mongoose = require('mongoose');

// Schema for temperature readings
const temperatureReadingSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    required: true
  },
  humidity: {
    type: Number,
    required: true
  },
  emergency: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Schema for user sessions in the steam room
const sessionSchema = new mongoose.Schema({
  duration: {
    type: Number, // Duration in seconds
    required: true
  },
  maxTemperature: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  deviceId: {
    type: String,
    required: true
  }
});

// Schema for emergency alerts
const emergencyAlertSchema = new mongoose.Schema({
  temperature: {
    type: Number,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  deviceId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

// Create models
const TemperatureReading = mongoose.model('TemperatureReading', temperatureReadingSchema);
const Session = mongoose.model('Session', sessionSchema);
const EmergencyAlert = mongoose.model('EmergencyAlert', emergencyAlertSchema);

module.exports = {
  TemperatureReading,
  Session,
  EmergencyAlert
}; 