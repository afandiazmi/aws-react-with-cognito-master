#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"

/* 1. Define MQTT Topics that will subscribe in MQTT test client*/
#define AWS_IOT_SUBSCRIBE_TOPIC "smart/3lighting"

#define lamp21 21
#define lamp22 22
#define lamp23 23

WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

void connectAWS()
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println("Connecting to Wi-Fi");

  while (WiFi.status() != WL_CONNECTED)
  {
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

  while (!client.connect(THINGNAME))
  {
    Serial.print(".");
    delay(100);
  }

  if (!client.connected())
  {
    Serial.println("AWS IoT Timeout!");
    return;
  }

  // Subscribe to a topic
  client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);

  Serial.println("AWS IoT Connected!");
}

void messageHandler(char* topic, byte* payload, unsigned int length)
{
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
  
  // Check if each key exists before assigning relay values
  if (doc.containsKey("relay1")) {
    int relay1 = doc["relay1"];
    Serial.print("Relay 1 value: ");
    Serial.println(relay1);
    digitalWrite(lamp21, relay1 == 1 ? HIGH : LOW);
    Serial.println(relay1 == 1 ? "Lamp 21 turned ON" : "Lamp 21 turned OFF");
  }

  if (doc.containsKey("relay2")) {
    int relay2 = doc["relay2"];
    Serial.print("Relay 2 value: ");
    Serial.println(relay2);
    digitalWrite(lamp22, relay2 == 1 ? HIGH : LOW);
    Serial.println(relay2 == 1 ? "Lamp 22 turned ON" : "Lamp 22 turned OFF");
  }

  if (doc.containsKey("relay3")) {
    int relay3 = doc["relay3"];
    Serial.print("Relay 3 value: ");
    Serial.println(relay3);
    digitalWrite(lamp23, relay3 == 1 ? HIGH : LOW);
    Serial.println(relay3 == 1 ? "Lamp 23 turned ON" : "Lamp 23 turned OFF");
  }
}

void setup()
{
  Serial.begin(115200);
  connectAWS();
  pinMode(lamp21, OUTPUT);
  digitalWrite(lamp21, LOW);
  pinMode(lamp22, OUTPUT);
  digitalWrite(lamp22, LOW);
  pinMode(lamp23, OUTPUT);
  digitalWrite(lamp23, LOW);
}

void loop()
{
  client.loop();
  delay(1000);
}
