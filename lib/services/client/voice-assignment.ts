import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { VoiceAssignmentDocument } from '@/lib/types/voice-playback';

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

  async getVoiceAssignment(userId: string, spaceId: string): Promise<string> {
    const docRef = doc(db, this.COLLECTION, `${spaceId}_${userId}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().voiceId;
    }

    // If no assignment exists, create one
    return this.assignVoice(userId, spaceId);
  }

  private async assignVoice(userId: string, spaceId: string): Promise<string> {
    // Get current assignments in the space
    const assignmentsQuery = query(
      collection(db, this.COLLECTION),
      where('spaceId', '==', spaceId)
    );
    const assignments = await getDocs(assignmentsQuery);

    // Count voice usage
    const voiceUsage = new Map<string, number>();
    assignments.forEach(doc => {
      const { voiceId } = doc.data();
      voiceUsage.set(voiceId, (voiceUsage.get(voiceId) || 0) + 1);
    });

    // Find least used voice
    let selectedVoice = this.voicePool[0].id;
    let minUsage = Infinity;

    this.voicePool.forEach(voice => {
      const usage = voiceUsage.get(voice.id) || 0;
      if (usage < minUsage) {
        minUsage = usage;
        selectedVoice = voice.id;
      }
    });

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