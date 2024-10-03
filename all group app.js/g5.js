// Smart Kitchen Safety System

import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import mqtt from "mqtt";
import { AWS_REGION, IDENTITY_POOL_ID, AWS_IOT_ENDPOINT } from "./aws-config";
import SigV4Utils from "./SigV4Utils";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaFan, FaWindowMaximize } from "react-icons/fa";

import { Navbar, Card, Container, Alert, Spinner } from "react-bootstrap";

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
  const [connected, setConnected] = useState(false);
  const [gasData, setGasData] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("Unknown");
  const [currentGasLevel, setCurrentGasLevel] = useState(null);

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
        reconnectPeriod: 5000,
        clientId: `mqtt_${Math.random().toString(16).slice(3)}`,
      });

      mqttClient.on("connect", () => {
        console.log("Connected to AWS IoT");
        setConnected(true);
        mqttClient.subscribe("mykitchen/gas", (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log("Subscribed to topic mykitchen/gas");
          }
        });
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic, message.toString());
        const payload = JSON.parse(message.toString());

        setCurrentStatus(payload.status);
        setCurrentGasLevel(payload.gasLevel);

        setGasData((prevData) => {
          const newGasData = [
            ...prevData,
            {
              gasLevel: payload.gasLevel,
              timestamp: new Date(payload.timestamp),
              status: payload.status,
            },
          ];
          return newGasData.slice(-30);
        });
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
          <Navbar.Brand href="#home">Gas Detection System</Navbar.Brand>
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

        <Card className="text-center mx-auto" style={{ maxWidth: "400px" }}>
          <Card.Body>
            <Card.Title>Gas Detection Status</Card.Title>
            <Card.Text>
              Current Status: <strong>{currentStatus}</strong>
            </Card.Text>
            <Card.Text>
              Gas Level: <strong>{currentGasLevel}</strong>
            </Card.Text>
            <div className="d-flex justify-content-center align-items-center gap-3">
              <FaFan
                className={`me-2 ${
                  currentStatus === "Gas Detected"
                    ? "text-danger"
                    : "text-secondary"
                }`}
                title="Fan"
              />
              <FaWindowMaximize
                className={`me-2 ${
                  currentStatus === "Gas Detected"
                    ? "text-primary"
                    : "text-secondary"
                }`}
                title="Window"
              />
            </div>
          </Card.Body>
        </Card>

        <Card className="mt-4">
          <Card.Body>
            <Card.Title>Gas Level Over Time</Card.Title>
            {gasData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={gasData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(tick) =>
                      new Date(tick).toLocaleTimeString()
                    }
                  />
                  <YAxis
                    dataKey="gasLevel"
                    domain={["auto", "auto"]}
                    label={{
                      value: "Gas Level",
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
                    dataKey="gasLevel"
                    stroke="#8884d8"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No gas data available.</p>
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default App;
