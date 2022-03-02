import { useState } from 'react'
import logo from './logo.svg'
import './App.css' 
import {access_token} from './config'
function App() {
  let finalsReceived;  
  let audioContext;
  let websocket; 
  let arr =[]

  const [recordBtnText, setRecordBtnText] = useState("Record")
  const [statusText, setStatusText] = useState("Not Started")
  const [tableContent, setTableContent] = useState([])

  function doStream() {  
    finalsReceived = 0; 
    audioContext = new (window.AudioContext || window.WebkitAudioContext)();

    const content_type = `audio/x-raw;layout=interleaved;rate=${audioContext.sampleRate};format=S16LE;channels=1`;
    const baseUrl = 'wss://api.rev.ai/speechtotext/v1alpha/stream';
    const query = `access_token=${access_token}&content_type=${content_type}`;
    websocket = new WebSocket(`${baseUrl}?${query}`);

    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
    websocket.onerror = console.error;
 
    setRecordBtnText("Stop") 
}


    const endStream = () => {
        if (websocket) {
            websocket.send("EOS");
            websocket.close();
        }
        if (audioContext) {
            audioContext.close();
        }
 
        setRecordBtnText("Record") 

}

      function onOpen(event) {
          resetDisplay(); 
          setStatusText("Opened")
          navigator.mediaDevices.getUserMedia({ audio: true }).then((micStream) => {
              audioContext.suspend();
              var scriptNode = audioContext.createScriptProcessor(4096, 1, 1 );
              var input = input = audioContext.createMediaStreamSource(micStream);
              scriptNode.addEventListener('audioprocess', (event) => processAudioEvent(event));
              input.connect(scriptNode);
              scriptNode.connect(audioContext.destination);
              audioContext.resume();
          });
      }

      function onClose(event) { 
          setStatusText(`Closed with ${event.code}: ${event.reason}`)
      }
 
    function onMessage(event) { 
      // console.log(event.data)
        var data = JSON.parse(event.data);
        if(data.type === "connected"){

          setStatusText(`Connected, job id is ${data.id}`)

        } else if (data.type === "partial"){

          // arr.push(parseResponse(data))

          // setTableContent([...arr]) 
          
        } else if (data.type === "final"){
          
          arr.push(parseResponse(data) )

          setTableContent([...arr]) 

        } else {
          console.error("Received unexpected message");
        }
    }
 
    function processAudioEvent(e) {
        if (audioContext.state === 'suspended' || audioContext.state === 'closed' || !websocket) {
            return;
        }
        let inputData = e.inputBuffer.getChannelData(0);

        let output = new DataView(new ArrayBuffer(inputData.length * 2));
        for (let i = 0; i < inputData.length; i++) {
            let multiplier = inputData[i] < 0 ? 0x8000 : 0x7fff;
            output.setInt16(i * 2, inputData[i] * multiplier | 0, true);
        }

        let intData = new Int16Array(output.buffer);
        let index = intData.length;
        while (index-- && intData[index] === 0 && index > 0) { }
        websocket.send(intData.slice(0, index + 1));
    }

    function parseResponse(response) {
        var message = "";
        console.log("response", response)
        for (var i = 0; i < response.elements.length; i++){
            message += response.type == "final" ?  response.elements[i].value : `${response.elements[i].value} `;
        }
        return message;
    }

    function resetDisplay() {
        setTableContent([]) 
    }

  return (
    <div className="App">
        <p>Rev.ai Browser Streaming Example</p>
        <button id="streamButton" onClick={recordBtnText === "Record" ? doStream : endStream}>{recordBtnText}</button>
        <p id="status">{statusText}</p> 

          {tableContent.map((txt, idx) => (
            <p key={idx}>{txt}</p>
            ))}
    </div> 
  )
}

export default App
