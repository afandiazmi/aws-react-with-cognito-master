#include "mysecrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include <ESP32Servo.h>

// Pin definitions
#define SERVO_PIN 13
#define FAN_PIN 23
#define MQ6_PIN 35

// Threshold for gas detection
#define GAS_THRESHOLD 1700

// MQTT topic
#define AWS_IOT_TOPIC "mykitchen/gas"

WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

Servo windowServo;

unsigned long lastPublishTime = 0;
const unsigned long publishInterval = 10000; // Publish every 10 seconds

void connectWiFi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected to Wi-Fi!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void connectAWS() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  client.setServer(AWS_IOT_ENDPOINT, 8883);
  client.setCallback(messageHandler);

  Serial.println("Connecting to AWS IoT...");

  while (!client.connected()) {
    if (client.connect(THINGNAME)) {
      Serial.println("AWS IoT Connected!");
      bool subStatus = client.subscribe(AWS_IOT_TOPIC);
      Serial.printf("Subscription to %s: %s\n", AWS_IOT_TOPIC, subStatus ? "OK" : "Failed");
    } else {
      Serial.print("AWS IoT Connection failed, Error code: ");
      Serial.println(client.state());
      Serial.println("Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("Incoming message - Topic: ");
  Serial.print(topic);
  Serial.print(" | Payload: ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void publishToAWS(String status, int gasLevel) {
  StaticJsonDocument<200> doc;
  doc["status"] = status;
  doc["gasLevel"] = gasLevel;
  doc["timestamp"] = millis();

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  Serial.print("Publishing message to ");
  Serial.print(AWS_IOT_TOPIC);
  Serial.print(": ");
  Serial.println(jsonBuffer);

  if (client.publish(AWS_IOT_TOPIC, jsonBuffer)) {
    Serial.println("Message published successfully");
  } else {
    Serial.print("Message publish failed, Error code: ");
    Serial.println(client.state());
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("IoT Gas Detection System Starting...");

  connectWiFi();
  connectAWS();

  windowServo.attach(SERVO_PIN);
  windowServo.write(0);

  pinMode(FAN_PIN, OUTPUT);
  digitalWrite(FAN_PIN, LOW);

  Serial.println("Setup completed. Starting main loop...");
}

void loop() {
  if (!client.connected()) {
    Serial.println("MQTT connection lost. Reconnecting...");
    connectAWS();
  }

  int gasValue = analogRead(MQ6_PIN);
  Serial.print("Current gas value: ");
  Serial.println(gasValue);

  if (gasValue > GAS_THRESHOLD) {
    Serial.println("Gas leak detected! Opening window and turning on fan.");
    windowServo.write(180);
    digitalWrite(FAN_PIN, HIGH);
    publishToAWS("Gas Detected", gasValue);
  } else {
    Serial.println("Gas levels are safe. Closing window and turning off fan.");
    windowServo.write(0);
    digitalWrite(FAN_PIN, LOW);
  }

  unsigned long currentMillis = millis();
  if (currentMillis - lastPublishTime >= publishInterval) {
    publishToAWS("Regular Update", gasValue);
    lastPublishTime = currentMillis;
  }

  client.loop();
  delay(1000); // Check every second
}