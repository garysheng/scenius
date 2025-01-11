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
    const docRef = doc(db, this.COLLECTION, `${spaceId}_${userId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().voiceId;
    }

    // If no assignment exists, create one
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

      // First get all channels in the space
      const channelsRef = collection(db, 'spaces', spaceId, 'channels');
      const channelsSnapshot = await getDocs(channelsRef);
      console.log('📚 Found channels:', { count: channelsSnapshot.size });
      
      // Get messages from all channels
      let allMessages: string[] = [];
      const messagesByChannel: Record<string, number> = {};

      await Promise.all(channelsSnapshot.docs.map(async (channelDoc) => {
        const channelId = channelDoc.id;
        console.log(`🔍 Searching messages in channel: ${channelId}`);
        
        const messagesRef = collection(db, 'spaces', spaceId, 'channels', channelId, 'messages');
        const messagesQuery = query(messagesRef, where('userId', '==', userId));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        const channelMessages = messagesSnapshot.docs.map(doc => doc.data().content);
        messagesByChannel[channelId] = channelMessages.length;
        allMessages = allMessages.concat(channelMessages);
        
        console.log(`📝 Channel ${channelId}:`, { 
          messagesFound: channelMessages.length,
          firstMessage: channelMessages[0]?.slice(0, 50) 
        });
      }));
      
      console.log('📊 Message distribution:', messagesByChannel);
      console.log('📝 Total messages found:', allMessages.length);
      
      const messages = allMessages.join('\n');

      if (!messages && !username && !fullName) {
        console.log('⚠️ No data available for analysis, using random assignment');
        return {
          gender: Math.random() > 0.5 ? 'male' : 'female',
          style: Math.random() > 0.5 ? 'professional' : 'casual'
        };
      }

      console.log('🤖 Sending to GPT for analysis:', {
        hasMessages: !!messages,
        messageLength: messages.length,
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
              - Their messages (if available)
              
              Return ONLY a JSON object with these two fields.
              Example: {"gender": "female", "style": "professional"}
              
              For gender detection:
              - Common male names: John, Michael, David, Albert, Gary, William, etc.
              - Common female names: Sarah, Emily, Jessica, Elizabeth, etc.
              - If the name is clearly male (like Albert Einstein, Gary Smith), assign male
              - If the name is clearly female (like Sarah Johnson), assign female
              - For ambiguous names or usernames, use message content if available
              - Only default to random if absolutely no clear indicators
              
              Weight the analysis:
              1. Messages content (highest weight if available)
              2. Full name (medium weight if available)
              3. Username (lowest weight)
              
              Example analyses:
              - Full name "Albert Einstein", no messages -> {"gender": "male", "style": "professional"}
              - Full name "Gary Smith", casual messages -> {"gender": "male", "style": "casual"}
              - Username "coolcoder123", no name, professional messages -> base gender on message content
              
              If data is conflicting, prioritize the higher weighted sources.
              
              IMPORTANT: For names like 'Albert Einstein' or 'Gary', ALWAYS assign male gender unless there is VERY strong evidence otherwise from message content.`
          },
          {
            role: "user",
            content: `Username: ${username}
            Full Name: ${fullName}
            Messages:
            ${messages}`
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

      return rawAnalysis;
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