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
const char* password = "A!R903#OPPTel";

// Web server details
const char* serverUrl = "http://192.168.1.27/api/temperature";

// AWS MQTT configuration
const char* AWS_ENDPOINT = "a14cvmm7vig140-ats.iot.ap-south-1.amazonaws.com"; // Replace with your actual endpoint
const int AWS_PORT = 8883;
const char* AWS_TOPIC_PUB = "LASTTRY/pub";
const char* AWS_TOPIC_SUB = "LASTTRY/sub";
const char* CLIENT_ID = "steam_room_client";

// Root CA certificate
const char* rootCA PROGMEM = R"EOF(-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----)EOF";

// Device certificate
const char* certificate PROGMEM = R"EOF(-----BEGIN CERTIFICATE-----
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
-----END CERTIFICATE-----)EOF";

// Device private key
const char* privateKey PROGMEM = R"EOF(-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----)EOF";

// WiFi and MQTT clients
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

// Create BearSSL certificate objects
BearSSL::X509List certList(rootCA);
BearSSL::X509List clientCert(certificate);
BearSSL::PrivateKey clientKey(privateKey);

// Timing variables
unsigned long lastServerUpdateTime = 0;
const long serverUpdateInterval = 5 * 60 * 1000;  // 5 minutes in milliseconds
unsigned long lastMQTTUpdateTime = 0;
const long mqttUpdateInterval = 3000;  // 3 seconds in milliseconds

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
  
  // Configure TLS/SSL with more detailed error reporting
  wifiClient.setBufferSizes(512, 512); // Increase buffer size
  wifiClient.setTrustAnchors(&certList);
  wifiClient.setClientRSACert(&clientCert, &clientKey);
  wifiClient.setInsecure(); // For testing only - remove in production!
  
  // Print certificate info
  Serial.println("Certificates loaded:");
  Serial.println("Root CA length: " + String(strlen(rootCA)));
  Serial.println("Client Cert length: " + String(strlen(certificate)));
  Serial.println("Private Key length: " + String(strlen(privateKey)));
  
  // Configure MQTT client
  mqttClient.setServer(AWS_ENDPOINT, AWS_PORT);
  mqttClient.setCallback(mqttCallback);
  
  // Attempt initial MQTT connection
  connectToMQTT();
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
  
  // Send data to MQTT every 3 seconds
  if (millis() - lastMQTTUpdateTime >= mqttUpdateInterval) {
    sendDataToAWS(temperature, humidity);
    lastMQTTUpdateTime = millis();
  }
  
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
  
  delay(1000);  // Reduced delay to 1 second for more responsive MQTT updates
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
  
  // Set the client ID with a timestamp to make it unique
  String clientId = String(CLIENT_ID) + "-" + String(millis());
  
  // Enable more detailed debug output
  Serial.print("MQTT Server: ");
  Serial.println(AWS_ENDPOINT);
  Serial.print("MQTT Port: ");
  Serial.println(AWS_PORT);
  Serial.print("Client ID: ");
  Serial.println(clientId);

  // Make sure WiFi is connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Reconnecting...");
    connectToWiFi();
  }

  // Set the keep alive interval and timeout
  mqttClient.setKeepAlive(60);
  wifiClient.setTimeout(15000); // 15 seconds timeout
  
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
      // Subscribe to topics after successful connection
      if(mqttClient.subscribe(AWS_TOPIC_SUB)) {
        Serial.println("Subscribed to topic: " + String(AWS_TOPIC_SUB));
      } else {
        Serial.println("Failed to subscribe to topic");
      }
    } else {
      int state = mqttClient.state();
      Serial.print("Failed to connect to MQTT, rc=");
      Serial.print(state);
      Serial.print(" (");
      // Print detailed error message
      switch(state) {
        case -4:
          Serial.print("MQTT_CONNECTION_TIMEOUT");
          break;
        case -3:
          Serial.print("MQTT_CONNECTION_LOST");
          break;
        case -2:
          Serial.print("MQTT_CONNECT_FAILED");
          break;
        case -1:
          Serial.print("MQTT_DISCONNECTED");
          break;
        case 1:
          Serial.print("MQTT_CONNECT_BAD_PROTOCOL");
          break;
        case 2:
          Serial.print("MQTT_CONNECT_BAD_CLIENT_ID");
          break;
        case 3:
          Serial.print("MQTT_CONNECT_UNAVAILABLE");
          break;
        case 4:
          Serial.print("MQTT_CONNECT_BAD_CREDENTIALS");
          break;
        case 5:
          Serial.print("MQTT_CONNECT_UNAUTHORIZED");
          break;
      }
      Serial.println(")");
      
      // Print SSL/TLS debug info
      if (!wifiClient.connected()) {
        Serial.println("SSL/TLS connection failed");
      }
      
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
    doc["status"] = "normal";
    
    if (temperature > 50) {
      doc["status"] = "emergency";
    } else if (temperature > 30) {
      doc["status"] = "warning";
    }
    
    String jsonPayload;
    serializeJson(doc, jsonPayload);
    
    // Publish to AWS MQTT
    if (mqttClient.publish(AWS_TOPIC_PUB, jsonPayload.c_str())) {
      Serial.println("Data sent to AWS MQTT successfully");
      Serial.println("Payload: " + jsonPayload);
    } else {
      Serial.println("Failed to send data to AWS MQTT");
    }
  } else {
    Serial.println("MQTT not connected. Reconnecting...");
    connectToMQTT();
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
    
    // Create the full URL using String
    String fullUrl = String(serverUrl) + "/emergency";
    
    // Send HTTP POST request to emergency endpoint
    http.begin(client, fullUrl);
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
    
    // Create the full URL using String
    String fullUrl = String(serverUrl) + "/session";
    
    // Send HTTP POST request to session endpoint
    http.begin(client, fullUrl);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST(jsonPayload);
    
    Serial.print("Session data sent. Response code: ");
    Serial.println(httpResponseCode);
    
    http.end();
  }
} 