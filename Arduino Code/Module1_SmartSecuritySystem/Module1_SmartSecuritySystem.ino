#include "secrets.h"
#include "esp_camera.h"
#include <WiFiClientSecure.h>
#include <PubSubClient.h>  
#include <ArduinoJson.h>
#include "WiFi.h"
#include <base64.h>
#include <EEPROM.h>

#define EEPROM_SIZE 1

// Camera definitions
#define CAMERA_MODEL_AI_THINKER
#include "camera_pins.h"

// The MQTT topics that this device should publish/subscribe
#define AWS_IOT_PUBLISH_TOPIC   "myespcam"
#define AWS_IOT_SUBSCRIBE_TOPIC "myespcam"

// HC-SR501 pin definition
#define PIR_PIN 13  // Connect OUT of HC-SR501 to GPIO 13

// LED pin definition
#define LED_PIN 2   // LED on GPIO pin 2

// Set up WiFiClientSecure and PubSubClient
WiFiClientSecure net = WiFiClientSecure();
PubSubClient client(net);

void connectWiFi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Try to connect to Wi-Fi
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  // WiFi connected
  Serial.println("\nConnected to Wi-Fi!");
}

void connectAWS() {
  // Ensure we're connected to Wi-Fi first
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Configure WiFiClientSecure to use the AWS IoT device credentials
  net.setCACert(AWS_CERT_CA);
  net.setCertificate(AWS_CERT_CRT);
  net.setPrivateKey(AWS_CERT_PRIVATE);

  client.setServer(AWS_IOT_ENDPOINT, 8883);  // Set AWS IoT as the server
  client.setCallback(messageHandler);

  Serial.print("Connecting to AWS IoT...");

  while (!client.connected()) {
    if (client.connect(THINGNAME)) {
      Serial.println("AWS IoT Connected!");
      client.subscribe(AWS_IOT_SUBSCRIBE_TOPIC);  // Subscribe to the topic
    } else {
      Serial.print("AWS IoT Connection failed, client state: ");
      Serial.print(client.state());
      delay(2000);  // Wait for 2 seconds before retrying
    }
  }
}

void messageHandler(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void initCam() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}

void takePictureAndSubmit() {
  // Capture camera frame
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  } else {
    Serial.println("Camera capture successful!");
  }

  String encoded = base64::encode(fb->buf, fb->len);

  // Formatting the image as a JSON object
  DynamicJsonDocument doc(10000);
  doc["picture"] = encoded;
  String jsonBuffer;
  serializeJson(doc, jsonBuffer);

  Serial.println(jsonBuffer);

  // Ensure MQTT client is connected before publishing
  if (!client.connected()) {
    Serial.println("MQTT client not connected, reconnecting...");
    connectAWS();  // Reconnect to AWS IoT
  }

  // Publishing the image to the MQTT topic
  if (!client.publish(AWS_IOT_PUBLISH_TOPIC, jsonBuffer.c_str())) {
    Serial.print("Publish failed, client state: ");
    Serial.println(client.state());
  } else {
    Serial.println("Published successfully");
  }

  // Releasing the camera resource
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(9600);
  
  // Initialize pins
  pinMode(PIR_PIN, INPUT);  // Set PIR sensor pin as input
  pinMode(LED_PIN, OUTPUT); // Set LED pin as output
  
  // Initialize the camera
  initCam();
  
  // Connect to Wi-Fi and AWS IoT
  connectWiFi();
  connectAWS();
}

void loop() {
  int motionDetected = digitalRead(PIR_PIN);  // Read the PIR sensor

  if (motionDetected == HIGH) {
    Serial.println("Motion detected! Turning LED on and taking picture...");
    digitalWrite(LED_PIN, HIGH);  // Turn on the LED*/
    takePictureAndSubmit();       // Capture picture and submit to AWS IoT
    delay(5000);                  // Optional delay to avoid too many pictures in quick succession
  } else {
    digitalWrite(LED_PIN, LOW);   // Turn off the LED when no motion is detected
  }

  client.loop();  // Keep MQTT connection alive
}
