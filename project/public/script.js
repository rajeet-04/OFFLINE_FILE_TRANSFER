const socket = io();

// HTML elements
const clientIdDisplay = document.getElementById('clientId');
const clientsList = document.getElementById('clientsList');
const fileInput = document.getElementById('fileInput');
const sendButton = document.getElementById('sendButton');
const messages = document.getElementById('messages');

let localConnection;
let dataChannel;
let selectedClientId = null;
let clients = {};
let receivedFilesCache = [];
let receivingFileMetadata = true;
let fileBuffer = [];
let fileName = '';
let fileSize = 0;
let totalReceived = 0;

// Utility function to log messages
function logMessage(message) {
    messages.value += `${message}\n`;
    messages.scrollTop = messages.scrollHeight; // Auto-scroll to the bottom
}

// Display own client ID
socket.on('connect', () => {
    clientIdDisplay.textContent = socket.id;
    logMessage(`Connected with ID: ${socket.id}`);
});

// Update the list of connected clients
socket.on('clients', (clientList) => {
    clients = clientList;
    updateClientsList();
});

function updateClientsList() {
    clientsList.innerHTML = '<h2>Available Clients:</h2>';
    for (const id in clients) {
        if (id !== socket.id) {
            const button = document.createElement('button');
            button.textContent = `Connect to ${id}`;
            button.onclick = () => connectToClient(id);
            clientsList.appendChild(button);
        }
    }
}

async function connectToClient(clientId) {
    selectedClientId = clientId;
    setupConnection();
}

async function setupConnection() {
    if (selectedClientId) {
        localConnection = new RTCPeerConnection();
        dataChannel = localConnection.createDataChannel('fileTransfer');

        dataChannel.onopen = () => logMessage("Connection opened");
        dataChannel.onclose = () => logMessage("Connection closed");
        dataChannel.onmessage = handleReceiveMessage;

        localConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', {target: selectedClientId, candidate: event.candidate});
                logMessage("ICE candidate sent");
            }
        };

        const offer = await localConnection.createOffer();
        await localConnection.setLocalDescription(offer);
        socket.emit('offer', {target: selectedClientId, offer});
        logMessage("SDP offer sent");
    }
}

socket.on('offer', async (data) => {
    const {sender, offer} = data;
    selectedClientId = sender;
    localConnection = new RTCPeerConnection();

    localConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        dataChannel.onmessage = handleReceiveMessage;
        logMessage("Data channel received");
    };

    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {target: sender, candidate: event.candidate});
            logMessage("ICE candidate sent");
        }
    };

    await localConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    socket.emit('answer', {target: sender, answer});
    logMessage("SDP answer sent");
});

socket.on('answer', async (data) => {
    await localConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    logMessage("SDP answer received");
});

socket.on('ice-candidate', async (data) => {
    if (data.candidate) {
        await localConnection.addIceCandidate(data.candidate);
        logMessage("ICE candidate received");
    }
});

sendButton.onclick = async () => {
    if (dataChannel && dataChannel.readyState === 'open' && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const metadata = {fileName: file.name, fileSize: file.size};
        dataChannel.send(JSON.stringify(metadata));
        logMessage(`Sending file: ${file.name}`);

        receivingFileMetadata = true;

        const reader = file.stream().getReader();
        while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            if (dataChannel.bufferedAmount > 16 * 1024) await new Promise(r => setTimeout(r, 10));
            dataChannel.send(value);
        }
        logMessage("File sent successfully");
    }
};

function handleReceiveMessage(event) {
    // Check if the incoming data is metadata (JSON) or actual file data (ArrayBuffer)
    if (receivingFileMetadata) {
        try {
            const metadata = JSON.parse(event.data); // Parse metadata JSON
            fileName = metadata.fileName;
            fileSize = metadata.fileSize;
            logMessage(`Receiving file: ${fileName} (${fileSize} bytes)`);

            // Initialize variables for receiving the file
            receivingFileMetadata = false;
            fileBuffer = [];
            totalReceived = 0;
        } catch (error) {
            logMessage("Error parsing metadata");
        }
    } else if (event.data instanceof ArrayBuffer) {
        // Handle file chunk data
        fileBuffer.push(event.data);
        totalReceived += event.data.byteLength;
        logMessage(`Receiving data... (${totalReceived}/${fileSize} bytes)`);

        // Check if the entire file is received
        if (totalReceived >= fileSize) {
            const completeFile = new Blob(fileBuffer);
            fileBuffer = [];
            receivingFileMetadata = true; // Ready for the next file

            // Store the received file in the cache
            receivedFilesCache.push({ fileName, file: completeFile });
            logMessage(`File received: ${fileName}`);

            // Update the received files list in the UI
            updateReceivedFilesList();
        }
    }
}


function updateReceivedFilesList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear existing list

    // Add received files to the list
    receivedFilesCache.forEach((fileObj, index) => {
        const listItem = document.createElement('li');

        // Add checkbox for each file
        listItem.innerHTML = `
            <input type="checkbox" class="fileCheckbox" data-index="${index}">
            <span>${fileObj.fileName}</span>
        `;

        fileList.appendChild(listItem);
    });

    logMessage("Updated received files list");
}

document.getElementById('saveSelectedButton').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.fileCheckbox:checked'); // Get all checked checkboxes
    checkboxes.forEach((checkbox) => {
        const index = checkbox.getAttribute('data-index'); // Get the index of the checked file
        const fileObj = receivedFilesCache[index]; // Retrieve the file object from the cache

        // Create a download link for the file
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(fileObj.file); // Create an object URL for the file
        downloadLink.download = fileObj.fileName; // Set the file name for downloading
        downloadLink.click(); // Trigger the download

        logMessage(`Downloading: ${fileObj.fileName}`); // Log the download action
    });
});
