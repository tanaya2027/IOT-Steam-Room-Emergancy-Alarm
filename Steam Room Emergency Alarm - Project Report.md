# Steam Room Emergency Alarm System - Project Report

## Abstract
This project implements an IoT-based monitoring and alarm system for steam rooms, designed to enhance safety by detecting dangerous temperature levels. The system continuously monitors temperature and humidity using a DHT11 sensor connected to a NodeMCU ESP8266. When temperatures exceed a predefined threshold (35.5°C), the system activates an emergency buzzer with a 1-second on/off pattern and sends alerts to a web dashboard. The dashboard provides real-time visualization of environmental conditions, historical data analysis, and alert management. The system connects to AWS IoT Core for secure cloud communication, ensuring reliable monitoring even when the local server is unavailable.

## Aim
The aim of this project is to develop a reliable and efficient IoT-based monitoring and alert system for steam rooms that:
1. Continuously monitors temperature and humidity conditions
2. Provides immediate alerts when temperatures reach dangerous levels
3. Offers remote monitoring capabilities via a web interface
4. Maintains historical data for trend analysis
5. Allows remote control of the alarm system

## System Requirements

### Hardware Requirements
- NodeMCU ESP8266 WiFi Module
- DHT11 Temperature and Humidity Sensor
- Piezo Buzzer
- Breadboard
- Jumper Wires
- USB Cable for Power and Programming
- 5V Power Supply

### Software Requirements
- Arduino IDE with ESP8266 support
- Node.js (v14 or higher)
- npm (Node Package Manager)
- Socket.IO for real-time communication
- Express.js for web server
- Chart.js for data visualization
- AWS IoT Core account and certificates
- Web browser with JavaScript support

## Features
1. **Real-time Monitoring** - Continuous temperature and humidity monitoring with 3-second update intervals
2. **Emergency Alert System** - Automatic activation of buzzer alarm when temperature exceeds 35.5°C
3. **Web Dashboard** - Responsive web interface for monitoring system status
4. **Historical Data Analysis** - Storage and visualization of temperature and humidity trends
5. **Alert Management** - System for viewing and resolving alerts
6. **Remote Control** - Ability to remotely silence the buzzer alarm
7. **Cloud Connectivity** - AWS IoT Core integration for cloud-based monitoring
8. **Responsive Design** - Mobile-friendly interface for access from any device
9. **Session Tracking** - Records steam room usage sessions and maximum temperatures
10. **Alert Notifications** - Visual and audible notifications when alerts are triggered

## Hardware Connections

### Wiring Diagram
- **DHT11 Sensor**:
  - VCC pin to NodeMCU 3.3V
  - GND pin to NodeMCU GND
  - DATA pin to NodeMCU D1

- **Buzzer**:
  - Positive pin to NodeMCU D2
  - Negative pin to NodeMCU GND

### Connection Description
The NodeMCU ESP8266 serves as the main controller, connecting to both the DHT11 sensor and the buzzer. The DHT11 sensor provides temperature and humidity readings, which are processed by the NodeMCU. When the temperature exceeds the preset threshold, the NodeMCU activates the buzzer by sending HIGH signals to pin D2 in a 1-second on/off pattern. The NodeMCU connects to the local WiFi network to communicate with the server and AWS IoT Core.

## Software Setup

### Server Setup
1. Install Node.js and npm
2. Clone the project repository
3. Run `npm install` to install dependencies
4. Configure AWS IoT Core credentials in the `.env` file
5. Start the server with `node server.js`

### Arduino Setup
1. Install Arduino IDE and ESP8266 board manager
2. Install required libraries:
   - ESP8266WiFi
   - ESP8266HTTPClient
   - DHT
   - ArduinoJson
   - PubSubClient
3. Update WiFi credentials and server details in the code
4. Configure AWS IoT Core certificates
5. Upload the code to the NodeMCU

### AWS IoT Core Setup
1. Create a new Thing in AWS IoT Core
2. Generate and download certificates
3. Create a policy to allow publish/subscribe operations
4. Attach the policy to the certificates
5. Configure endpoint details in both server and Arduino code

## Features of the Project

### Temperature and Humidity Monitoring
The system uses a DHT11 sensor to measure temperature and humidity levels in the steam room. Readings are taken continuously and sent to both the local server and AWS IoT Core at regular intervals. The data is displayed on the web dashboard in real-time and stored for historical analysis.

### Emergency Alert System
When the temperature exceeds the preset threshold of 35.5°C, the system enters an emergency state. The buzzer is activated in a 1-second on/off pattern to create an audible alert. Simultaneously, an emergency alert is sent to the web dashboard, triggering a visual notification for remote users.

