'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '@/styles/theme';
import Toolbar from './Toolbar';
import ConnectionManager from '@/diagram/components/ConnectionManager';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: ${({ theme }) => theme.colors.bg.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  padding: 0 16px;
`;

const TopBarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const BurgerButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.elevated};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const Title = styled.div`
  font-weight: 500;
  font-size: 14px;
`;

const MainTabsContainer = styled.div`
  display: flex;
  height: 100%;
`;

const MainTab = styled.div<{ $active: boolean }>`
  padding: 0 16px;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.secondary)};
  border-bottom: 2px solid ${({ theme, $active }) => ($active ? theme.colors.accent.primary : 'transparent')};

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
`;

const ProfileButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ theme }) => theme.colors.bg.elevated};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.secondary};
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// ============================================================
// COMPONENT
// ============================================================

interface WorkbenchLayoutProps {
  designerContent: React.ReactNode;
  repositoryContent: React.ReactNode;
}

export default function WorkbenchLayout({ designerContent, repositoryContent }: WorkbenchLayoutProps) {
  const [activeMainTab, setActiveMainTab] = useState<'designer' | 'repository'>('designer');
  const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);

  return (
    <LayoutContainer>
      {/* Top Bar (simulating Window Title + Toolbar + Burger Menu + Main Tabs) */}
      <TopBar>
        <TopBarLeft>
          <BurgerButton title="Main Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </BurgerButton>
          <Title>inubit Workbench</Title>
          <MainTabsContainer>
            <MainTab 
              $active={activeMainTab === 'designer'} 
              onClick={() => setActiveMainTab('designer')}
            >
              Designer
            </MainTab>
            <MainTab 
              $active={activeMainTab === 'repository'} 
              onClick={() => setActiveMainTab('repository')}
            >
              Repository
            </MainTab>
          </MainTabsContainer>
        </TopBarLeft>

        <ProfileButton onClick={() => setIsConnectionManagerOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Profiles
        </ProfileButton>
      </TopBar>

      <ContentArea>
        {activeMainTab === 'designer' ? designerContent : repositoryContent}
      </ContentArea>

      {/* Modals */}
      {isConnectionManagerOpen && (
        <ConnectionManager onClose={() => setIsConnectionManagerOpen(false)} />
      )}
    </LayoutContainer>
  );
}
