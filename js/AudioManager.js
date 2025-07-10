// --- Audio Manager ---
const AudioManager = (() => {
    let audioContext = null;
    let musicBuffer = null;
    let sourceNode = null;
    let gainNode = null;
    let isPlaying = false;
    let audioInitialized = false;

    const loadMusic = async (url) => {
        if (!audioContext) return;
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            musicBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error("Error loading audio file:", error);
        }
    };

    const playLoop = () => {
        if (!musicBuffer || !audioContext) return;

        // Stop any existing playback
        if (sourceNode) {
            sourceNode.onended = null;
            sourceNode.stop();
        }

        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = musicBuffer;
        
        // Recreate GainNode to clear previous automation
        gainNode = audioContext.createGain();
        
        sourceNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        const now = audioContext.currentTime;
        const songDuration = 95; // As specified in the prompt
        const fadeInDuration = 5;
        const fadeOutDuration = 15;
        const fadeOutStartTime = songDuration - fadeOutDuration;

        // Fade In
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + fadeInDuration);

        // Fade Out
        gainNode.gain.linearRampToValueAtTime(0, now + songDuration);

        sourceNode.start(now);
        isPlaying = true;

        sourceNode.onended = () => {
            if (isPlaying) { // Loop only if not explicitly stopped
                playLoop();
            }
        };
    };

    return {
        async init() {
            if (audioInitialized) return;
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            // Resume context if it was suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            await loadMusic('/yjltg-robo.ogg');
            audioInitialized = true;
        },
        isInitialized() {
            return audioInitialized && audioContext;
        },
        async createSoundBufferFromFrequency(frequency, duration, type = 'sine', gain = 1.0) {
            if (!audioContext) return null;
            const sampleRate = audioContext.sampleRate;
            const frameCount = sampleRate * duration;
            const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
            const data = buffer.getChannelData(0);

            for (let i = 0; i < frameCount; i++) {
                const time = i / sampleRate;
                data[i] = Math.sin(frequency * 2 * Math.PI * time) * gain;
            }
            
            // Quick fade out to prevent clicking
            const fadeOutDuration = 0.05;
            const fadeOutSamples = Math.floor(sampleRate * fadeOutDuration);
            for (let i = 0; i < fadeOutSamples; i++) {
                if (frameCount - 1 - i < 0) break;
                data[frameCount - 1 - i] *= (i / fadeOutSamples);
            }

            return buffer;
        },
        playSoundBuffer(buffer) {
            if (!audioContext || !buffer) return;
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start();
        },
        play() {
            if (!audioInitialized || isPlaying) return;
            if (audioContext && audioContext.state === 'suspended') {
                 audioContext.resume().then(playLoop);
            } else {
                playLoop();
            }
        },
        stop() {
            if (!isPlaying || !sourceNode) return;
            isPlaying = false; // Prevents looping via onended
            sourceNode.stop();
            sourceNode = null;
        }
    };
})();