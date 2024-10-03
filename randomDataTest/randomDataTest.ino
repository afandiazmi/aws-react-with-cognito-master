#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"

#define AWS_IOT_SUBSCRIBE_TOPIC "afandi/test/project"
#define AWS_IOT_PUBLISH_TOPIC "afandi/test/project" // Define the topic for publishing

#define lamp 23

WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

// Function to get the current timestamp (milliseconds since epoch)
unsigned long getCurrentTimestamp() {
  return millis(); // or use an external time library for more accurate time
}

// Function to send random data to AWS IoT Core (no LED value is sent)
void sendDataToAWS() {
  StaticJsonDocument<200> doc;

  // Add data to JSON object
  doc["dataValue"] = random(0, 100); // Random value between 0 and 100
  doc["timestampForData"] = getCurrentTimestamp(); // Add timestamp

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer); // Convert JSON object to a string

  // Publish the message to AWS IoT Core
  if (client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer)) {
    Serial.println("Message published successfully");
  } else {
    Serial.println("Publish failed");
  }
}

void connectAWS() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  // Connect to the MQTT broker on the AWS endpoint we defined earlier
  client.setServer(AWS_IOT_ENDPOINT, 8883);

  // Create a message handler
  client.setCallback(messageHandler);

  Serial.println("Connecting to AWS IOT");

  while (!client.connect(THINGNAME)) {
    Serial.print(".");
    delay(100);
  }

  if (!client.connected()) {
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);

  Serial.println("AWS IoT Connected!");
}

void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("Incoming topic: ");
  Serial.println(topic);

  // Create a buffer for the payload and deserialize it into a JSON document
  StaticJsonDocument<200> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("Failed to parse JSON: ");
    Serial.println(error.c_str());
    return;
  }

  // Extract the "LED" value from the JSON document
  if (doc.containsKey("LED")) {
    int LED = doc["LED"];
    Serial.print("LED value: ");
    Serial.println(LED);

    // Control the lamp based on the "LED" value
    if (LED == 1) {
      digitalWrite(lamp, HIGH);
      Serial.println("Lamp turned ON");
    } else if (LED == 0) {
      digitalWrite(lamp, LOW);
      Serial.println("Lamp turned OFF");
    }
  }
}

void setup() {
  Serial.begin(115200);
  connectAWS();
  pinMode(lamp, OUTPUT);
  digitalWrite(lamp, LOW);
}

void loop() {
  client.loop();
  
  static unsigned long lastPublishTime = 0;
  unsigned long currentMillis = millis();
  
  // Check if 10 seconds have passed since the last publish
  if (currentMillis - lastPublishTime >= 10000) {
    sendDataToAWS();
    lastPublishTime = currentMillis; // Update the last publish time
  }
}
