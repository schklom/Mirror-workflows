<script>
  import axios from "axios";
  import {onMount} from "svelte";
  let started = false
  let audioAvailable = false
  let translation = false

  let recordedBlobs
  let mediaRecorder

  onMount(() => {
    init();
  });


  function renderError(message) {
    const main = document.querySelector('main');
    main.innerHTML = `<div class="error"><p>${message}</p></div>`;
  }

  function handleDataAvailable(event) {
    console.log('handleDataAvailable', event);
    if (event.data && event.data.size > 0) {
      recordedBlobs.push(event.data);
    }
  }

  function handleStart() {
    console.log("Started");
    recordedBlobs = [];
    let options = {mimeType: 'audio/webm;'};
    started = true;
    try {
      mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e) {
      console.error('Exception while creating MediaRecorder:', e);
      return;
    }

    console.log('Created MediaRecorder', mediaRecorder, 'with options', options);

    mediaRecorder.onstop = (event) => {
      console.log('Recorder stopped: ', event);
      console.log('Recorded Blobs: ', recordedBlobs);
    };

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();

    console.log('MediaRecorder started', mediaRecorder);
  }

  async function handleTranscribe() {
    var blob = new Blob(recordedBlobs, {
     type: 'audio/webm'
    });
    var url = URL.createObjectURL(blob);
    const audiofile = new File([blob], "audio.webm", {
        type: "audio/mp3",
    });
    const formData = new FormData();
    formData.append("file", audiofile);
    
    const response = await axios({
      method: 'post',
      url: 'http://localhost:9090/transcribe',
      data: formData,
      headers: {
        'Content-Type': `mutlipart/form-data;`,
      },
    });

    console.log(response.data.result);
    translation = response.data.result;
  }

  async function handleStop() {
    mediaRecorder.stop();
    console.log("Stopped");
    started = false;
    audioAvailable = true;
  }

  function handleDownload() {
    const downloadLink = document.getElementById('download');
    var blob = new Blob(recordedBlobs, {
     type: 'audio/webm'
    });
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = "test.webm";
  }

  async function init() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      window.stream = stream;
    } catch (e) {
      console.error('navigator.getUserMedia error:', e);
    }
  }
</script>

<main class="bg-gray-800 h-screen flex flex-col items-center justify-center">
  <p class="text-5xl text-slate-300 font-bold text-center mt-24">Web Whisper</p>
  <p class="text-md font-bold text-slate-300 text-center mt-2">Powered by Go, Svelte and Whisper.cpp</p>
  
  <div class="flex flex-col max-w-md items-center space-x-2 bg-slate-100 rounded-xl p-8 dark:bg-slate-800 m-16">
    <div class="inline-flex mt-2 mb-1">
      <!-- component -->
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
      <span class="font-bold text-center text-md mt-1">Record an audio.</span>
    </div>
    
    <div class="flex flex-col text-center justify-center">
      {#if started == false}
      <button on:click={handleStart} id="start" class="bg-blue-500 text-white hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
        </svg>
        <span>Start Recording</span>
      </button>
      {/if}

      { #if started }
      <button on:click={handleStop} id="stop" class="bg-red-500 text-white hover:bg-red-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
        </svg>        
        <span>Stop Recording</span>
      </button>
      {/if}

      { #if audioAvailable }
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <a on:click={handleTranscribe} id="download" class="bg-blue-500 cursor-pointer text-white text-center hover:bg-blue-800 font-bold py-2 px-4 my-1.5 rounded inline-flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 mr-2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>        
        <span>Transcribe</span>
      </a>
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


  {#if translation}
    <div id="translationBox" class="flex max-w-md flex-col items-center space-x-2 bg-slate-100 rounded-xl p-8 dark:bg-slate-800">
      <p class="font-bold"> {translation} </p>
    </div>
  {/if}

  <div class="text-center">
    <p class="text-md font-bold text-slate-300 text-center mt-2">With ❤ by Pluja</p>
  </div>
</main>