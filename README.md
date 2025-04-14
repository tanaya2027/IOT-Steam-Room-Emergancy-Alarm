# IOT Steam Room Monitoring System

A complete IoT solution for monitoring a steam room, featuring temperature/humidity sensing, emergency alerts, and usage analytics.

## Features

- Real-time temperature and humidity monitoring using DHT11 sensor
- Emergency alerts when temperature exceeds 50°C
- Analytics dashboard with daily usage statistics and session history
- AWS IoT MQTT integration for remote monitoring
- Web-based admin interface with real-time updates via Socket.IO

## System Components

1. **Hardware**:
   - NodeMCU (ESP8266)
   - DHT11 temperature/humidity sensor

2. **Server**:
   - Node.js/Express.js backend
   - MongoDB for data storage
   - Socket.IO for real-time updates

3. **Admin Dashboard**:
   - Real-time temperature/humidity monitoring
   - Emergency alerts with audio alarm
   - Usage analytics and statistics

## Installation

### 1. Hardware Setup

1. Connect the DHT11 sensor to the NodeMCU:
   - VCC → 3.3V
   - GND → GND
   - DATA → D4 (GPIO2)

2. Install required Arduino libraries:
   - ESP8266WiFi
   - ESP8266HTTPClient
   - DHT
   - ArduinoJson
   - PubSubClient

3. Update the Arduino code with your WiFi credentials and server details:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/temperature";
   ```

4. Update AWS IoT credentials and certificates in the Arduino code.

### 2. Server Setup

1. Install Node.js and MongoDB on your server.

2. Clone this repository:
   ```bash
   git clone <repository-url>
   cd IOT-steam-room-alarm
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Update the `.env` file with your configuration:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/steam_room_db
   AWS_HOST=your-aws-endpoint.iot.region.amazonaws.com
   # Add other AWS configuration
   ```

5. Place your AWS IoT certificates in the `config` directory:
   - root-CA.crt
   - client.crt
   - client.key

6. Start the server:
   ```bash
   npm start
   ```

## AWS IoT Setup

1. Create a "Thing" named "LASTTRY" in AWS IoT Core.
2. Create certificates and download them.
3. Create policies to allow publish/subscribe actions.
4. Configure MQTT topics:
   - LASTTRY/pub: For publishing data from the device
   - LASTTRY/sub: For subscribing to commands from the server

## Usage

1. Access the admin dashboard at http://YOUR_SERVER_IP:3000
2. Monitor real-time temperature and humidity data
3. View and respond to emergency alerts
4. Check usage analytics and session history

## Project Structure

```
├── api/                  # Backend API routes
├── config/               # Configuration files and certificates
├── css/                  # Stylesheet files
├── database/             # MongoDB database connection and models
├── js/                   # Frontend JavaScript files
├── public/               # Public web files (HTML, audio)
├── .env                  # Environment variables
├── package.json          # Node.js dependencies
├── server.js             # Main server file
└── steam_room_monitoring.ino  # Arduino code for NodeMCU
```

## Note on Emergency Alerts

When the temperature exceeds 50°C, the system will:
1. Display a visual alert on the dashboard
2. Play an audio alarm
3. Log the alert to the database
4. Send an alert via MQTT to AWS IoT

## Troubleshooting

- **No data from sensor**: Verify WiFi connection and NodeMCU power
- **MQTT connection issues**: Check AWS certificates and permissions
- **Database connection error**: Verify MongoDB is running and accessible

## License

MIT 