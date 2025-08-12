import { Audio } from 'expo-av';

const sources = {
  place: require('../../assets/sounds/place.wav'),
  commit: require('../../assets/sounds/commit.wav'),
  roundstart: require('../../assets/sounds/roundstart.wav'),
};

const defaultVolumes = {
  place: 0.5,
  commit: 1.0,
  roundstart: 1.0,
};

const sounds = {};
let initialized = false;

export async function initSfx() {
  if (initialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false,
    });

    for (const [key, src] of Object.entries(sources)) {
      const sound = new Audio.Sound();
      await sound.loadAsync(src, { shouldPlay: false });
      const vol = defaultVolumes[key] ?? 1.0;
      try { await sound.setVolumeAsync(vol); } catch {}
      sounds[key] = sound;
    }

    // Warm-up: kick the engine once so first play is instant
    try {
      const s = sounds.place;
      if (s) {
        const prevVol = defaultVolumes.place ?? 1.0;
        await s.setVolumeAsync(0);
        await s.replayAsync();
        await s.stopAsync();
        await s.setVolumeAsync(prevVol);
      }
    } catch {}

    initialized = true;
  } catch (e) {
    // no-op on failure
  }
}

export function play(name) {
  try {
    const s = sounds[name];
    if (!s) return;
    s.replayAsync();
  } catch {}
}

export async function unloadSfx() {
  for (const s of Object.values(sounds)) {
    try { await s.unloadAsync(); } catch {}
  }
} 