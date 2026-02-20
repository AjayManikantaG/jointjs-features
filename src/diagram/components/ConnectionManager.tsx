'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContainer = styled.div`
  width: 600px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.bg.elevated};
  
  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
`;

const ModalBody = styled.div`
  display: flex;
  height: 400px;
`;

const ProfilesSidebar = styled.div`
  width: 200px;
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  background: ${({ theme }) => theme.colors.bg.primary};
  display: flex;
  flex-direction: column;
`;

const ProfileList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const ProfileItem = styled.div<{ $active: boolean }>`
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.primary + '33' : 'transparent')};
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.secondary)};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.accent.primary : 'transparent')};

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.accent.primary + '33' : theme.colors.bg.elevated)};
  }
`;

const SidebarFooter = styled.div`
  padding: 8px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  gap: 8px;
`;

const Button = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  
  ${({ theme, $variant }) => {
    if ($variant === 'primary') {
      return `
        background: ${theme.colors.accent.primary};
        border-color: ${theme.colors.accent.primary};
        color: white;
        &:hover { opacity: 0.9; }
      `;
    }
    if ($variant === 'danger') {
      return `
        background: transparent;
        border-color: #FF5C5C;
        color: #FF5C5C;
        &:hover { background: #FF5C5C22; }
      `;
    }
    return `
      background: ${theme.colors.bg.elevated};
      border-color: ${theme.colors.border.default};
      color: ${theme.colors.text.primary};
      &:hover { background: ${theme.colors.bg.secondary}; }
    `;
  }}
`;

const ProfileForm = styled.div`
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${({ theme }) => theme.colors.bg.secondary};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    font-size: 12px;
    color: ${({ theme }) => theme.colors.text.secondary};
  }
  
  input {
    background: ${({ theme }) => theme.colors.bg.primary};
    border: 1px solid ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;
    
    &:focus {
      outline: none;
      border-color: ${({ theme }) => theme.colors.accent.primary};
    }
  }
`;

const ModalFooter = styled.div`
  padding: 16px 20px;
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: ${({ theme }) => theme.colors.bg.elevated};
`;

// ============================================================
// COMPONENT
// ============================================================

export interface LoginProfile {
  id: string;
  name: string;
  serverUrl: string;
  username: string;
  password?: string;
  savePassword?: boolean;
}

export default function ConnectionManager({ onClose }: { onClose: () => void }) {
  const [profiles, setProfiles] = useState<LoginProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  
  // Local edit state
  const [editState, setEditState] = useState<Partial<LoginProfile>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('inubit_profiles');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProfiles(parsed);
        if (parsed.length > 0) {
          setActiveProfileId(parsed[0].id);
        }
      } catch (e) {
        console.error('Failed to parse profiles', e);
      }
    }
  }, []);

  // Sync active profile to edit state
  useEffect(() => {
    if (activeProfileId) {
      const profile = profiles.find(p => p.id === activeProfileId);
      if (profile) setEditState(profile);
    } else {
      setEditState({});
    }
  }, [activeProfileId, profiles]);

  const handleCreate = () => {
    const newProfile: LoginProfile = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Connection',
      serverUrl: 'localhost:8080',
      username: 'admin',
    };
    const newProfiles = [...profiles, newProfile];
    setProfiles(newProfiles);
    setActiveProfileId(newProfile.id);
    saveToStorage(newProfiles);
  };

  const handleDelete = () => {
    if (!activeProfileId) return;
    const newProfiles = profiles.filter(p => p.id !== activeProfileId);
    setProfiles(newProfiles);
    setActiveProfileId(newProfiles.length > 0 ? newProfiles[0].id : null);
    saveToStorage(newProfiles);
  };

  const handleUpdateField = (field: keyof LoginProfile, value: unknown) => {
    setEditState(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!activeProfileId) return;
    const newProfiles = profiles.map(p => 
      p.id === activeProfileId ? { ...p, ...editState } as LoginProfile : p
    );
    setProfiles(newProfiles);
    saveToStorage(newProfiles);
    onClose();
  };

  const saveToStorage = (data: LoginProfile[]) => {
    localStorage.setItem('inubit_profiles', JSON.stringify(data));
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContainer onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h2>Connection Profiles</h2>
          <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={onClose}>✕</button>
        </ModalHeader>

        <ModalBody>
          <ProfilesSidebar>
            <ProfileList>
              {profiles.length === 0 && (
                <div style={{ padding: '12px', color: '#888', fontSize: '12px', textAlign: 'center' }}>
                  No profiles yet
                </div>
              )}
              {profiles.map(p => (
                <ProfileItem 
                  key={p.id} 
                  $active={p.id === activeProfileId}
                  onClick={() => setActiveProfileId(p.id)}
                >
                  {p.name}
                </ProfileItem>
              ))}
            </ProfileList>
            <SidebarFooter>
              <Button onClick={handleCreate}>+ New</Button>
              <Button $variant="danger" onClick={handleDelete} disabled={!activeProfileId}>Delete</Button>
            </SidebarFooter>
          </ProfilesSidebar>

          <ProfileForm>
            {activeProfileId ? (
              <>
                <FormGroup>
                  <label>Profile Name</label>
                  <input 
                    value={editState.name || ''} 
                    onChange={e => handleUpdateField('name', e.target.value)} 
                    placeholder="e.g. Production Server"
                  />
                </FormGroup>
                <FormGroup>
                  <label>Server URL</label>
                  <input 
                    value={editState.serverUrl || ''} 
                    onChange={e => handleUpdateField('serverUrl', e.target.value)} 
                    placeholder="localhost:8080"
                  />
                </FormGroup>
                <FormGroup>
                  <label>Username</label>
                  <input 
                    value={editState.username || ''} 
                    onChange={e => handleUpdateField('username', e.target.value)} 
                  />
                </FormGroup>
                <FormGroup>
                  <label>Password</label>
                  <input 
                    type="password"
                    value={editState.password || ''} 
                    onChange={e => handleUpdateField('password', e.target.value)} 
                  />
                </FormGroup>
                <FormGroup style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={editState.savePassword || false}
                    onChange={e => handleUpdateField('savePassword', e.target.checked)}
                    id="savePwd"
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="savePwd" style={{ cursor: 'pointer' }}>Save password</label>
                </FormGroup>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
                Select or create a profile
              </div>
            )}
          </ProfileForm>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button $variant="primary" onClick={handleSave} disabled={!activeProfileId}>Connect & Save</Button>
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
  );
}
