// Combined App.js for All Six Projects

import React, { useEffect, useState } from "react";
import AWS from "aws-sdk";
import mqtt from "mqtt";
import { AWS_REGION, IDENTITY_POOL_ID, AWS_IOT_ENDPOINT } from "./aws-config";
import SigV4Utils from "./SigV4Utils";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Navbar,
  Card,
  Container,
  Alert,
  Spinner,
  Button,
} from "react-bootstrap";
import Switch from "react-switch";
import { FaLightbulb, FaFan, FaWindowMaximize } from "react-icons/fa";
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
  // States for connection
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  // States for Smart Security System (Project 1)
  const [imageData, setImageData] = useState(null);

  // States for Smart Lighting Control System (Project 2)
  const [relayState, setRelayState] = useState({
    relay1: null,
    relay2: null,
    relay3: null,
  });

  // States for Smart Energy Management (Project 3)
  const [sensorData, setSensorData] = useState([]);

  // States for Smart Door Lock System (Project 4)
  const [cardInfo, setCardInfo] = useState(null);

  // States for Smart Kitchen Safety System (Project 5)
  const [gasData, setGasData] = useState([]);
  const [currentStatus, setCurrentStatus] = useState("Unknown");
  const [currentGasLevel, setCurrentGasLevel] = useState(null);

  // States for Smart Garden Irrigation System (Project 6)
  const [gardenRelayState, setGardenRelayState] = useState(null);
  const [gardenData, setGardenData] = useState([]);

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

        // Subscribe to topics for all projects
        mqttClient.subscribe(
          [
            "myespcam", // Project 1
            "smart/3lighting", // Project 2
            "cloud/esp32", // Project 3
            "myesplock", // Project 4
            "mykitchen/gas", // Project 5
            "smartgarden/data", // Project 6 data
            "smartgarden/control", // Project 6 control
          ],
          (err) => {
            if (err) {
              console.error("Subscription error:", err);
            } else {
              console.log("Subscribed to all topics");
            }
          }
        );
      });

      mqttClient.on("message", (topic, message) => {
        console.log("Received message:", topic);
        const payload = JSON.parse(message.toString());

        switch (topic) {
          // Project 1: Smart Security System
          case "myespcam":
            if (payload.picture) {
              setImageData(payload.picture);
            }
            break;

          // Project 2: Smart Lighting Control System
          case "smart/3lighting":
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
            break;

          // Project 3: Smart Energy Management
          case "cloud/esp32":
            if (
              payload.timestamp !== undefined &&
              payload.temperature !== undefined &&
              payload.humidity !== undefined &&
              payload.voltage !== undefined &&
              payload.current !== undefined &&
              payload.power !== undefined
            ) {
              setSensorData((prevData) => {
                const newSensorData = [
                  ...prevData,
                  {
                    timestamp: new Date(payload.timestamp * 1000),
                    temperature: payload.temperature,
                    humidity: payload.humidity,
                    voltage: payload.voltage,
                    current: payload.current,
                    power: payload.power,
                  },
                ];
                return newSensorData.slice(-30);
              });
            }
            break;

          // Project 4: Smart Door Lock System
          case "myesplock":
            if (payload.cardID !== undefined && payload.status !== undefined) {
              setCardInfo({
                cardID: payload.cardID,
                status: payload.status,
                owner: payload.owner || null,
                message: payload.message || null,
              });
            }
            break;

          // Project 5: Smart Kitchen Safety System
          case "mykitchen/gas":
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
            break;

          // Project 6: Smart Garden Irrigation System
          case "smartgarden/data":
            if (
              payload.temperature !== undefined &&
              payload.humidity !== undefined &&
              payload.soilMoisture !== undefined
            ) {
              setGardenData((prevData) => {
                const newdataValueData = [
                  ...prevData,
                  {
                    temperature: payload.temperature,
                    humidity: payload.humidity,
                    soilMoisture: payload.soilMoisture,
                    timestampForData: new Date(),
                  },
                ];
                return newdataValueData.slice(-30);
              });
            }
            break;
          case "smartgarden/control":
            if (payload.relay !== undefined) {
              setGardenRelayState(payload.relay);
            }
            break;

          default:
            console.log("Unknown topic:", topic);
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

  // Handlers for Project 2: Smart Lighting Control System
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

  // Handlers for Project 6: Smart Garden Irrigation System
  const publishGardenMessage = (relayValue) => {
    if (client && client.connected) {
      console.log(`Publishing message with relay value: ${relayValue}`);
      const message = JSON.stringify({
        relay: relayValue,
      });
      client.publish("smartgarden/control", message, (err) => {
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
          <Navbar.Brand href="#home">Combined IoT Dashboard</Navbar.Brand>
        </Container>
      </Navbar>

      {/* Connection Status */}
      <Container className="mt-3">
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
      </Container>

      {/* Main Content */}
      <Container className="mt-4">
        {/* Project 1: Smart Security System */}
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>1. Smart Security System</Card.Title>
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

        {/* Project 2: Smart Lighting Control System */}
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>2. Smart Lighting Control System</Card.Title>
            <div className="d-flex flex-column align-items-center">
              {[1, 2, 3].map((num) => (
                <div
                  className="d-flex justify-content-center align-items-center gap-3 mb-2"
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

        {/* Project 3: Smart Energy Management */}
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>3. Smart Energy Management</Card.Title>
            {sensorData.length > 0 ? (
              <>
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
                <Card.Text className="mt-3">
                  <strong>
                    Latest Data - Temperature:{" "}
                    {sensorData[sensorData.length - 1].temperature} °C,
                    Humidity: {sensorData[sensorData.length - 1].humidity} %,
                    Voltage: {sensorData[sensorData.length - 1].voltage} V,
                    Current: {sensorData[sensorData.length - 1].current} A,
                    Power: {sensorData[sensorData.length - 1].power} W
                  </strong>
                </Card.Text>
              </>
            ) : (
              <p>No sensor data available.</p>
            )}
          </Card.Body>
        </Card>

        {/* Project 4: Smart Door Lock System */}
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>4. Smart Door Lock System</Card.Title>
            {cardInfo ? (
              <>
                <Card.Text>
                  <strong>Card ID:</strong> {cardInfo.cardID || "N/A"}
                </Card.Text>
                <Card.Text
                  style={{
                    color: cardInfo.status === "authorized" ? "green" : "red",
                  }}>
                  <strong>Status:</strong> {cardInfo.status || "N/A"}
                </Card.Text>
                {cardInfo.owner && (
                  <Card.Text>
                    <strong>Owner:</strong> {cardInfo.owner}
                  </Card.Text>
                )}
                {cardInfo.message && (
                  <Card.Text>
                    <strong>Message:</strong> {cardInfo.message}
                  </Card.Text>
                )}
              </>
            ) : (
              <p>No card information available.</p>
            )}
          </Card.Body>
        </Card>

        {/* Project 5: Smart Kitchen Safety System */}
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>5. Smart Kitchen Safety System</Card.Title>
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
                  <YAxis />
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

        {/* Project 6: Smart Garden Irrigation System */}
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>6. Smart Garden Irrigation System</Card.Title>
            <Card.Text>
              Current Relay State:{" "}
              <strong>
                {gardenRelayState !== null
                  ? gardenRelayState === 1
                    ? "On"
                    : "Off"
                  : "Unknown"}
              </strong>
            </Card.Text>
            <div className="d-grid gap-2 mb-3">
              <Button
                variant="success"
                size="lg"
                onClick={() => publishGardenMessage(1)}>
                <FaLightbulb className="me-2" />
                Turn On
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => publishGardenMessage(0)}>
                <FaLightbulb className="me-2" />
                Turn Off
              </Button>
            </div>
            {gardenData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={gardenData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestampForData"
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
                    dot={false}
                    name="Temperature (°C)"
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#00FF00"
                    dot={false}
                    name="Humidity (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="soilMoisture"
                    stroke="#0000FF"
                    dot={false}
                    name="Soil Moisture"
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
