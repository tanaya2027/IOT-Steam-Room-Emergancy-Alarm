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

// WiFi credentials
const char* ssid = "ATNN_2G";
const char* password = "YOUR_WIFI_PASSWORD";

// Web server details
const char* serverUrl = "http://192.168.1.27/api/temperature";

// AWS MQTT configuration
const char* AWS_ENDPOINT = "a1234abcdef-ats.iot.us-east-1.amazonaws.com"; // Replace with your actual endpoint
const int AWS_PORT = 8883;
const char* AWS_TOPIC_PUB = "LASTTRY/pub";
const char* AWS_TOPIC_SUB = "LASTTRY/sub";
const char* CLIENT_ID = "steam_room_client";

// Root CA certificate
const char* rootCA = "-----BEGIN CERTIFICATE-----\n"
                   "MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF\n"
                   "ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6\n"
                   "b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL\n"
                   "MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv\n"
                   "b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj\n"
                   "ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM\n"
                   "9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw\n"
                   "IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6\n"
                   "VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L\n"
                   "93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm\n"
                   "jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC\n"
                   "AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA\n"
                   "A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI\n"
                   "U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs\n"
                   "N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv\n"
                   "o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU\n"
                   "5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy\n"
                   "rqXRfboQnoZsG4q5WTP468SQvvG5\n"
                   "-----END CERTIFICATE-----\n";

// Device certificate
const char* certificate = "-----BEGIN CERTIFICATE-----\n"
                        "YOUR_DEVICE_CERTIFICATE\n"
                        "-----END CERTIFICATE-----\n";

// Device private key
const char* privateKey = "-----BEGIN RSA PRIVATE KEY-----\n"
                       "YOUR_PRIVATE_KEY\n"
                       "-----END RSA PRIVATE KEY-----\n";

// WiFi and MQTT clients
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Timing variables
unsigned long lastServerUpdateTime = 0;
const long serverUpdateInterval = 5 * 60 * 1000;  // 5 minutes in milliseconds
unsigned long lastMQTTUpdateTime = 0;
const long mqttUpdateInterval = 10 * 60 * 1000;  // 10 minutes in milliseconds

// Session tracking variables
unsigned long sessionStartTime = 0;
bool sessionActive = false;
float maxTemperature = 0;

void setup() {
  Serial.begin(115200);
  delay(100);
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Configure TLS/SSL
  wifiClient.setTrustAnchors(rootCA);
  wifiClient.setClientRSACert(certificate, privateKey);
  
  // Configure MQTT client
  mqttClient.setServer(AWS_ENDPOINT, AWS_PORT);
  mqttClient.setCallback(mqttCallback);
}

void loop() {
  // Ensure WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }
  
  // Ensure MQTT connection
  if (!mqttClient.connected()) {
    connectToMQTT();
  }
  mqttClient.loop();
  
  // Read sensor data
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  
  // Check if reading is valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    delay(2000);
    return;
  }
  
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println(" °C");
  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");
  
  // Track session data
  if (temperature > 30 && !sessionActive) {
    // Start a new session when temperature rises above 30°C
    sessionActive = true;
    sessionStartTime = millis();
    maxTemperature = temperature;
  } else if (temperature > 30 && sessionActive) {
    // Update max temperature during session
    if (temperature > maxTemperature) {
      maxTemperature = temperature;
    }
  } else if (temperature <= 30 && sessionActive) {
    // End session when temperature drops below 30°C
    sessionActive = false;
    unsigned long sessionDuration = (millis() - sessionStartTime) / 1000;  // Duration in seconds
    
    // Send session data to server
    sendSessionData(sessionDuration, maxTemperature);
  }
  
  // Check for emergency condition (temperature > 50°C)
  if (temperature > 50) {
    sendEmergencyAlert(temperature);
  }
  
  // Send regular updates to server (every 5 minutes)
  if (millis() - lastServerUpdateTime >= serverUpdateInterval) {
    sendDataToServer(temperature, humidity);
    lastServerUpdateTime = millis();
  }
  
  // Send data to AWS MQTT (every 10 minutes)
  if (millis() - lastMQTTUpdateTime >= mqttUpdateInterval) {
    sendDataToAWS(temperature, humidity);
    lastMQTTUpdateTime = millis();
  }
  
  delay(2000);  // Wait 2 seconds between measurements
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void connectToMQTT() {
  Serial.println("Connecting to AWS MQTT...");
  while (!mqttClient.connected()) {
    if (mqttClient.connect(CLIENT_ID)) {
      Serial.println("Connected to AWS MQTT broker");
      mqttClient.subscribe(AWS_TOPIC_SUB);
    } else {
      Serial.print("Failed to connect to MQTT, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message received from topic: ");
  Serial.println(topic);
  
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0';
  
  Serial.print("Message: ");
  Serial.println(message);
}

void sendDataToServer(float temperature, float humidity) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    // Prepare JSON payload
    DynamicJsonDocument doc(200);
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["timestamp"] = millis();
    doc["emergency"] = (temperature > 50);
    
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    // Send HTTP POST request
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
    } else {
      Serial.print("Error on sending data. Error code: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
  }
}

void sendDataToAWS(float temperature, float humidity) {
  if (mqttClient.connected()) {
    // Prepare JSON payload
    DynamicJsonDocument doc(200);
    doc["device_id"] = CLIENT_ID;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["timestamp"] = millis();
    
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    // Publish to AWS MQTT
    mqttClient.publish(AWS_TOPIC_PUB, jsonPayload.c_str());
    Serial.println("Data sent to AWS MQTT");
  }
}

void sendEmergencyAlert(float temperature) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    // Prepare JSON payload for emergency alert
    DynamicJsonDocument doc(200);
    doc["temperature"] = temperature;
    doc["timestamp"] = millis();
    doc["emergency"] = true;
    doc["message"] = "EMERGENCY: Temperature exceeds 50°C!";
    
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    // Send HTTP POST request to emergency endpoint
    http.begin(client, serverUrl + "/emergency");
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("Emergency alert sent. Response code: ");
    Serial.println(httpResponseCode);
    
    http.end();
  }
}

void sendSessionData(unsigned long duration, float maxTemp) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    
    // Prepare JSON payload for session data
    DynamicJsonDocument doc(200);
    doc["duration_seconds"] = duration;
    doc["max_temperature"] = maxTemp;
    doc["timestamp"] = millis();
    
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    // Send HTTP POST request to session endpoint
    http.begin(client, serverUrl + "/session");
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("Session data sent. Response code: ");
    Serial.println(httpResponseCode);
    
    http.end();
  }
} 