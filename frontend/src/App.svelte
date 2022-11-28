<script>
  import axios from "axios";
  import {onMount} from "svelte";

  const apiHost = "http://localhost:9090"
  var allowFiles = "ALLOW_FILES"

  let recording = false;
  let audioAvailable = false;
  let transcriptionResultText = false;
  let copied = false;
  let processing = false;
  let fileName = false;
  let errorMessage = "false";
  let microphone = false;
  
  let generateSubtitles = false;
  let subtitlesUrl = "#";
  let translate = false;
  
  let recordedChunks = [];
  let mediaRecorder

  // When app is mounted, it runs the init() function
  onMount(() => {
    init();

    if(allowFiles != "false") {
      allowFiles = "true"
    }
  });

  function handleFileUpload () {
      if(allowFiles == "true"){
        var fileInput = document.getElementById('fileSelect'); 
        fileName = fileInput.files.item(0).name;
        audioAvailable = true;
      }
  };

  function renderError(message) {
    errorMessage = message
    setTimeout(() => {
        errorMessage = "false";
      }, 8000);    
  }

  // Handle data blobs when available from mediaRecorder.
  function handleDataAvailable(event) {
    console.log('handleDataAvailable', event);
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  }

  // Handles the start button. Sets up and starts mediaRecorder
  function handleStart() {
    console.log("Started recording...");
    audioAvailable = false;
    fileName = false;
    recordedChunks = [];
    let options = {mimeType: 'audio/webm;'};
    recording = true;
    try {
      mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e) {
      renderError(`Exception while creating MediaRecorder: ${e}`)
      return;
    }

    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

    mediaRecorder.onstop = (event) => {
      console.log('Recorder stopped: ', event);
      console.log('Recorded Blobs: ', recordedChunks);
    };

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();

    console.log('MediaRecorder started', mediaRecorder);
  }

  // Makes the requests to the backend with the received audio file.
  async function handleTranscribe() {
    processing = true;
    let audiofile;
    
    if(fileName != false) {

      var fileInput = document.getElementById('fileSelect'); 
      audiofile = fileInput.files[0];

    } else{ // Is an audio recording

      console.log("Processing audio")
      var blob = new Blob(recordedChunks, { type : 'audio/webm;' });

      var url = URL.createObjectURL(blob);
      audiofile = new File([blob], "audio.webm", { type : 'audio/webm;' });

    }
    const formData = new FormData();
    let language = document.getElementById("lang").value;


    formData.append("file", audiofile);
    formData.append("lang", language);
    formData.append("translate", translate);
    formData.append("subs", String(generateSubtitles));
    
    try {
      const response = await axios({
        method: 'post',
        url: `/transcribe`,
        data: formData,
        headers: {
          'Content-Type': `mutlipart/form-data;`,
          "Access-Control-Allow-Origin": `${apiHost}`
        },
      });
      processing = false
      transcriptionResultText = response.data.result;
      if(generateSubtitles) subtitlesUrl = `/getsubs?id=${response.data.id}`;
      audioAvailable = false

    } catch(error) {
      console.log(JSON.parse(error.request.response))
      renderError(JSON.parse(error.request.response).message)
      processing = false
    }
  }

  // Handles the Copy text button behaviour
  function handleCopyText() {
    // Get the text field
    var copyText = document.getElementById("textbox");
    //copyText.select();
    //copyText.setSelectionRange(0, 99999); // For mobile devices
    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.innerHTML);
    // Alert the copied text
    copied = true;

    setTimeout(() => {
      copied = false;
    }, 2300);
  }

  // Handles the stop button to stop the recording.
  async function handleStop() {
    mediaRecorder.stop();
    console.log("Stopped");
    recording = false;
    audioAvailable = true;
  }

  // Asks for microphone permission to the user
  function askMicrophonePermission() {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
      window.stream = stream;
      microphone = true;
    }).catch(function(err) {
      errorMessage = `No microphone available. Recording will not work! ${err}`
    });;
  }
  async function init() {
    try {
      askMicrophonePermission()
    } catch (e) {
      errorMessage = `No microphone available. Recording will not work! ${e}`
      console.error('navigator.getUserMedia error:', e);
    }
  }
</script>