### Web Dashboard
The web dashboard provides a user-friendly interface for monitoring the steam room conditions. It includes:
- Real-time temperature and humidity displays
- Historical charts with adjustable time ranges (1h, 6h, 24h)
- Alert management system
- System status indicators
- Analytics for usage patterns

### Alert Management
The system maintains a record of all alerts, categorized by type (temperature, humidity, system). Users can view active alerts and mark them as resolved. When an alert is resolved, the system sends a command to turn off the buzzer if it's active.

### Cloud Integration
AWS IoT Core integration provides a secure and reliable connection between the device and the cloud. This enables:
- Remote monitoring from anywhere with internet access
- Backup data storage in case the local server is unavailable
- Secure communication using TLS/SSL encryption
- Remote control capabilities

## Arduino Code

```cpp
// Key components of the Arduino Code
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>

// DHT Sensor setup
#define DHTPIN D1     // DHT11 data pin
#define DHTTYPE DHT11  // DHT sensor type
DHT dht(DHTPIN, DHTTYPE);

// Buzzer pin setup
#define BUZZER_PIN D2  // Buzzer connected to D2 pin on NodeMCU

// Temperature threshold for alarm
const float EMERGENCY_TEMP_THRESHOLD = 35.5;  // Temperature threshold in Celsius

// Buzzer variables
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;
unsigned long buzzerPatternInterval = 1000; // Beep interval in milliseconds (1 second)
bool buzzerState = false;

void loop() {
  // Read sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Check for temperature exceeding threshold
  if (temperature > EMERGENCY_TEMP_THRESHOLD) {
    if (!buzzerActive) {
      Serial.println("EMERGENCY: Temperature exceeds threshold! Activating buzzer!");
      buzzerActive = true;
      buzzerStartTime = millis();
      activateBuzzer();
    }
    // Control buzzer pattern while temperature is high
    controlBuzzerPattern();
  } else {
    // Turn off buzzer if temperature drops below threshold
    if (buzzerActive) {
      Serial.println("Temperature back to normal. Deactivating buzzer.");
      buzzerActive = false;
      digitalWrite(BUZZER_PIN, LOW);
    }
  }
  
  // Send data to MQTT every 3 seconds
  if (millis() - lastMQTTUpdateTime >= mqttUpdateInterval) {
    sendDataToAWS(temperature, humidity);
    lastMQTTUpdateTime = millis();
  }
}

// Buzzer control functions
void activateBuzzer() {
  digitalWrite(BUZZER_PIN, HIGH);
  buzzerState = true;
}

void controlBuzzerPattern() {
  // Create a beeping pattern for the buzzer with 1-second intervals
  if (millis() - buzzerStartTime >= buzzerPatternInterval) {
    buzzerStartTime = millis();
    buzzerState = !buzzerState;
    digitalWrite(BUZZER_PIN, buzzerState ? HIGH : LOW);
  }
}
```

## Results

The Steam Room Emergency Alarm System has been successfully implemented and tested. The system accurately monitors temperature and humidity conditions in the steam room environment. When the temperature exceeds the threshold of 35.5°C, the buzzer alarm activates with a 1-second on/off pattern, providing clear audible alerts to those in the vicinity.

The web dashboard displays real-time data and historical trends, allowing for comprehensive monitoring of steam room conditions. Alerts are properly categorized and can be managed through the user interface. The "Resolved" button effectively silences the buzzer when alerts are acknowledged.

AWS IoT Core integration provides reliable cloud connectivity, ensuring that the system can be monitored remotely even when the local server may be unavailable. The system has demonstrated high reliability during testing, with successful detection of elevated temperatures and proper alert notification.

The buzzer's 1-second on/off pattern provides a distinct and attention-grabbing alert that is easily noticed in noisy environments. The system's response time from detection to alarm activation is under 1 second, ensuring timely alerts in emergency situations.

## Conclusion

The Steam Room Emergency Alarm System successfully fulfills its aim of providing a reliable monitoring and alert system for steam room environments. By combining local hardware alerts (buzzer) with remote monitoring capabilities (web dashboard), the system ensures that dangerous temperature conditions are promptly detected and addressed.

The integration with AWS IoT Core adds an extra layer of reliability and enables remote access, making this system suitable for commercial steam rooms where constant monitoring is essential for customer safety. The historical data collection and analysis features provide valuable insights into steam room usage patterns and potential safety issues.

Future enhancements could include:
1. Adding more sensors to monitor additional parameters like steam pressure
2. Implementing automatic shutdown mechanisms for the steam generator when temperatures exceed safe levels
3. Developing a mobile app for even more convenient remote monitoring
4. Integrating with building management systems for centralized monitoring
5. Adding machine learning capabilities to predict potential issues before they occur

Overall, this project demonstrates the effective application of IoT technologies to enhance safety in everyday environments, providing both immediate alerts and long-term monitoring capabilities. 