# QR-Connect File Share

A serverless, peer-to-peer (P2P) file transfer web application that uses QR codes for connection establishment. Transfer files directly between devices on the same Wi-Fi network without any server involvement after the initial page load.

## Features ✨

- **Serverless P2P Connection**: Uses WebRTC to establish direct connections between browsers. The server only delivers the initial web page.
- **QR Code-Based Pairing**: Simple connection setup by scanning QR codes - no manual ID entry required.
- **Secure & Private**: All file transfers happen directly between devices with WebRTC encryption.
- **Multiple File Support**: Send multiple files in a single session.
- **Progress Tracking**: Real-time progress updates during file transfer.
- **No Internet Required**: Works on local Wi-Fi networks without internet connectivity.

## Technology Stack 🛠️

- **Frontend**:
  - HTML5
  - CSS3
  - JavaScript (Vanilla)
- **WebRTC**: For P2P data channels
- **QR Code Libraries**:
  - `qrcode-generator`: For generating QR codes
  - `html5-qrcode`: For scanning QR codes using device camera
- **Web Server**: Node.js with Express (for serving static files only)

## User Workflow 🚶

1. **Page Load**: Both users open the application in their web browsers
2. **Initiate Connection**: User A clicks "Start Sending" - a QR code appears with the connection offer
3. **Scan Offer**: User B clicks "Receive File" and scans User A's QR code
4. **Generate Answer**: User B's device generates a QR code with the connection answer
5. **Complete Handshake**: User A scans User B's QR code - connection established!
6. **Transfer Files**: User A selects and sends files, User B receives and saves them

## Installation & Setup

### Prerequisites
- Node.js (v12 or higher)
- npm

### Steps

1. Clone the repository:
```bash
git clone https://github.com/rajeet-04/OFFLINE_FILE_TRANSFER.git
cd OFFLINE_FILE_TRANSFER/project
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run server
```

4. Open the application:
   - Open `http://localhost:3000` in your browser
   - For P2P transfer, open the same URL on another device on the same Wi-Fi network (use your computer's local IP instead of localhost, e.g., `http://192.168.1.100:3000`)

## Usage

### Sending Files

1. Click **"Start Sending"**
2. Show the generated QR code to the receiver
3. Wait for the receiver to scan and generate their QR code
4. Scan the receiver's QR code
5. Once connected, select files and click **"Send File"**

### Receiving Files

1. Click **"Receive File"**
2. Click **"Start Camera"** and scan the sender's QR code
3. Show the generated QR code to the sender
4. Wait for sender to scan
5. Once connected, files will be received automatically
6. Select received files and click **"Save Selected"** to download

## Important Notes

- **Same Wi-Fi Network**: Both devices must be on the same local network
- **HTTPS/Localhost**: Camera access requires HTTPS or localhost
- **Browser Support**: Modern browsers with WebRTC support (Chrome, Firefox, Edge, Safari)
- **No STUN/TURN**: This application doesn't use STUN/TURN servers, so it only works on the same network

## Project Structure

```
project/
├── public/
│   ├── index.html      # Main HTML file
│   ├── script.js       # Client-side JavaScript
│   └── style.css       # Styles
├── server.js           # Express server (static file serving only)
├── package.json        # Dependencies
└── README.md          # This file
```

## Development

The server uses `nodemon` for automatic reloading during development:

```bash
npm run server
```

## Limitations

- Only works when devices are on the same Wi-Fi network
- No user authentication or session persistence
- No file transfer history
- QR code size is limited by data capacity (~2KB max for optimal scanning)

## Security

- All connections are established using WebRTC with built-in encryption
- No data passes through the server after page load
- Each session is isolated and temporary

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
