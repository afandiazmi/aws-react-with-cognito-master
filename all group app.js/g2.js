// Smart Lighting Control System

import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import mqtt from "mqtt";
import { AWS_REGION, IDENTITY_POOL_ID, AWS_IOT_ENDPOINT } from "./aws-config";
import SigV4Utils from "./SigV4Utils";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaLightbulb } from "react-icons/fa";
import Switch from "react-switch"; // Import the toggle switch

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
  const [relayState, setRelayState] = useState({
    relay1: null,
    relay2: null,
    relay3: null,
  });
  const [connected, setConnected] = useState(false);
  const [AnalogData, setAnalogData] = useState([]);

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
        mqttClient.subscribe("smart/3lighting", (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log("Subscribed to topic smart/3lighting");
          }
        });
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic, message.toString());
        const payload = JSON.parse(message.toString());

        if (payload.relay1 !== undefined) {
          setRelayState((prevState) => ({
            ...prevState,
            relay1: payload.relay1,
          }));
        }

        if (payload.relay2 !== undefined) {
          setRelayState((prevState) => ({
            ...prevState,
            relay2: payload.relay2,
          }));
        }

        if (payload.relay3 !== undefined) {
          setRelayState((prevState) => ({
            ...prevState,
            relay3: payload.relay3,
          }));
        }

        if (
          payload.dataValue !== undefined &&
          payload.timestampForData !== undefined
        ) {
          setAnalogData((prevData) => {
            const newDataValueData = [
              ...prevData,
              {
                dataValue: payload.dataValue,
                timestampForData: new Date(payload.timestampForData),
              },
            ];
            return newDataValueData.slice(-30);
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

  const handleToggleChange = (relay, checked) => {
    const newState = checked ? 1 : 0;
    if (client && client.connected) {
      console.log(`Publishing message with ${relay} value: ${newState}`);
      const message = JSON.stringify({
        [relay]: newState,
      });
      client.publish("smart/3lighting", message, (err) => {
        if (err) {
          console.error("Publish error:", err);
        } else {
          console.log("Published message:", message);
        }
      });
    } else {
      console.log("MQTT client not connected yet");
    }
    setRelayState((prevState) => ({ ...prevState, [relay]: newState }));
  };

  return (
    <>
      <Navbar bg="dark" variant="dark">
        <Container>
          <Navbar.Brand href="#home">ESP32 Control Panel</Navbar.Brand>
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
            <Card.Title>Relay Control</Card.Title>
            <div className="d-flex flex-column align-items-center">
              {[1, 2, 3].map((num) => (
                <div
                  className="d-flex justify-content-center align-items-center gap-3"
                  key={num}>
                  <FaLightbulb
                    className={`me-2 ${
                      relayState[`relay${num}`] === 1
                        ? "text-warning"
                        : "text-secondary"
                    }`}
                  />
                  <Switch
                    checked={relayState[`relay${num}`] === 1}
                    onChange={(checked) =>
                      handleToggleChange(`relay${num}`, checked)
                    }
                    onColor="#00FF00"
                    offColor="#FF0000"
                    height={20}
                    width={48}
                  />
                  <span>{`Relay ${num}`}</span>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default App;
