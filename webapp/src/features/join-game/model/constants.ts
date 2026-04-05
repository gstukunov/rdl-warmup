import { ParticipantRole } from '@/entities/game';

// Role selector options configuration
export const ROLE_SELECTOR_OPTIONS: {
  value: ParticipantRole;
  label: string;
  icon: string;
}[] = [
  { value: ParticipantRole.PLAYER, label: 'Player', icon: '🎤' },
  { value: ParticipantRole.JUDGE, label: 'Judge', icon: '⚖️' },
  { value: ParticipantRole.WING, label: 'Wing', icon: '🪶' },
];

// Button style constants
export const ROLE_BUTTON_STYLES = {
  padding: '12px 16px',
  borderRadius: '8px',
  borderWidth: '2px',
  fontSize: '15px',
  selectedOpacity: '20',
};
