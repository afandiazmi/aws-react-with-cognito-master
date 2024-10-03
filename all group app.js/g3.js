// Smart Energy Management

import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import mqtt from "mqtt";
import { AWS_REGION, IDENTITY_POOL_ID, AWS_IOT_ENDPOINT } from "./aws-config";
import SigV4Utils from "./SigV4Utils";
import "bootstrap/dist/css/bootstrap.min.css";
import { Navbar, Card, Container, Alert, Spinner } from "react-bootstrap";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

function App() {
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState([]);

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
        mqttClient.subscribe("cloud/esp32", (err) => {
          if (err) {
            console.error("Subscription error:", err);
          } else {
            console.log("Subscribed to topic cloud/esp32");
          }
        });
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic, message.toString());
        const payload = JSON.parse(message.toString());

        if (
          payload.timestamp !== undefined &&
          payload.temperature !== undefined &&
          payload.humidity !== undefined &&
          payload.voltage !== undefined &&
          payload.current !== undefined &&
          payload.power !== undefined
        ) {
          setSensorData((prevData) => {
            // Add the new data and limit the size to the latest 50 entries
            const newSensorData = [
              ...prevData,
              {
                timestamp: new Date(payload.timestamp * 1000), // Convert to milliseconds
                temperature: payload.temperature,
                humidity: payload.humidity,
                voltage: payload.voltage,
                current: payload.current,
                power: payload.power,
              },
            ];
            return newSensorData.slice(-30); // Keep only the last 30 entries
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
          <Navbar.Brand href="#home">ESP32 Sensor Data</Navbar.Brand>
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

        {/* Sensor Data Chart */}
        <Card className="mt-4">
          <Card.Body>
            <Card.Title>Sensor Data Over Time</Card.Title>
            {sensorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sensorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(tick) =>
                      new Date(tick).toLocaleTimeString()
                    }
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(label) =>
                      `Time: ${new Date(label).toLocaleTimeString()}`
                    }
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#FF0000"
                    name="Temperature (°C)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#0000FF"
                    name="Humidity (%)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="voltage"
                    stroke="#00FF00"
                    name="Voltage (V)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="current"
                    stroke="#FFA500"
                    name="Current (A)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="power"
                    stroke="#800080"
                    name="Power (W)"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No sensor data available.</p>
            )}
          </Card.Body>
        </Card>

        {/* Data Preview */}
        <Card className="mt-4">
          <Card.Body>
            <Card.Title>Latest Sensor Data</Card.Title>
            <Card.Text>
              <strong>
                {sensorData.length > 0
                  ? `Temperature: ${
                      sensorData[sensorData.length - 1].temperature
                    } °C, 
                     Humidity: ${sensorData[sensorData.length - 1].humidity} %, 
                     Voltage: ${sensorData[sensorData.length - 1].voltage} V, 
                     Current: ${sensorData[sensorData.length - 1].current} A, 
                     Power: ${sensorData[sensorData.length - 1].power} W`
                  : "No data available"}
              </strong>
            </Card.Text>
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}

export default App;
