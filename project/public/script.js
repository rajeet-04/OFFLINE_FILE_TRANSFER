// HTML elements
const modeSelection = document.getElementById('modeSelection');
const senderView = document.getElementById('senderView');
const receiverView = document.getElementById('receiverView');
const messages = document.getElementById('messages');

// Sender elements
const senderBtn = document.getElementById('senderBtn');
const senderStep1 = document.getElementById('senderStep1');
const senderStep2 = document.getElementById('senderStep2');
const senderStep3 = document.getElementById('senderStep3');
const offerQRCode = document.getElementById('offerQRCode');
const senderScanner = document.getElementById('senderScanner');
const startSenderScan = document.getElementById('startSenderScan');
const resetSender = document.getElementById('resetSender');

// Receiver elements
const receiverBtn = document.getElementById('receiverBtn');
const receiverStep1 = document.getElementById('receiverStep1');
const receiverStep2 = document.getElementById('receiverStep2');
const receiverStep3 = document.getElementById('receiverStep3');
const answerQRCode = document.getElementById('answerQRCode');
const receiverScanner = document.getElementById('receiverScanner');
const startReceiverScan = document.getElementById('startReceiverScan');
const resetReceiver = document.getElementById('resetReceiver');

// File transfer elements
const fileInput = document.getElementById('fileInput');
const sendButton = document.getElementById('sendButton');
const sendProgress = document.getElementById('sendProgress');
const receiveProgress = document.getElementById('receiveProgress');
const fileList = document.getElementById('fileList');
const saveSelectedButton = document.getElementById('saveSelectedButton');

// WebRTC variables
let localConnection;
let dataChannel;
let receivedFilesCache = [];
let receivingFileMetadata = true;
let fileBuffer = [];
let fileName = '';
let fileSize = 0;
let totalReceived = 0;

// QR code scanners
let senderQrScanner = null;
let receiverQrScanner = null;

// Utility function to log messages
function logMessage(message) {
    const timestamp = new Date().toLocaleTimeString();
    messages.value += `[${timestamp}] ${message}\n`;
    messages.scrollTop = messages.scrollHeight;
}

// Utility function to generate QR code
function generateQRCode(text, targetElement) {
    try {
        // Use error correction level 'L' (Low) to fit more data
        const typeNumber = 0; // Auto-detect size
        const errorCorrectionLevel = 'L';
        const qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData(text);
        qr.make();
        
        // Create image element
        const cellSize = 4;
        const margin = 4;
        targetElement.innerHTML = qr.createImgTag(cellSize, margin);
        
        // Style the image
        const img = targetElement.querySelector('img');
        if (img) {
            img.style.border = '2px solid #ddd';
            img.style.borderRadius = '10px';
            img.style.padding = '10px';
            img.style.background = 'white';
        }
        
        return true;
    } catch (error) {
        logMessage('Error generating QR code: ' + error.message);
        return false;
    }
}

// Mode selection handlers
senderBtn.onclick = () => {
    modeSelection.classList.add('hidden');
    senderView.classList.remove('hidden');
    initiateSender();
};

receiverBtn.onclick = () => {
    modeSelection.classList.add('hidden');
    receiverView.classList.remove('hidden');
    logMessage('Receiver mode activated. Scan the sender\'s QR code.');
};

// Reset handlers
resetSender.onclick = () => {
    resetConnection();
    senderView.classList.add('hidden');
    modeSelection.classList.remove('hidden');
};

resetReceiver.onclick = () => {
    resetConnection();
    receiverView.classList.add('hidden');
    modeSelection.classList.remove('hidden');
};

function resetConnection() {
    if (localConnection) {
        localConnection.close();
        localConnection = null;
    }
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (senderQrScanner) {
        senderQrScanner.stop();
        senderQrScanner = null;
    }
    if (receiverQrScanner) {
        receiverQrScanner.stop();
        receiverQrScanner = null;
    }
    senderStep1.classList.remove('hidden');
    senderStep2.classList.add('hidden');
    senderStep3.classList.add('hidden');
    receiverStep1.classList.remove('hidden');
    receiverStep2.classList.add('hidden');
    receiverStep3.classList.add('hidden');
    receivedFilesCache = [];
    fileList.innerHTML = '';
    logMessage('Connection reset.');
}

