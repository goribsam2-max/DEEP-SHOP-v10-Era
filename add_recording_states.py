import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

states_code = """
  // Voice Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
"""

if 'const [isRecording' not in content:
    content = content.replace('const messagesEndRef = useRef<HTMLDivElement>(null);', 'const messagesEndRef = useRef<HTMLDivElement>(null);\n' + states_code)
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Injected Voice Recording states")
else:
    print("Already exists")
