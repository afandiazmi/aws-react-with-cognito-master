#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wiegand.h>
#include <ESP32Servo.h>
#include "WiFi.h"

// MQTT Topics
#define AWS_IOT_SUBSCRIBE_TOPIC "myesplock"
#define AWS_IOT_PUBLISH_TOPIC   "myesplock"

// Servo pin definition
#define SERVO_PIN 23  // Servo connected to GPIO 23

// Wiegand RFID pin definitions
#define D0_PIN 2  // Wiegand D0 connected to GPIO 2
#define D1_PIN 4  // Wiegand D1 connected to GPIO 4

// WiFi and AWS IoT Client Setup
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

// Wiegand and Servo Instances
WIEGAND wg;
Servo doorLockServo;

// Authorized Cards Structure
struct CardOwner {
  String cardID;
  String ownerName;
};

// Initialize Authorized Cards
CardOwner authorizedCards[] = {
  {"3426894", "Asyraf"},
  {"3403094", "Burn"},
  {"3398372", "Izan"},
  // Add more authorized cards as needed
  // {"3416347", "Kamalul"},
  // {"3416418", "Fahmi"}
};

// Function Prototypes
void connectWiFi();
void connectAWS();
void messageHandler(char* topic, byte* payload, unsigned int length);
void publishToAWS(String cardID, String status, String ownerName = "");
void sendDataToAWS();

// Function to connect to Wi-Fi
void connectWiFi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Attempt to connect to Wi-Fi
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // WiFi connected
  Serial.println("\nConnected to Wi-Fi!");
}

// Function to connect to AWS IoT Core
void connectAWS() {
  // Ensure Wi-Fi is connected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Configure WiFiClientSecure with AWS IoT credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Setup MQTT client
  client.setServer(AWS_IOT_ENDPOINT, 8883);  // AWS IoT Core MQTT endpoint and port
  client.setCallback(messageHandler);        // Set the message handler

  Serial.print("Connecting to AWS IoT Core...");

  // Attempt to connect to AWS IoT Core
  while (!client.connected()) {
    if (client.connect(THINGNAME)) {
      Serial.println("AWS IoT Core Connected!");
      client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);  // Subscribe to the topic
    } else {
      Serial.print("AWS IoT Core Connection failed, state: ");
      Serial.print(client.state());
      delay(2000);  // Wait before retrying
    }
  }
}

// MQTT Message Handler
void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  
  // Print the payload
  for (unsigned int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();

  // (Optional) Add handling for incoming messages if needed
  // For example, you could control the servo based on incoming messages
}

// Function to publish RFID authentication results to AWS IoT Core
void publishToAWS(String cardID, String status, String ownerName) {
  String message;

  // Construct JSON message based on authorization status
  if (status == "authorized") {
    message = "{\"cardID\":\"" + cardID + "\",\"status\":\"" + status + "\",\"owner\":\"" + ownerName + "\"}";
  } else {
    message = "{\"cardID\":\"" + cardID + "\",\"status\":\"" + status + "\",\"message\":\"Unauthorized Access\"}";
  }

  // Publish the message to AWS IoT Core
  if (client.publish(AWS_IOT_PUBLISH_TOPIC, message.c_str())) {
    Serial.println("Message published successfully:");
    Serial.println(message);
  } else {
    Serial.println("Failed to publish message.");
  }
}

// Function to send periodic data to AWS IoT Core
void sendDataToAWS() {
  StaticJsonDocument<200> doc;

  // Add data to JSON object
  doc["dataValue"] = random(0, 100); // Example: Random value between 0 and 100
  doc["timestamp"] = millis();        // Timestamp in milliseconds since device start

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);     // Convert JSON object to string

  // Publish the JSON message to AWS IoT Core
  if (client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer)) {
    Serial.println("Periodic data published successfully:");
    Serial.println(jsonBuffer);
  } else {
    Serial.println("Failed to publish periodic data.");
  }
}

void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  delay(1000);  // Allow time for Serial Monitor to initialize

  // Initialize Servo Motor
  doorLockServo.attach(SERVO_PIN);
  doorLockServo.write(90);  // Lock the door initially

  // Initialize Wiegand RFID Reader
  wg.begin(D0_PIN, D1_PIN);
  Serial.println("Wiegand RFID Reader Initialized.");

  // Connect to Wi-Fi and AWS IoT Core
  connectWiFi();
  connectAWS();
}

void loop() {
  // Handle incoming MQTT messages and maintain connection
  client.loop();

  // Handle RFID card detection
  if (wg.available()) {
    // RFID card detected
    String cardID = String(wg.getCode());
    Serial.println("Card detected: " + cardID);

    // Check if the card is authorized
    bool isAuthorized = false;
    String ownerName = "";
    for (CardOwner card : authorizedCards) {
      if (card.cardID == cardID) {
        isAuthorized = true;
        ownerName = card.ownerName;
        break;
      }
    }

    if (isAuthorized) {
      Serial.println("Access granted to " + ownerName);
      doorLockServo.write(0);  // Unlock the door
      publishToAWS(cardID, "authorized", ownerName);
    } else {
      Serial.println("Access denied");
      publishToAWS(cardID, "unauthorized");
    }

    delay(5000);           // Keep the door unlocked for 5 seconds
    doorLockServo.write(90); // Lock the door again
  }

  // Periodic Data Publishing to AWS IoT Core every 10 seconds
  static unsigned long lastPublishTime = 0;
  unsigned long currentMillis = millis();

  if (currentMillis - lastPublishTime >= 10000) { // 10,000 ms = 10 seconds
    sendDataToAWS();
    lastPublishTime = currentMillis; // Update the last publish time
  }
}
