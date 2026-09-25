import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

funcs_code = """
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64AudioMessage = reader.result as string;
          setRecordedAudioUrl(base64AudioMessage);
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Error accessing microphone", err);
      notify("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
      // Don't save
      audioChunksRef.current = [];
      setRecordedAudioUrl(null);
    }
  };
"""

match = re.search(r'(\s*if \(!user\) \{)', content)
if match:
    new_content = content[:match.start()] + funcs_code + content[match.start():]
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(new_content)
    print("Injected Voice Recording functions")
