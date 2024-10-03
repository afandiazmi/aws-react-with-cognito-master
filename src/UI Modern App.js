// Combined App.js with modern dashboard design

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
  Row,
  Col,
  Button,
} from "react-bootstrap";
import Switch from "react-switch";
import {
  FaLightbulb,
  FaFan,
  FaWindowMaximize,
  FaLock,
  FaUnlockAlt,
} from "react-icons/fa";
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

  // Project-specific states
  const [imageData, setImageData] = useState(null); // Smart Security System
  const [relayState, setRelayState] = useState({
    relay1: null,
    relay2: null,
    relay3: null,
  }); // Smart Lighting
  const [sensorData, setSensorData] = useState([]); // Smart Energy
  const [cardInfo, setCardInfo] = useState(null); // Smart Door Lock
  const [gasData, setGasData] = useState([]); // Smart Kitchen Safety
  const [currentStatus, setCurrentStatus] = useState("Unknown");
  const [currentGasLevel, setCurrentGasLevel] = useState(null);
  const [gardenRelayState, setGardenRelayState] = useState(null); // Smart Garden Irrigation
  const [gardenData, setGardenData] = useState([]);

  useEffect(() => {
    AWS.config.region = AWS_REGION;
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: IDENTITY_POOL_ID,
    });

    AWS.config.credentials.get((err) => {
      if (err) {
        console.error("Error retrieving credentials:", err);
        return;
      }

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
        setConnected(true);
        mqttClient.subscribe([
          "myespcam",
          "smart/3lighting",
          "cloud/esp32",
          "myesplock",
          "mykitchen/gas",
          "smartgarden/data",
          "smartgarden/control",
        ]);
      });

      mqttClient.on("message", (topic, message) => {
        const payload = JSON.parse(message.toString());

        switch (topic) {
          case "myespcam":
            if (payload.picture) setImageData(payload.picture);
            break;
          case "smart/3lighting":
            setRelayState((prevState) => ({
              ...prevState,
              relay1: payload.relay1 ?? prevState.relay1,
              relay2: payload.relay2 ?? prevState.relay2,
              relay3: payload.relay3 ?? prevState.relay3,
            }));
            break;
          case "cloud/esp32":
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
            break;
          case "myesplock":
            setCardInfo({
              cardID: payload.cardID,
              status: payload.status,
              owner: payload.owner || null,
              message: payload.message || null,
            });
            break;
          case "mykitchen/gas":
            setCurrentStatus(payload.status);
            setCurrentGasLevel(payload.gasLevel);
            setGasData((prevData) => [
              ...prevData,
              {
                gasLevel: payload.gasLevel,
                timestamp: new Date(payload.timestamp),
              },
            ]);
            break;
          case "smartgarden/data":
            setGardenData((prevData) => [
              ...prevData,
              {
                temperature: payload.temperature,
                humidity: payload.humidity,
                soilMoisture: payload.soilMoisture,
                timestampForData: new Date(),
              },
            ]);
            break;
          case "smartgarden/control":
            setGardenRelayState(payload.relay);
            break;
          default:
            break;
        }
      });

      setClient(mqttClient);
    });
  }, []);

  const handleToggleChange = (relay, checked) => {
    const newState = checked ? 1 : 0;
    if (client && client.connected) {
      const message = JSON.stringify({ [relay]: newState });
      client.publish("smart/3lighting", message);
    }
    setRelayState((prevState) => ({ ...prevState, [relay]: newState }));
  };

  const publishGardenMessage = (relayValue) => {
    if (client && client.connected) {
      const message = JSON.stringify({ relay: relayValue });
      client.publish("smartgarden/control", message);
    }
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" className="mb-4">
        <Container>
          <Navbar.Brand>Smart Home Dashboard</Navbar.Brand>
        </Container>
      </Navbar>

      <Container fluid>
        {/* Connection Status */}
        <Row className="mb-4">
          <Col>
            {connected ? (
              <Alert variant="success" className="text-center">
                Connected to AWS IoT
              </Alert>
            ) : (
              <Alert variant="warning" className="text-center">
                Connecting to AWS IoT...
                <Spinner animation="border" size="sm" className="ms-2" />
              </Alert>
            )}
          </Col>
        </Row>

        {/* Project Dashboard */}
        <Row>
          {/* Smart Security System */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Smart Security System</Card.Title>
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
          </Col>

          {/* Smart Lighting Control System */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Smart Lighting Control System</Card.Title>
                <div className="d-flex flex-column align-items-center">
                  {[1, 2, 3].map((num) => (
                    <div
                      className="d-flex justify-content-between align-items-center mb-3"
                      key={num}
                      style={{ width: "100%" }}>
                      <FaLightbulb
                        className={`me-2 ${
                          relayState[`relay${num}`] === 1
                            ? "text-warning"
                            : "text-secondary"
                        }`}
                      />
                      <span>{`Relay ${num}`}</span>
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
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Smart Energy Management */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Smart Energy Management</Card.Title>
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
          </Col>

          {/* Smart Door Lock System */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Smart Door Lock System</Card.Title>
                {cardInfo ? (
                  <>
                    <Card.Text>
                      <strong>Card ID:</strong> {cardInfo.cardID || "N/A"}
                    </Card.Text>
                    <Card.Text
                      style={{
                        color:
                          cardInfo.status === "authorized" ? "green" : "red",
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
                    <Button variant="primary">
                      {cardInfo.status === "authorized" ? (
                        <FaUnlockAlt className="me-2" />
                      ) : (
                        <FaLock className="me-2" />
                      )}
                      {cardInfo.status === "authorized" ? "Unlock" : "Locked"}
                    </Button>
                  </>
                ) : (
                  <p>No card information available.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Smart Kitchen Safety System */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Smart Kitchen Safety System</Card.Title>
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
          </Col>

          {/* Smart Garden Irrigation System */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Body>
                <Card.Title>Smart Garden Irrigation System</Card.Title>
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
          </Col>
        </Row>
      </Container>
    </>
  );
}

export default App;