// Sender workflow
async function initiateSender() {
    logMessage('Sender mode activated. Generating connection offer...');
    
    // Create WebRTC connection
    localConnection = new RTCPeerConnection();
    dataChannel = localConnection.createDataChannel('fileTransfer');
    
    // Set up data channel handlers
    dataChannel.onopen = () => {
        logMessage('Connection established!');
        senderStep2.classList.add('hidden');
        senderStep3.classList.remove('hidden');
    };
    
    dataChannel.onclose = () => {
        logMessage('Connection closed.');
    };
    
    // Handle ICE candidates - collect them all before generating QR
    const iceCandidates = [];
    localConnection.onicecandidate = (event) => {
        if (event.candidate) {
            iceCandidates.push(event.candidate);
        }
    };
    
    // Wait for ICE gathering to complete
    localConnection.onicegatheringstatechange = async () => {
        if (localConnection.iceGatheringState === 'complete') {
            const offerData = {
                offer: localConnection.localDescription,
                candidates: iceCandidates
            };
            const offerString = JSON.stringify(offerData);
            logMessage('Offer generated. Displaying QR code...');
            
            // Generate QR code
            offerQRCode.innerHTML = '';
            generateQRCode(offerString, offerQRCode);
        }
    };
    
    // Create and set local description
    const offer = await localConnection.createOffer();
    await localConnection.setLocalDescription(offer);
}

// Sender: Scan receiver's answer QR
startSenderScan.onclick = () => {
    senderStep1.classList.add('hidden');
    senderStep2.classList.remove('hidden');
    
    senderQrScanner = new Html5Qrcode("senderScanner");
    
    senderQrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            logMessage('Answer QR code scanned!');
            senderQrScanner.stop();
            processSenderAnswer(decodedText);
        },
        (errorMessage) => {
            // Ignore scanning errors
        }
    ).catch(err => {
        logMessage('Error starting camera: ' + err);
    });
};

async function processSenderAnswer(answerString) {
    try {
        const answerData = JSON.parse(answerString);
        
        // Set remote description
        await localConnection.setRemoteDescription(new RTCSessionDescription(answerData.answer));
        
        // Add ICE candidates
        for (const candidate of answerData.candidates) {
            await localConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        
        logMessage('Connection handshake complete. Waiting for connection...');
    } catch (error) {
        logMessage('Error processing answer: ' + error.message);
    }
}

// Receiver workflow
startReceiverScan.onclick = () => {
    receiverQrScanner = new Html5Qrcode("receiverScanner");
    
    receiverQrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
            logMessage('Offer QR code scanned!');
            receiverQrScanner.stop();
            processReceiverOffer(decodedText);
        },
        (errorMessage) => {
            // Ignore scanning errors
        }
    ).catch(err => {
        logMessage('Error starting camera: ' + err);
    });
};

async function processReceiverOffer(offerString) {
    try {
        const offerData = JSON.parse(offerString);
        
        // Create WebRTC connection
        localConnection = new RTCPeerConnection();
        
        // Set up data channel handler
        localConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            dataChannel.onmessage = handleReceiveMessage;
            dataChannel.onopen = () => {
                logMessage('Connection established!');
                receiverStep2.classList.add('hidden');
                receiverStep3.classList.remove('hidden');
            };
            dataChannel.onclose = () => {
                logMessage('Connection closed.');
            };
        };
        
        // Handle ICE candidates
        const iceCandidates = [];
        localConnection.onicecandidate = (event) => {
            if (event.candidate) {
                iceCandidates.push(event.candidate);
            }
        };
        
        // Set remote description
        await localConnection.setRemoteDescription(new RTCSessionDescription(offerData.offer));
        
        // Add sender's ICE candidates
        for (const candidate of offerData.candidates) {
            await localConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        
        // Create answer
        const answer = await localConnection.createAnswer();
        await localConnection.setLocalDescription(answer);
        
        // Wait for ICE gathering to complete
        localConnection.onicegatheringstatechange = async () => {
            if (localConnection.iceGatheringState === 'complete') {
                const answerData = {
                    answer: localConnection.localDescription,
                    candidates: iceCandidates
                };
                const answerString = JSON.stringify(answerData);
                logMessage('Answer generated. Displaying QR code...');
                
                // Show step 2 with QR code
                receiverStep1.classList.add('hidden');
                receiverStep2.classList.remove('hidden');
                
                // Generate QR code
                answerQRCode.innerHTML = '';
                generateQRCode(answerString, answerQRCode);
            }
        };
    } catch (error) {
        logMessage('Error processing offer: ' + error.message);
    }
}

