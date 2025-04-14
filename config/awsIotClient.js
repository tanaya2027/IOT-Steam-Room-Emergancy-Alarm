const awsIot = require('aws-iot-device-sdk');
const path = require('path');

function initializeClient() {
  try {
    const device = awsIot.device({
      keyPath: path.join(__dirname, '../certs/private.pem.key'),
      certPath: path.join(__dirname, '../certs/certificate.pem.crt'),
      caPath: path.join(__dirname, '../certs/AmazonRootCA1.pem'),
      clientId: 'steam_room_server_' + Math.random().toString(16).substring(2, 8),
      host: process.env.AWS_ENDPOINT || 'a14cvmm7vig140-ats.iot.ap-south-1.amazonaws.com'
    });

    return device;
  } catch (error) {
    console.error('Error initializing AWS IoT client:', error);
    return null;
  }
}

module.exports = { initializeClient }; 