import React, { useState } from 'react';
import { useTelegram } from '@/shared/telegram';
import { Button, Card } from '@/shared/ui';
import { ParticipantRole } from '@/entities/game';
import { ROLE_SELECTOR_OPTIONS } from '../../model/constants';

interface RoleSelectorProps {
  onSelect: (role: ParticipantRole) => void;
  onJoin: () => void;
  isLoading: boolean;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  onSelect,
  onJoin,
  isLoading,
}) => {
  const { theme } = useTelegram();
  const [selectedRole, setSelectedRole] = useState<ParticipantRole | null>(null);

  const handleSelect = (role: ParticipantRole) => {
    setSelectedRole(role);
    onSelect(role);
  };

  return (
    <Card style={{ marginBottom: '16px' }}>
      <p
        style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: 600,
          marginBottom: '12px',
        }}
      >
        Select your role:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {ROLE_SELECTOR_OPTIONS.map((role) => (
          <button
            key={role.value}
            onClick={() => handleSelect(role.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid',
              borderColor: selectedRole === role.value ? theme.buttonColor : theme.secondaryBgColor,
              backgroundColor:
                selectedRole === role.value
                  ? `${theme.buttonColor}20`
                  : theme.secondaryBgColor,
              color: theme.textColor,
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '15px',
              fontWeight: selectedRole === role.value ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {role.icon} {role.label}
          </button>
        ))}
      </div>
      {selectedRole && (
        <Button
          onClick={onJoin}
          loading={isLoading}
          className="w-full mt-3"
        >
          Join as {selectedRole}
        </Button>
      )}
    </Card>
  );
};