// File sending
sendButton.onclick = async () => {
    if (dataChannel && dataChannel.readyState === 'open' && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            await sendFile(file);
        }
    } else if (!dataChannel || dataChannel.readyState !== 'open') {
        logMessage('Error: Connection not established.');
    } else {
        logMessage('Error: No file selected.');
    }
};

async function sendFile(file) {
    const metadata = { fileName: file.name, fileSize: file.size };
    dataChannel.send(JSON.stringify(metadata));
    logMessage(`Sending file: ${file.name} (${formatBytes(file.size)})`);
    
    const chunkSize = 16384; // 16KB chunks
    let offset = 0;
    
    while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const arrayBuffer = await chunk.arrayBuffer();
        
        // Wait if buffer is getting full
        while (dataChannel.bufferedAmount > chunkSize * 4) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        dataChannel.send(arrayBuffer);
        offset += chunkSize;
        
        // Update progress
        const progress = Math.min(100, Math.round((offset / file.size) * 100));
        sendProgress.textContent = `Sending: ${progress}%`;
    }
    
    logMessage(`File sent successfully: ${file.name}`);
    sendProgress.textContent = '';
}

// File receiving
function handleReceiveMessage(event) {
    if (receivingFileMetadata) {
        try {
            const metadata = JSON.parse(event.data);
            fileName = metadata.fileName;
            fileSize = metadata.fileSize;
            logMessage(`Receiving file: ${fileName} (${formatBytes(fileSize)})`);
            
            receivingFileMetadata = false;
            fileBuffer = [];
            totalReceived = 0;
        } catch (error) {
            logMessage('Error parsing metadata: ' + error.message);
        }
    } else if (event.data instanceof ArrayBuffer) {
        fileBuffer.push(event.data);
        totalReceived += event.data.byteLength;
        
        const progress = Math.min(100, Math.round((totalReceived / fileSize) * 100));
        receiveProgress.textContent = `Receiving: ${progress}%`;
        
        if (totalReceived >= fileSize) {
            const completeFile = new Blob(fileBuffer);
            fileBuffer = [];
            receivingFileMetadata = true;
            receiveProgress.textContent = '';
            
            receivedFilesCache.push({ fileName, file: completeFile });
            logMessage(`File received: ${fileName}`);
            
            updateReceivedFilesList();
        }
    }
}

function updateReceivedFilesList() {
    fileList.innerHTML = '';
    
    receivedFilesCache.forEach((fileObj, index) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <input type="checkbox" class="fileCheckbox" data-index="${index}">
            <span>${fileObj.fileName}</span>
        `;
        fileList.appendChild(listItem);
    });
}

saveSelectedButton.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.fileCheckbox:checked');
    checkboxes.forEach((checkbox) => {
        const index = checkbox.getAttribute('data-index');
        const fileObj = receivedFilesCache[index];
        
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(fileObj.file);
        downloadLink.download = fileObj.fileName;
        downloadLink.click();
        
        logMessage(`Downloaded: ${fileObj.fileName}`);
    });
});

// Utility function to format bytes
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initial message
logMessage('QR-Connect File Share ready. Choose your mode to begin.');
