// Smart Security System

import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import mqtt from "mqtt";
import { AWS_REGION, IDENTITY_POOL_ID, AWS_IOT_ENDPOINT } from "./aws-config";
import SigV4Utils from "./SigV4Utils";
import "bootstrap/dist/css/bootstrap.min.css";
import { Navbar, Card, Container, Alert, Spinner } from "react-bootstrap";

function App() {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [imageData, setImageData] = useState(null);

  useEffect(() => {
    // AWS configuration remains the same
    AWS.config.region = AWS_REGION;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
    });

    AWS.config.credentials.get((err) => {
      if (err) {
        console.error("Error retrieving credentials:", err);
        return;
      }

      console.log("AWS credentials retrieved:", AWS.config.credentials);

      const requestUrl = SigV4Utils.getSignedUrl(
        AWS_IOT_ENDPOINT,
        AWS_REGION,
        AWS.config.credentials.accessKeyId,
        AWS.config.credentials.secretAccessKey,
        AWS.config.credentials.sessionToken
      );

      const mqttClient = mqtt.connect(requestUrl, {
        reconnectPeriod: 5000,
        clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
      });

      mqttClient.on("connect", () => {
        console.log("Connected to AWS IoT");
        setConnected(true);
        mqttClient.subscribe("myespcam", (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log("Subscribed to topic myespcam");
          }
        });
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic);
        try {
          const payload = JSON.parse(message.toString());
          if (payload.picture) {
            setImageData(payload.picture);
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      });

      mqttClient.on("error", (error) => {
        console.error("MQTT Client Error:", error);
      });

      mqttClient.on("offline", () => {
        console.log("MQTT Client Offline");
        setConnected(false);
      });

      mqttClient.on("reconnect", () => {
        console.log("MQTT Client Reconnecting");
      });

      setClient(mqttClient);
    });
  }, []);

  return (
    <>
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">ESP32-CAM Image Display</Navbar.Brand>
        </Container>
      </Navbar>

      <Container className="mt-5">
        {connected ? (
          <Alert variant="success" className="text-center">
            Connected to AWS IoT
          </Alert>
        ) : (
          <Alert variant="warning" className="text-center">
            Connecting to AWS IoT...
            <Spinner
              animation="border"
              size="sm"
              role="status"
              className="ms-2"
            />
          </Alert>
        )}

        <Card className="mt-4">
          <Card.Body>
            <Card.Title className="text-center">ESP32-CAM Image</Card.Title>
            <Card.Text className="text-center">
              {imageData ? (
                <img
                  src={`data:image/jpeg;base64,${imageData}`}
                  alt="ESP32-CAM"
                  style={{ maxWidth: "100%", height: "auto" }}
                />
              ) : (
                "No image available"
              )}
            </Card.Text>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default App;
