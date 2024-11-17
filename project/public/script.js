const socket = io();

//HTML elements
const clientIdDisplay = document.getElementById('clientId');
const clientsList = document.getElementById('clientsList');
const fileInput = document.getElementById('fileInput');
const sendButton = document.getElementById('sendButton');
const messages = document.getElementById('messages');

let localConnection;
let dataChannel;
let selectedClientId = null;

//Store connected clients
let clients = {};
let receivedFilesCache = []; // Store received files temporarily
let isFirstFile = true; // Flag to skip the first dummy file

// Display own client ID
socket.on('connect', () => {
    clientIdDisplay.textContent = socket.id;
});

//Update the list of connected clients
socket.on('clients', (clientList) => {
    clients = clientList;
    updateClientsList();
});

//Update client list buttons
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

//Handle connection
async function connectToClient(clientId) {
    selectedClientId = clientId;
    setupConnection();
}

//WebRTC
async function setupConnection() {
    if (selectedClientId) {
        lolConnection = new RTCPeerConnection();
        dataChannel = localConnection.createDataChannel('fileTransfer');

        dataChannel.onopen = () => logMessage("Connection opened");
        dataChannel.onclose = () => logMessage("Connection closed");
        dataChannel.onmessage = handleReceiveMessage;

        localConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { target: selectedClientId, candidate: event.candidate });
            }
        };

        const offer = await localConnection.createOffer();
        await localConnection.setLocalDescription(offer);
        socket.emit('offer', { target: selectedClientId, offer });
    }
}

//incoming SDP
socket.on('offer', async (data) => {
    const { sender, offer } = data;
    selectedClientId = sender;

    localConnection = new RTCPeerConnection();
    localConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        dataChannel.onmessage = handleReceiveMessage;
        dataChannel.onopen = () => logMessage("Connection opened");
        dataChannel.onclose = () => logMessage("Connection closed");
    };

    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { target: sender, candidate: event.candidate });
        }
    };

    await localConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await localConnection.createAnswer();
    await localConnection.setLocalDescription(answer);
    socket.emit('answer', { target: sender, answer });
});

socket.on('answer', async (data) => {
    const { answer } = data;
    await localConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on('ice-candidate', async (data) => {
    const { candidate } = data;
    if (candidate) {
        await localConnection.addIceCandidate(candidate);
    }
});

//Send a file to the client
sendButton.onclick = async () => {
    if (dataChannel && dataChannel.readyState === 'open' && fileInput.files.length > 0) {
        const file = fileInput.files[0];

        //Send file name & data
        const metadata = {
            fileName: file.name, // Include the original file name
            fileSize: file.size
        };

        //READ FILE
        const reader = file.stream().getReader();
        let loaded = 0;

        //send metadata
        dataChannel.send(JSON.stringify(metadata));

        //send the file in chunks
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            dataChannel.send(value);
            loaded += value.length;
        }
        logMessage(`File sent: ${file.name}`);
    }
};

let fileBuffer = [];
let receivingFileMetadata = false;
let fileName = '';
let fileSize = 0;
let totalReceived = 0;

function handleReceiveMessage(event) {
    const { data } = event;

    if (isFirstFile) {
        //Skip processing the first file (dummy or initial file)
        logMessage("Received first file, skipping processing.");
        isFirstFile = false; // After the first file, treat subsequent files normally
        return;
    }

    if (receivingFileMetadata) {
        //Metadata file
        const metadata = JSON.parse(data);
        fileName = metadata.fileName;
        fileSize = metadata.fileSize;
        totalReceived = 0;
        fileBuffer = [];
        receivingFileMetadata = false;
    } else if (data instanceof ArrayBuffer) {
        //receive & buffer
        totalReceived += data.byteLength;
        fileBuffer.push(data);

        if (totalReceived >= fileSize) {
            //create blob
            const completeFile = new Blob(fileBuffer);
            fileBuffer = [];
            receivingFileMetadata = true; // Ready for the next file

            //Store the received file in cache
            receivedFilesCache.push({ fileName, file: completeFile });

            //Update the UI
            updateReceivedFilesList();
        }
    }
}

//Update the received files
function updateReceivedFilesList() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = ''; // Clear existing list

    //Add received files
    receivedFilesCache.forEach((fileObj, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <input type="checkbox" class="fileCheckbox" data-index="${index}"> 
            ${fileObj.fileName}
        `;
        fileList.appendChild(listItem);
    });
}

// Save selected files to disk
document.getElementById('saveSelectedButton').onclick = () => {
    const selectedCheckboxes = document.querySelectorAll('.fileCheckbox:checked');

    selectedCheckboxes.forEach(checkbox => {
        const fileIndex = checkbox.getAttribute('data-index');
        const fileObj = receivedFilesCache[fileIndex];

        downloadFile(fileObj.file, fileObj.fileName);
    });

    logMessage(`${selectedCheckboxes.length} file(s) saved.`);
};

//trigger download
function downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName; // Ensure original file name with extension
    link.style.display = 'none';  // Hide the link
    document.body.appendChild(link); // Append the link to the body
    link.click();  // Trigger the download
    document.body.removeChild(link);  // Clean up the link element
    logMessage(`File received and downloaded: ${fileName}`);
}


function logMessage(message) {
    messages.value += message + '\n';
}
