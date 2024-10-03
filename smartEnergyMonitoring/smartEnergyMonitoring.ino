#include "secrets.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "WiFi.h"
#include <DHT.h>
#include <ZMPT101B.h>
#include <time.h>  // for timestamp

// AWS IoT topic
#define AWS_IOT_TOPIC "esp32/sub"

// Pin definitions
#define DHTPIN 4
#define DHTTYPE DHT11
#define ACS712_PIN 34
#define ZMPT101B_PIN 35
#define SENSITIVITY 500.0f    // Sensitivity for ZMPT101B

// Initialize sensors
DHT dht(DHTPIN, DHTTYPE);
ZMPT101B voltageSensor(ZMPT101B_PIN, 50.0);

// Constants
const int mVperAmp = 100;     // Sensitivity for 20A version of ACS712
double Voltage = 0;
double VRMS = 0;
double AmpsRMS = 0;
int Watt = 0;

// WiFi and MQTT objects
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

// Function to connect to AWS IoT
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

  // Connect to the MQTT broker on the AWS endpoint
  client.setServer(AWS_IOT_ENDPOINT, 8883);

  Serial.println("Connecting to AWS IoT");

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

  Serial.println("AWS IoT Connected!");
}

// Function to get current Unix timestamp
long getUnixTimestamp()
{
  time_t now;
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("Failed to obtain time");
    return 0;
  }
  time(&now);  // Get the current time
  return now;  // Return Unix timestamp (seconds since 1970)
}

// Function to read ACS712 current sensor
float getCurrent()
{
  double voltageFromACS = getVPP();
  VRMS = (voltageFromACS / 2.0) * 0.707;   // Calculate RMS voltage
  AmpsRMS = ((VRMS * 1000) / mVperAmp);    // Convert to Amps
  if (AmpsRMS < 0.41) {
    AmpsRMS = 0.0;
  }
  return AmpsRMS;
}

// Function to read voltage using ZMPT101B sensor
float getVoltage()
{
  Voltage = voltageSensor.getRmsVoltage();
  if (Voltage < 100.0f) {
    Voltage = 0.0f;
  }
  return Voltage;
}

// Function to calculate power consumption (Watt)
int getPower(float voltage, float current)
{
  return voltage * current;
}

// Function to publish data to AWS IoT
void publishData(float temperature, float humidity, float voltage, float current, int power)
{
  StaticJsonDocument<200> doc;
  doc["timestamp"] = getUnixTimestamp();  // Use Unix timestamp
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["power"] = power;  // Publish the calculated Watt

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  client.publish(AWS_IOT_TOPIC, jsonBuffer);
}

// Function to read voltage for ACS712 sensor
float getVPP()
{
  float result;
  int readValue;
  int maxValue = 0;
  int minValue = 4096;

  uint32_t start_time = millis();
  while ((millis() - start_time) < 1000) {
    readValue = analogRead(ACS712_PIN);

    if (readValue > maxValue) {
      maxValue = readValue;
    }
    if (readValue < minValue) {
      minValue = readValue;
    }
  }

  result = ((maxValue - minValue) * 3.3) / 4096.0;
  return result;
}

void setup()
{
  Serial.begin(115200);
  connectAWS();

  // Initialize DHT sensor
  dht.begin();

  // Initialize ZMPT101B voltage sensor
  voltageSensor.setSensitivity(SENSITIVITY);

  // Configure time
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
}

void loop()
{
  // Read DHT11 sensor values
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Read ACS712 and ZMPT101B values
  float voltage = getVoltage();
  float current = getCurrent();
  Watt = getPower(voltage, current);  // Calculate power in Watts

  // Display values on the serial monitor
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.println("°C");

  Serial.print("Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  Serial.print("Voltage: ");
  Serial.print(voltage);
  Serial.println("V");

  Serial.print("Current: ");
  Serial.print(current);
  Serial.println("A");

  Serial.print("Power: ");
  Serial.print(Watt);
  Serial.println("W");

  // Publish data to AWS IoT
  publishData(temperature, humidity, voltage, current, Watt);

  delay(1000);  // Wait 1 second before next reading
}
