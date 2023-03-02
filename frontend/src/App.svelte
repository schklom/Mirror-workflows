<script>
  import axios from "axios";
  import {onMount} from "svelte";

  // Development variable. Add http://localhost:9090 if developing.
  var apiHost = "";
  
  var allowFiles = "ALLOW_FILES";
  var canRunApi = "RUN_AS_API";

  let runAsApi = canRunApi;
  let canRunLocally=true;
  let recording = false;
  let audioAvailable = false;
  let transcriptionResultText = false;
  let copied = false;
  let processing = false;
  let fileName = false;
  let errorMessage = "false";
  let microphone = false;
  let videoUrl = "";
  
  let generateSubtitles = false;
  let subtitlesUrl = "#";
  let translate = false;
  let speedUp = false;
  let language = "auto";
  
  let recordedChunks = [];
  let mediaRecorder;
  let history = [];

  // references to DOM elements
  let fileSelectInput;

  // When app is mounted, it runs the init() function
  onMount(async () => {
    if(canRunApi) {
      try {
        const response = await axios({
          method: 'get',
          url: `${apiHost}/history`,
          headers: {
            'Content-Type': `application/json`,
            "Access-Control-Allow-Origin": `${apiHost}`
          }       
        });
        if (response.data.files) {
          history = response.data.files
        }
      } catch (e) {
        console.log("INFO: Ignore the errors, local backend has been disabled!")
        canRunLocally=false
      }
    }

    if(allowFiles != "false" && canRunLocally) {
      allowFiles = "true"
      const response = await axios({
        method: 'get',
        url: `${apiHost}/history`,
        headers: {
          'Content-Type': `application/json`,
          "Access-Control-Allow-Origin": `${apiHost}`
        }       
      });

      if (response.data.files) {
        history = response.data.files
      }
    }
  });

  async function updateHistory() {
    if(allowFiles != "false" && canRunLocally) {
      try {
        const response = await axios({
          method: 'get',
          url: `${apiHost}/history`,
          headers: {
            'Content-Type': `application/json`,
            "Access-Control-Allow-Origin": `${apiHost}`
          }       
        });
  
        if (response.data.files) {
          history = response.data.files
        }
      } catch (e) {
        console.log(e)
      }
    }
  }

  function _(el) {
    return document.getElementById(el);
  }

  function handleFileUpload () {
    if(allowFiles == "true" && fileSelectInput){
      fileName = fileSelectInput.files.item(0).name;
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
  async function handleStart() {
    try {
      await askMicrophonePermission()
    } catch (e) {
      errorMessage = `No microphone available. Recording will not work! ${e}`
      console.error('navigator.getUserMedia error:', e);
      return;
    }

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

  async function handleVideoUrl() {
    processing = true;
    console.log(videoUrl)
    const formData = new FormData();
    formData.append("videoUrl", videoUrl);
    formData.append("lang", language);
    formData.append("translate", translate.toString());
    formData.append("speedUp", speedUp.toString());
    formData.append("subs", String(generateSubtitles));

    try {
      const response = await axios({
        method: 'post',
        url: `${apiHost}/video/transcribe`,
        data: formData,
        headers: {
          'Content-Type': `mutlipart/form-data;`,
          "Access-Control-Allow-Origin": `${apiHost}`
        }       
      });
      processing = false
      transcriptionResultText = response.data.result;
      if(generateSubtitles) subtitlesUrl = `/getsubs?id=${response.data.id}`;
      audioAvailable = false

    } catch(error) {
      console.log(error)
      renderError(JSON.parse(error.request.response).message)
      processing = false
    }
  }

  // Makes the requests to the backend with the received audio file.
  async function handleTranscribe() {
    processing = true;
    let audiofile;
    
    if(fileName != false) {

      audiofile = fileSelectInput.files[0];

    } else{ // Is an audio recording

      console.log("Processing audio")
      var blob = new Blob(recordedChunks, { type : 'audio/webm;' });

      var url = URL.createObjectURL(blob);
      audiofile = new File([blob], "audio.webm", { type : 'audio/webm;' });

    }
    const formData = new FormData();

    formData.append("file", audiofile);
    
    if (runAsApi == false && canRunLocally == true) {
      formData.append("lang", language);
      formData.append("translate", translate.toString());
      formData.append("speedUp", speedUp.toString());
      formData.append("subs", String(generateSubtitles));
      try {
        const response = await axios({
          method: 'post',
          url: `${apiHost}/transcribe`,
          data: formData,
          headers: {
            'Content-Type': `mutlipart/form-data;`,
            "Access-Control-Allow-Origin": `${apiHost}`
          }       
        });
        processing = false
        transcriptionResultText = response.data.result;
        if(generateSubtitles) subtitlesUrl = `/getsubs?id=${response.data.id}`;
        audioAvailable = false
      } catch(error) {
        console.log(error)
        renderError(JSON.parse(error.request.response).message)
        processing = false
      }
      await updateHistory()
    } else {
      formData.append("model", "whisper-1")
      try {
        const response = await axios({
          method: 'post',
          url: `${apiHost}/api/whisper`,
          data: formData,
          headers: {
            'Content-Type': `mutlipart/form-data;`,
            "Access-Control-Allow-Origin": `${apiHost}`
          }       
        });
        processing = false
        console.log(response.data)
        transcriptionResultText = response.data.text;
        audioAvailable = false
      } catch(error) {
        console.log(error)
        renderError(JSON.parse(error.request.response).message)
        processing = false
      }
    }
  }

  // Handles the Copy text button behaviour
  async function handleCopyText() {
    if(!transcriptionResultText) return;
    //copyText.select();
    //copyText.setSelectionRange(0, 99999); // For mobile devices
    // Copy the text inside the text field
    await navigator.clipboard.writeText(transcriptionResultText);
    // Alert the copied text
    copied = true;

    setTimeout(() => {
      copied = false;
    }, 2300);
  }

  // Handles the stop button to stop the recording.
  async function handleStop() {
    mediaRecorder.stop();
    window.stream.getTracks().forEach(track => track.stop());
    console.log("Stopped");
    recording = false;
    audioAvailable = true;
  }

  // Asks for microphone permission to the user
  function askMicrophonePermission() {
    return navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
      window.stream = stream;
      microphone = true;
    }).catch(function(err) {
      errorMessage = `No microphone available. Recording will not work! ${err}`
    });
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

  { #if runAsApi == false && canRunLocally == true }
    <div class="mx-auto mt-12 mb-0 max-w-md space-y-4">
      <div class="flex">
        <label for="vidurl" class="sr-only">Video a video URL</label>
        <div class="relative">
          <input
            type="vidurl"
            bind:value={videoUrl}
            on:change={handleFileUpload}
            class="w-full rounded-lg border-gray-200 p-4 pr-12 text-sm shadow-sm"
            placeholder="Enter a video URL"
          />
          <span class="absolute inset-y-0 right-4 inline-flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <path d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5"></path>
            <path d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5"></path>
        </svg>
        </div>
      </div>
    </div>
  {/if}
  
  <div class="max-w-md space-x-2 bg-slate-100 rounded-xl p-6 mx-16 mb-16 mt-6 w-4/5">
    <div class="text-center justify-center">
      { #if canRunLocally == true && canRunApi == true }
      <div class="mb-3 mt-3">
        <div class="relative inline-block w-10 mr-2 align-middle select-none">
            <input type="checkbox" bind:checked={runAsApi} name="toggle" id="Blue" class="checked:bg-blue-500 outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"/>
            <label for="Blue" class="block h-6 overflow-hidden bg-gray-300 rounded-full cursor-pointer">
            </label>
            </div>
            <span class="font-medium text-gray-600">
                {#if runAsApi == true }
                  Running API
                {:else}
                  Running Locally
                {/if}
            </span>
        </div>
      { /if }
      {#if videoUrl == ""}
        {#if recording == false}
          <button on:click={handleStart} id="start" class="bg-blue-600 text-white hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
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
                <input accept="audio/*, video/*" name="fileSelect" id="fileSelect" bind:this={fileSelectInput} on:change={handleFileUpload} on:loadstart={handleFileUpload} type='file' class="hidden" />
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
      {/if}

      { #if audioAvailable == true || videoUrl != "" }
        { #if runAsApi != true }
          <div class="justify-center mt-6">
              {#if fileName}
                <p class="font-bold text-gray-400">
                  {fileName}
                </p>
              {/if}
              <div class="mb-2 xl:w-fulll">
                <label for="lang">Audio language</label>
                <select required bind:value={language} id="lang" class="form-select appearance-none
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
                  focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none">
                  <option value="auto">Auto detect</option>
                  <option value="ca">Catalan</option>
                  <option value="cs">Czech</option>
                  <option value="zh">Chinese</option>
                  <option value="da">Danish</option>
                  <option value="nl">Dutch</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="et">Estonian</option>
                  <option value="fi">Finnish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="he">Hebrew</option>
                  <option value="hu">Hungarian</option>
                  <option value="it">Italian</option>
                  <option value="ja">Japanese</option>
                  <option value="no">Norweigan</option>
                  <option value="pl">Polish</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="sk">Slovak</option>
                  <option value="sv">Swedish</option>
                </select>
            </div>
          </div>

          <div class="flex flex-col text-left font-bold text-sky-600 p-2">
            <div>
              <div class="my-1">
                <input id="generateSubtitles" bind:checked={generateSubtitles}  class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox">
                <label class="flex flex-row align-middle text-gray-800" for="generateSubtitles">
                  <span>
                    Subtitle file
                  </span>
                </label>
              </div>
              <div class="my-1">
                <input  id="translate" bind:checked={translate}  class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox">
                <label class="flex flex-row align-middle text-gray-800" for="translate">
                  <span>
                    Translate
                  </span>
                </label>
              </div>
              <div class="my-1">
                <input id="speedup" bind:checked={speedUp}  class="form-check-input appearance-none h-4 w-4 border border-gray-300 rounded-sm bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer" type="checkbox">
                <label class="flex flex-row align-middle text-gray-800" for="speedup">
                  <span>
                    Audio x2 <a class="text-blue-600 font-bold font-mono" href="https://codeberg.org/pluja/web-whisper/wiki/Features#audio-x2">(i)</a>
                  </span>
                </label>
              </div>
            </div>
          </div>
        {/if}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
          {#if processing == false}
            {#if videoUrl != ""}
            <a on:click={handleVideoUrl} id="download" class="bg-red-500 cursor-pointer text-white text-center hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M3 5m0 4a4 4 0 0 1 4 -4h10a4 4 0 0 1 4 4v6a4 4 0 0 1 -4 4h-10a4 4 0 0 1 -4 -4z"></path>
                <path d="M10 9l5 3l-5 3z"></path>
            </svg>       
              <span>Download & transcribe URL</span>
            </a>
            {:else}
            <a on:click={handleTranscribe} id="download" class="bg-blue-500 cursor-pointer text-white text-center hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>        
              <span>Transcribe file</span>
            </a>
            {/if}
          {:else}
          <button type="button" class="pointer-none inline-flex items-center px-4 py-2 border border-transparent text-base leading-6 font-medium rounded-md text-white bg-gray-600 hover:bg-gray-500 focus:outline-none focus:border-gray-700 focus:shadow-outline-gray active:bg-gray-700 transition ease-in-out duration-150 cursor-not-allowed">
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
            <p id="textbox" class="font-large text-gray-700 mb-3 font-bold p-4 rounded-xl border-none bg-slate-100">{transcriptionResultText}</p>
          </div>
      </div>
    </div>
  {/if}

  { #if history.length > 0 }
  <div>
    <div class="p-2 mt-2 text-center text-white font-bold uppercase">
      <h3 class="text-lg flex flex-row items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 mr-2" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="white" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <polyline points="12 8 12 12 14 14" />
          <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" />
        </svg>
        <span>Transcription History</span>
      </h3>
    </div>

      { #each history as file (file) }
        <div class="p-2 border-2 rounded-lg border-slate-500 m-2 flex flex-row justify-between flex-wrap align-middle items-center">
          <p class="mr-2 text-white font-mono">{file}</p>
          <a href="/getsubs?id={file}" id="stop" class=" bg-slate-500 text-white hover:bg-sky-800 font-bold text-center rounded-lg p-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" />
            </svg>
          </a>
        </div>
      { /each }
    </div>
  { /if }

  <div class="m-8">
    <p class="text-md font-bold text-slate-300 text-center">🌱 by <a class="text-blue-400" href="https://codeberg.org/pluja">Pluja</a></p>
  </div>
</main>