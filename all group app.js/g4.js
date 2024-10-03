// Smart Door Lock System

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
  const [cardInfo, setCardInfo] = useState(null); // State for card information

  useEffect(() => {
    // Configure AWS Cognito credentials
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
        reconnectPeriod: 5000, // Reconnect every 5 seconds if disconnected
        clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
      });

      mqttClient.on("connect", () => {
        console.log("Connected to AWS IoT");
        setConnected(true);
        mqttClient.subscribe("myesplock", (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log("Subscribed to topic myesplock");
          }
        });
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic, message.toString());
        // Handle incoming messages
        const payload = JSON.parse(message.toString());

        if (payload.cardID !== undefined && payload.status !== undefined) {
          // Handle authorized and unauthorized card information
          setCardInfo({
            cardID: payload.cardID,
            status: payload.status,
            owner: payload.owner || null,
            message: payload.message || null,
          });
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
      {/* Navbar */}
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">ESP32 Control Panel</Navbar.Brand>
        </Container>
      </Navbar>

      {/* Main Content */}
      <Container className="mt-5">
        {/* Connection Status */}
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
        {/* Smart Door lock */}
        <Card
          className="text-center mx-auto"
          style={{ maxWidth: "1350px", backgroundColor: "#cceee8" }}>
          <Card.Body>
            <Card.Title>Smart Door Lock System</Card.Title>
          </Card.Body>
        </Card>

        {/* Card Information */}
        {cardInfo && (
          <Card className="mt-4">
            <Card.Body>
              <Card.Title
                style={{
                  color: "navy",
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                }}>
                Card Information
              </Card.Title>

              <Card.Text style={{ color: "darkslategray" }}>
                <strong>Card ID: </strong> {cardInfo.cardID || "N/A"}
              </Card.Text>

              <Card.Text
                style={{
                  color: cardInfo.status === "authorized" ? "green" : "red",
                }}>
                <strong>Status: </strong> {cardInfo.status || "N/A"}
              </Card.Text>

              {cardInfo.status === "authorized" && cardInfo.owner && (
                <Card.Text style={{ color: "green", fontWeight: "bold" }}>
                  <strong>Owner: </strong> {cardInfo.owner}
                </Card.Text>
              )}

              {cardInfo.status === "unauthorized" && cardInfo.message && (
                <Card.Text style={{ color: "red", fontStyle: "italic" }}>
                  <strong>Message: </strong> {cardInfo.message}
                </Card.Text>
              )}
            </Card.Body>
          </Card>
        )}
      </Container>
    </>
  );
}

export default App;
