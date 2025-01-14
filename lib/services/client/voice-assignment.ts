import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { VoiceAssignmentDocument } from '@/lib/types/voice-playback';
import OpenAI from 'openai';
import { AI_MODELS } from '@/lib/constants/ai';

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

type Gender = 'male' | 'female';
type Style = 'professional' | 'casual';

interface VoiceAnalysis {
  gender: Gender;
  style: Style;
}

interface RawAnalysisResponse {
  gender?: string;
  style?: string;
}

class VoiceAssignmentService {
  private readonly COLLECTION = 'voiceAssignments';
  private voicePool = [
    // Female voices
    { id: 'aura-asteria-en', gender: 'female', style: 'casual', accent: 'US' },
    { id: 'aura-luna-en', gender: 'female', style: 'professional', accent: 'US' },
    { id: 'aura-stella-en', gender: 'female', style: 'casual', accent: 'US' },
    { id: 'aura-athena-en', gender: 'female', style: 'professional', accent: 'UK' },
    { id: 'aura-hera-en', gender: 'female', style: 'casual', accent: 'US' },
    
    // Male voices
    { id: 'aura-orion-en', gender: 'male', style: 'professional', accent: 'US' },
    { id: 'aura-arcas-en', gender: 'male', style: 'casual', accent: 'US' },
    { id: 'aura-perseus-en', gender: 'male', style: 'professional', accent: 'US' },
    { id: 'aura-angus-en', gender: 'male', style: 'casual', accent: 'Ireland' },
    { id: 'aura-orpheus-en', gender: 'male', style: 'professional', accent: 'US' },
    { id: 'aura-helios-en', gender: 'male', style: 'casual', accent: 'UK' },
    { id: 'aura-zeus-en', gender: 'male', style: 'professional', accent: 'US' }
  ];

  /**
   * Get all available voice IDs
   * This is the source of truth for available voices in the system
   */
  getAvailableVoices(): string[] {
    return this.voicePool.map(voice => voice.id);
  }

  async getVoiceAssignment(userId: string, spaceId: string): Promise<string> {
    // Always create a new assignment
    return this.assignVoice(userId, spaceId);
  }