<main class="bg-gray-800 h-fit min-h-screen flex flex-col items-center justify-center py-8">
  <div class="flex flex-row flex-wrap justify-center align-middle">
    <img class="w-16 h-16" src="/logo.webp" alt="">
    <a href="https://codeberg.org/pluja/web-whisper">
      <p class="text-5xl text-slate-300 font-bold text-center mt-2 ml-4">Web Whisper</p>
    </a>
  </div>
  <p class="text-md font-bold text-slate-300 text-center mt-2">🎶 Convert any audio to text 📝</p>

  { #if errorMessage != "false" }
  <div class="text-center max-w-md space-x-2 bg-red-500 rounded-xl p-4 mt-8">
    <p class="font-bold text-white">{errorMessage}</p>
  </div>
  {/if}
  
  <div class="flex flex-col max-w-md items-center space-x-2 bg-slate-100 rounded-xl p-6 m-16 w-4/5">
    <div class="text-center justify-center">
      {#if recording == false}
      <button on:click={handleStart} id="start" class="bg-blue-500 text-white hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
        { #if audioAvailable }
        <span>Record again</span>
        {:else}
        <span>Record</span>
        {/if}
      </button>

      <!-- component -->
      {#if allowFiles == "true"}
      <label class="bg-blue-500 text-white hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center cursor-pointer">
          <svg class="w-6 h-6 mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
          </svg>
          <span>File</span>
          <input accept="audio/*, video/*" id="fileSelect" on:change={handleFileUpload} type='file' class="hidden" />
      </label>
      {/if}
      {/if}

      { #if recording }
      <button on:click={handleStop} id="stop" class="bg-red-500 text-white hover:bg-red-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
        </svg>        
        <span>Stop</span>
      </button>
      {/if}

      { #if audioAvailable }
      <div class="justify-center mt-6">
          {#if fileName}
            <p class="font-bold text-gray-400">
              {fileName}
            </p>
          {/if}
          <div class="mb-2 xl:w-fulll">
            <label for="lang">Audio language</label>
            <select required id="lang" class="form-select appearance-none
              block
              w-full
              px-6
              py-1.5
              text-sm
              font-normal
              text-gray-700
              bg-white bg-clip-padding bg-no-repeat
              border border-solid border-gray-300
              rounded
              transition
              ease-in-out
              m-0
              focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none" aria-label="Default select example">
                <option value="en" selected>Default (en)</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="es">Spanish</option>
                <option value="ca">Catalan</option>
                <option value="et">Estonian</option>
                <option value="cs">Czech</option>
                <option value="nl">Dutch</option>
                <option value="no">Norweigan</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="zh">Chinese</option>
            </select>
        </div>
      </div>

      <div class="flex justify-left">
        <div>
          <div>
            <input id="generateSubtitles" bind:checked={generateSubtitles}  class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox">
            <label class="inline-block text-gray-800" for="generateSubtitles">
              Generate subtitles file
            </label>
          </div>
          <div>
            <input  id="translate" bind:checked={translate}  class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox">
            <label class="inline-block text-gray-800" for="translate">
              Translate
            </label>
          </div>
        </div>
      </div>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
        {#if processing == false}
        <a on:click={handleTranscribe} id="download" class="bg-blue-500 cursor-pointer text-white text-center hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>        
          <span>Transcribe</span>
        </a>
        {:else}
        <button type="button" class="pointer-none inline-flex items-center px-4 py-2 border border-transparent text-base leading-6 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:border-gray-700 focus:shadow-outline-gray active:bg-gray-700 transition ease-in-out duration-150 cursor-not-allowed" disabled="">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing
        </button>
        {/if}
      {/if}
    </div>
    
    <!--<div class="flex flex-row mt-7 pt-2">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>      
      <span class="font-bold text-center text-md">Choose a file.</span>
    </div>


    <input type="file" 
    class="file:bg-gradient-to-b file:from-blue-500 file:to-blue-600
      file:px-6 file:py-3 file:m-5
      file:border-none
      file:rounded-full
      file:text-white
      file:cursor-pointer
      file:shadow-lg file:shadow-blue-600/50
      font-bold" accept="audio/*" capture id="recorder" />
    <audio id="player" type="audio/webm" controls></audio>-->
  </div>


  {#if transcriptionResultText}
    <div id="transcriptionResultTextBox" class="max-w-md items-center space-x-2 bg-slate-100 rounded-xl m-2 p-4 w-4/5">
      <div class="p-2">
          <div class="flex flex-col">
            <div class="flex flex-row justify-between">
              { #if generateSubtitles }
                {#if subtitlesUrl != "#"}
                  <a href={subtitlesUrl} id="stop" class=" bg-blue-500 text-white hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
                    </svg>                       
                    <span>Subtitles</span>
                  </a>
                {/if}
              {/if}
              {#if copied == false }
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={handleCopyText} class="bg-gray-500 text-white hover:bg-gray-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <span class="sr-only">Copy text</span>
                </a>
              {:else}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-missing-attribute -->
                <a on:click={handleCopyText} class="bg-green-400 text-white cursor-none font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
                  </svg>   
                  <span class="sr-only">Copied</span>
                </a>           
              {/if}
            </div>
          </div>
          <div class="text-justify font-mono">
            <p id="textbox" type="text" disabled class="font-large text-gray-700 mb-3 font-bold p-4 rounded-xl border-none bg-slate-100">{transcriptionResultText}</p>
          </div>
      </div>
  </div>
  {/if}

  <div class="m-8">
    <p class="text-md font-bold text-slate-300 text-center">🌱 by <a class="text-blue-400" href="https://codeberg.org/pluja">Pluja</a></p>
  </div>
</main>