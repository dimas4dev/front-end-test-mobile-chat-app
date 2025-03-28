import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from '@/app/Audio';
import * as FileSystem from 'expo-file-system';
import { lightFeedback, mediumFeedback, errorFeedback, heavyFeedback } from '@/utils';

interface VoiceRecordButtonProps {
  readonly onRecordingComplete: (voiceUri: string, duration: number) => void;
}

export function VoiceRecordButton({ onRecordingComplete }: VoiceRecordButtonProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
      if (recordingInterval) {
        clearInterval(recordingInterval);
      }
    };
  }, [recording, recordingInterval]);

  const startRecording = async () => {
    try {
      mediumFeedback(); // Retroalimentación háptica al iniciar la grabación

      // Request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        errorFeedback(); // Retroalimentación háptica si se deniega el permiso
        Alert.alert('Permission required', 'Please grant microphone access to record voice messages.');
        return;
      }

      // Configure audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setStartTime(Date.now());

      // Proporcionar retroalimentación háptica cada 5 segundos durante la grabación
      const interval = setInterval(() => {
        lightFeedback();
      }, 5000);
      setRecordingInterval(interval);

    } catch (error) {
      errorFeedback(); // Retroalimentación háptica si hay error
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    if (!recording || !startTime) return;

    try {
      heavyFeedback(); // Retroalimentación háptica más fuerte al detener la grabación

      // Limpiamos el intervalo de retroalimentación
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }

      await recording.stopAndUnloadAsync();
      const duration = Math.round((Date.now() - startTime) / 1000); // Duration in seconds

      const uri = recording.getURI();
      if (!uri) {
        throw new Error('Recording URI is null');
      }

      // Move the recording to a permanent location
      const fileName = `voice_${Date.now()}.m4a`;
      const destinationUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: destinationUri,
      });

      onRecordingComplete(destinationUri, duration);
    } catch (error) {
      errorFeedback(); // Retroalimentación háptica si hay error
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to save recording. Please try again.');
    } finally {
      setRecording(null);
      setIsRecording(false);
      setStartTime(null);
    }
  };

  const handlePress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={styles.button}>
      <MaterialIcons
        name={isRecording ? "stop" : "mic"}
        size={24}
        color={isRecording ? "#FF3B30" : "#007AFF"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 