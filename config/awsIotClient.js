const awsIot = require('aws-iot-device-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create placeholder certificate files
const createPlaceholderCerts = () => {
  const configDir = path.join(__dirname);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  // Create placeholder files if they don't exist
  const certFiles = {
    rootCA: path.join(configDir, 'root-CA.crt'),
    clientCert: path.join(configDir, 'client.crt'),
    privateKey: path.join(configDir, 'client.key')
  };
  
  Object.entries(certFiles).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----`);
      console.log(`Created placeholder for ${key} at ${filePath}`);
    }
  });
  
  return certFiles;
};

// Initialize AWS IoT client
const initializeClient = () => {
  try {
    createPlaceholderCerts();
    
    // Check for AWS configuration
    if (!process.env.AWS_HOST || process.env.AWS_HOST.includes('YOUR_AWS_ENDPOINT')) {
      console.log('AWS IoT not configured. Skipping MQTT connection.');
      return null;
    }
    
    console.log('Attempting to initialize AWS IoT client...');
    
    // Create device with configuration from environment variables
    const device = awsIot.device({
      keyPath: process.env.AWS_PRIVATE_KEY_PATH,
      certPath: process.env.AWS_CERTIFICATE_PATH,
      caPath: process.env.AWS_ROOT_CA_PATH,
      clientId: process.env.AWS_CLIENT_ID,
      host: process.env.AWS_HOST,
      port: parseInt(process.env.AWS_PORT || '8883')
    });
    
    console.log('AWS IoT client initialized');
    return device;
  } catch (error) {
    console.error('Error initializing AWS IoT client:', error);
    console.log('Continuing without AWS IoT connection');
    return null;
  }
};

module.exports = {
  initializeClient
}; 