  private async analyzeUserMessages(userId: string, spaceId: string): Promise<{ gender: 'male' | 'female', style: 'professional' | 'casual' }> {
    try {
      console.log('🎯 VoiceAssignmentService - Starting analysis for:', { userId, spaceId });

      // Get user data first
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      const username = userData?.username || '';
      const fullName = userData?.fullName || '';
      
      console.log('👤 User data found:', { 
        username, 
        fullName,
        hasUserData: !!userData 
      });

      if (!username && !fullName) {
        console.log('⚠️ No user data available, using random assignment');
        return {
          gender: Math.random() > 0.5 ? 'male' : 'female',
          style: Math.random() > 0.5 ? 'professional' : 'casual'
        };
      }

      console.log('🤖 Sending to GPT for analysis:', {
        username,
        fullName
      });

      const completion = await openai.chat.completions.create({
        model: AI_MODELS.CHAT.GPT4o,
        messages: [
          {
            role: "system",
            content: `Analyze the following user data and determine:
              1. The likely gender of the person (male/female)
              2. Their writing/communication style (professional/casual)
              
              You will be given:
              - Their username
              - Their full name (if available)
              
              Return ONLY a JSON object with these two fields.
              Example: {"gender": "female", "style": "professional"}
              
              For gender detection:
              - If the name is Albert, Gary, William, John, Michael, David, etc. -> ALWAYS assign male
              - If the name is Sarah, Emily, Jessica, Elizabeth, etc. -> ALWAYS assign female
              - For usernames containing 'mr', 'guy', 'boy', 'man', 'dude' -> assign male
              - For usernames containing 'mrs', 'ms', 'girl', 'lady', 'woman' -> assign female
              - For ambiguous names or usernames, default to male
              
              Weight the analysis:
              1. Exact name matches from the lists above (highest priority)
              2. Username gender indicators
              3. Default to male if no clear indicators
              
              Example analyses:
              - Full name "Albert Einstein" -> {"gender": "male", "style": "professional"}
              - Full name "Gary Smith" -> {"gender": "male", "style": "casual"}
              - Username "coolcoder123" -> default male
              
              IMPORTANT: Names like 'Albert', 'Gary', 'William', etc. should ALWAYS be assigned male gender.`
          },
          {
            role: "user",
            content: `Username: ${username}
            Full Name: ${fullName}`
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        console.log('❌ No response from GPT-4');
        throw new Error('No response from GPT-4');
      }

      console.log('✅ GPT Analysis received:', response);

      const rawAnalysis = JSON.parse(response) as RawAnalysisResponse;
      console.log('🎯 Raw analysis:', rawAnalysis);
      
      // Type guard function
      const isValidAnalysis = (data: RawAnalysisResponse): data is VoiceAnalysis => {
        return (
          (data.gender === 'male' || data.gender === 'female') &&
          (data.style === 'professional' || data.style === 'casual')
        );
      };

      if (!isValidAnalysis(rawAnalysis)) {
        console.log('❌ Invalid analysis format:', rawAnalysis);
        throw new Error('Invalid analysis format');
      }

      // Randomize the style since we're not analyzing messages
      return {
        gender: rawAnalysis.gender,
        style: Math.random() > 0.5 ? 'professional' : 'casual'
      };

    } catch (error) {
      console.error('❌ Failed to analyze user:', error);
      // Default to random assignment if analysis fails
      const randomAssignment = {
        gender: Math.random() > 0.5 ? 'male' : 'female',
        style: Math.random() > 0.5 ? 'professional' : 'casual'
      } as const;
      console.log('⚠️ Falling back to random assignment:', randomAssignment);
      return randomAssignment;
    }
  }

  private async assignVoice(userId: string, spaceId: string): Promise<string> {
    // Get current assignments in the space
    const assignmentsQuery = query(
      collection(db, this.COLLECTION),
      where('spaceId', '==', spaceId)
    );
    const assignments = await getDocs(assignmentsQuery);

    // Analyze user's messages and profile
    const analysis = await this.analyzeUserMessages(userId, spaceId);

    // Filter voices by gender and style
    const matchingVoices = this.voicePool.filter(voice => 
      voice.gender === analysis.gender && 
      voice.style === analysis.style
    );

    // Count voice usage
    const voiceUsage = new Map<string, number>();
    assignments.forEach(doc => {
      const { voiceId } = doc.data();
      voiceUsage.set(voiceId, (voiceUsage.get(voiceId) || 0) + 1);
    });

    // Find least used matching voice
    let selectedVoice = matchingVoices[0]?.id;
    let minUsage = Infinity;

    matchingVoices.forEach(voice => {
      const usage = voiceUsage.get(voice.id) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        selectedVoice = voice.id;
      }
    });

    // If no matching voices found, fallback to any voice
    if (!selectedVoice) {
      selectedVoice = this.voicePool[0].id;
    }

    // Create assignment
    const now = Timestamp.now();
    const assignment: VoiceAssignmentDocument = {
      userId,
      voiceId: selectedVoice,
      spaceId,
      createdAt: now,
      updatedAt: now
    };

    await setDoc(
      doc(db, this.COLLECTION, `${spaceId}_${userId}`),
      assignment
    );

    return selectedVoice;
  }

  async getSpaceAssignments(spaceId: string): Promise<Map<string, string>> {
    const assignmentsQuery = query(
      collection(db, this.COLLECTION),
      where('spaceId', '==', spaceId)
    );
    const assignments = await getDocs(assignmentsQuery);

    const voiceMap = new Map<string, string>();
    assignments.forEach(doc => {
      const { userId, voiceId } = doc.data();
      voiceMap.set(userId, voiceId);
    });

    return voiceMap;
  }
}

export const voiceAssignmentService = new VoiceAssignmentService(); 