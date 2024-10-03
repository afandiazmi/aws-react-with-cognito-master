# 🚀 AWS IoT + React with Cognito

Welcome to **aws-react-with-cognito**, a fully-functional application demonstrating AWS IoT integration using MQTT, ReactJS, and AWS Cognito for secure communication! This project showcases real-time communication with IoT devices like ESP32, including data visualization using charts 📊.

![React + AWS IoT](https://img.shields.io/badge/react-v17-blue.svg) ![AWS IoT](https://img.shields.io/badge/AWS-IoT-orange.svg) ![Cognito](https://img.shields.io/badge/AWS-Cognito-yellowgreen.svg)

## 📖 Table of Contents

- [Getting Started](#-getting-started)
- [Project Setup](#-project-setup)
- [Features](#-features)
- [Scripts](#-available-scripts)
- [Technologies](#-technologies-used)
- [Learn More](#-learn-more)

---

## 🎯 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or later) ✅
- NPM (v6 or later) ✅
- AWS Account with IoT Core and Cognito configured ☁️

### Installation

1. **Clone the Repository** 📂:

   ```bash
   git clone https://github.com/your-username/aws-react-with-cognito.git
   ```

2. **Navigate to the Project Folder** 💻:

   ```bash
   cd aws-react-with-cognito
   ```

3. **Install Dependencies** 📦:

   ```bash
   npm install
   ```

4. **Configure AWS IoT and Cognito** 🔐:
   - Replace the AWS credentials and IoT endpoint in `src/aws-config.js`.

---

## ⚡️ Project Setup

The project integrates AWS IoT Core with a ReactJS front end, using MQTT for real-time data transfer and AWS Cognito for secure authentication. You'll see how to control an IoT device (like ESP32) and display real-time sensor data (e.g., temperature, humidity) on a line chart.

### Features:

- 🖥️ **Control IoT Device**: Turn the device on/off from the dashboard.
- 📊 **Real-time Graphs**: Visualize sensor data using Recharts.
- 🔒 **Secure Communication**: Uses AWS Cognito for authentication.
- ⚙️ **MQTT Protocol**: Real-time messaging with AWS IoT Core.

---

## 🛠️ Available Scripts

In the project directory, you can run the following:

### `npm start`

Runs the app in development mode.Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.You may also see any lint errors in the console.

### `npm run build`

Builds the app for production in the `build` folder.It bundles React in production mode and optimizes the build for the best performance.

### `npm test`

Launches the test runner in interactive watch mode.

---

## 💻 Technologies Used

- **ReactJS**: JavaScript library for building user interfaces.
- **AWS IoT Core**: A managed cloud service for IoT devices.
- **AWS Cognito**: User authentication and secure access control.
- **MQTT**: Messaging protocol for IoT.
- **Recharts**: Library for charting and data visualization.
- **React-Bootstrap**: UI components based on Bootstrap.

---

## 📚 Learn More

- [Create React App Documentation](https://facebook.github.io/create-react-app/docs/getting-started)
- [AWS IoT Documentation](https://docs.aws.amazon.com/iot/latest/developerguide/what-is-aws-iot.html)
- [React Documentation](https://reactjs.org/)

---

## 🚀 Deployment

To deploy the application, follow the steps in the [Create React App Deployment Guide](https://facebook.github.io/create-react-app/docs/deployment).

---

## 🛠️ Troubleshooting

If you encounter issues when running the build:

### `npm run build` fails to minify

This error can occur when dependencies are incompatible with your version of Node.js. Check [this guide](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify) for solutions.

---

### 🔥 Contributions & Feedback

Feel free to contribute by submitting a pull request. For feedback or issues, open an issue or contact me directly via GitHub.

Made with ❤️ by [Afandi Azmi](https://github.com/afandiazmi)
