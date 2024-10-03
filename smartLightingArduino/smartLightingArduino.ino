#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
 
#define AWS_IOT_SUBSCRIBE_TOPIC "esp32/sub"
 
#define lamp 23
 
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
  
  // Extract the "LED" value from the JSON document
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
 
 
void setup()
{
  Serial.begin(115200);
  connectAWS();
  pinMode (lamp, OUTPUT);
  digitalWrite(lamp, LOW);
 
}
 
void loop()
{
  client.loop();
  delay(1000);
}