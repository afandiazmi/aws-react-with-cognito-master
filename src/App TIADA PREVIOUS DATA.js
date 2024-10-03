// src/App.js
import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import mqtt from "mqtt";
import { AWS_REGION, IDENTITY_POOL_ID, AWS_IOT_ENDPOINT } from "./aws-config";
import SigV4Utils from "./SigV4Utils";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaLightbulb } from "react-icons/fa";

import {
  Navbar,
  Card,
  Button,
  Container,
  Alert,
  Spinner,
} from "react-bootstrap";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function App() {
  const [client, setClient] = useState(null);
  const [relayState, setRelayState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [dhtData, setDHTData] = useState([]);

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
        mqttClient.subscribe("afandi/test/project", (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log("Subscribed to topic afandi/test/project");
          }
        });
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic, message.toString());
        // Handle incoming messages
        const payload = JSON.parse(message.toString());

        if (payload.relay !== undefined) {
          setRelayState(payload.relay);
        }

        if (
          payload.sensorDHT !== undefined &&
          payload.timestamp !== undefined
        ) {
          setDHTData((prevData) => [
            ...prevData,
            {
              sensorDHT: payload.sensorDHT,
              timestamp: new Date(payload.timestamp),
            },
          ]);
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

  const publishMessage = (relayValue) => {
    if (client && client.connected) {
      console.log(`Publishing message with relay value: ${relayValue}`);
      const message = JSON.stringify({
        relay: relayValue,
        timestamp: Date.now(),
      });
      client.publish("afandi/test/project", message, (err) => {
        if (err) {
          console.error("Publish error:", err);
        } else {
          console.log("Published message:", message);
        }
      });
    } else {
      console.log("MQTT client not connected yet");
    }
  };

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

        {/* Control Card */}
        <Card className="text-center mx-auto" style={{ maxWidth: "400px" }}>
          <Card.Body>
            <Card.Title>Relay Control</Card.Title>
            <Card.Text>
              Current Relay State:{" "}
              <strong>
                {relayState !== null
                  ? relayState === 1
                    ? "On"
                    : "Off"
                  : "Unknown"}
              </strong>
            </Card.Text>
            <div className="d-grid gap-2">
              <Button
                variant="success"
                size="lg"
                onClick={() => publishMessage(1)}>
                <FaLightbulb className="me-2" />
                Turn On
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => publishMessage(0)}>
                <FaLightbulb className="me-2" />
                Turn Off
              </Button>
            </div>
          </Card.Body>
        </Card>

        {/* Sensor Data Chart */}
        <Card className="mt-4">
          <Card.Body>
            <Card.Title>Sensor DHT Data Over Time</Card.Title>
            {dhtData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dhtData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(tick) =>
                      new Date(tick).toLocaleTimeString()
                    }
                  />
                  <YAxis
                    dataKey="sensorDHT"
                    domain={["auto", "auto"]}
                    label={{
                      value: "Sensor DHT",
                      angle: -90,
                      position: "insideLeft",
                    }}
                  />
                  <Tooltip
                    labelFormatter={(label) =>
                      `Time: ${new Date(label).toLocaleTimeString()}`
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="sensorDHT"
                    stroke="#8884d8"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No sensor data available.</p>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default App;
