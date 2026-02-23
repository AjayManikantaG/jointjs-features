'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ConnectionManager from '@/diagram/components/ConnectionManager';
import { useDiagram } from '@/diagram/context/DiagramProvider';

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
  font-family: ${({ theme }) => theme.typography.fontFamily};
`;

// ---------- TOP NAV BAR ----------

const TopNavBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  padding: 0 16px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  z-index: 50;
`;

const TopNavLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 16px;
  color: #333;
  letter-spacing: 0.5px;
`;

const LogoHighlight = styled.span`
  color: #D3A33A; /* Matches the golden accent from wireframe */
`;

const PathBreadcrumb = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.text.secondary};
  margin-left: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TopNavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const NavIconBtn = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  
  &:hover {
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

const ProfileBtn = styled(NavIconBtn)`
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  padding-right: 16px;
`;

// ---------- MAIN WRAPPER ----------

const MainWrapper = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

// ---------- PRIMARY LEFT NAV ----------

const PrimaryNav = styled.div`
  width: 64px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
  padding-top: 8px;
  z-index: 40;
`;

const NavItem = styled.div<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.secondary : 'transparent')};
  border-left: 3px solid ${({ theme, $active }) => ($active ? theme.colors.accent.primary : 'transparent')};
  
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? '600' : '400')};

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.bg.secondary : 'rgba(0,0,0,0.02)')};
  }
  
  svg {
    width: 20px;
    height: 20px;
    opacity: ${({ $active }) => ($active ? 1 : 0.7)};
  }
`;

// ---------- LEFT SIDEBAR (REPOSITORY) ----------

const LeftSidebar = styled.div`
  width: 280px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
  z-index: 30;
`;

const SidebarHeader = styled.div`
  padding: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  gap: 8px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 6px 10px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  
  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SidebarContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  font-size: 13px;
`;

const TreeItem = styled.div<{ $depth: number; $active?: boolean; $isFolder?: boolean }>`
  padding: 4px 8px;
  padding-left: ${({ $depth }) => $depth * 16 + 8}px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 4px;
  color: ${({ theme, $active }) => ($active ? theme.colors.accent.primary : theme.colors.text.primary)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.primary + '11' : 'transparent')};

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.accent.primary + '11' : 'rgba(0,0,0,0.03)')};
  }
  
  svg {
    width: 14px;
    height: 14px;
    color: ${({ theme, $isFolder }) => ($isFolder ? theme.colors.accent.warning || '#F5A623' : theme.colors.text.secondary)};
  }
`;

// ---------- CENTER WORKING AREA ----------

const CenterArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: ${({ theme }) => theme.colors.bg.canvas};
`;

const TabsBar = styled.div`
  height: 48px;
  background: ${({ theme }) => theme.colors.bg.secondary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  padding-left: 0;
`;

const TabsList = styled.div`
  display: flex;
  height: 100%;
`;

const TabItem = styled.div<{ $active?: boolean }>`
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  background: ${({ theme, $active }) => ($active ? theme.colors.bg.canvas : 'transparent')};
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme, $active }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  border-top: 3px solid ${({ theme, $active }) => ($active ? theme.colors.accent.secondary : 'transparent')};

  &:hover {
    background: ${({ theme, $active }) => ($active ? theme.colors.bg.canvas : 'rgba(0,0,0,0.02)')};
  }
`;

const CommentBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
  
  &:hover {
    background: rgba(0,0,0,0.02);
  }
`;

const CanvasWrapper = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
`;

// ---------- BOTTOM STATUS BAR ----------

const StatusBar = styled.div`
  height: 32px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-top: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text.secondary};
  z-index: 10;
`;

const StatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;


// ============================================================
// COMPONENT
// ============================================================

interface WorkbenchLayoutProps {
  designerContent: React.ReactNode;
  repositoryContent: React.ReactNode;
  minimapContent?: React.ReactNode;
}

export default function WorkbenchLayout({ designerContent, repositoryContent, minimapContent }: WorkbenchLayoutProps) {
  const [activeMainTab, setActiveMainTab] = useState<'designer' | 'editor' | 'repository' | 'monitoring' | 'logfiles' | 'admin'>('editor');
  const [isConnectionManagerOpen, setIsConnectionManagerOpen] = useState(false);

  return (
    <LayoutContainer>
      <TopNavBar>
        <TopNavLeft>
          <LogoContainer>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D3A33A" strokeWidth="2">
              <path d="M12 2L2 22h20L12 2z" />
            </svg>
            <span><LogoHighlight>JointJS</LogoHighlight> POC</span>
          </LogoContainer>
          <PathBreadcrumb>
            Flow 02 &gt; <b>Flow 01</b>
          </PathBreadcrumb>
        </TopNavLeft>

        <TopNavRight>
          <NavIconBtn>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            Stand-in
          </NavIconBtn>
          <ProfileBtn onClick={() => setIsConnectionManagerOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            User name (Admin)
          </ProfileBtn>
          <NavIconBtn>
            EN
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </NavIconBtn>
          <NavIconBtn><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></NavIconBtn>
          <NavIconBtn><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></NavIconBtn>
          <NavIconBtn><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg></NavIconBtn>
        </TopNavRight>
      </TopNavBar>

      <MainWrapper>
        <PrimaryNav>
          <NavItem $active={activeMainTab === 'designer'} onClick={() => setActiveMainTab('designer')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" /></svg>
            Designer
          </NavItem>
          <NavItem $active={activeMainTab === 'editor'} onClick={() => setActiveMainTab('editor')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            Editor
          </NavItem>
          <NavItem $active={activeMainTab === 'repository'} onClick={() => setActiveMainTab('repository')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
            Repository
          </NavItem>
          <NavItem $active={activeMainTab === 'monitoring'} onClick={() => setActiveMainTab('monitoring')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            Monitoring
          </NavItem>
          <NavItem $active={activeMainTab === 'logfiles'} onClick={() => setActiveMainTab('logfiles')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            Log files
          </NavItem>
          <NavItem $active={activeMainTab === 'admin'} onClick={() => setActiveMainTab('admin')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            Admin
          </NavItem>
        </PrimaryNav>

        <LeftSidebar>
          <SidebarHeader>
            <SearchInput placeholder="Search" />
            <NavIconBtn><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></NavIconBtn>
          </SidebarHeader>
          <SidebarContent>
            <TreeItem $depth={0} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Diagram OF Group: Admin</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Process Maps</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Business Process Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Business Object Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Organization Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> System Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Technical Workflows</TreeItem>
            <TreeItem $depth={0} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Diagram Of User: Root</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Process Maps</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Business Process Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Business Object Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Organization Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> System Diagrams</TreeItem>
            <TreeItem $depth={1} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> Technical Workflows</TreeItem>
            <TreeItem $depth={2} $isFolder={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> New</TreeItem>
            <TreeItem $depth={3} $active={true}><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg> Flow 01</TreeItem>
          </SidebarContent>
          {minimapContent && (
            <div style={{ borderTop: '1px solid #DFE1E6' }}>
              {minimapContent}
            </div>
          )}
        </LeftSidebar>

        <CenterArea>
          <TabsBar>
            <TabsList>
              <TabItem $active={true}>
                Flow 01
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </TabItem>
              <TabItem>
                 Show module versions
              </TabItem>
              <TabItem>
                 Show module numbers
              </TabItem>
            </TabsList>
            <CommentBtn>Make a comment</CommentBtn>
          </TabsBar>

          <CanvasWrapper>
            {activeMainTab === 'editor' ? designerContent : repositoryContent}
          </CanvasWrapper>

          <StatusBar>
            <StatusGroup>
              <StatusItem><span>Type:</span> <b>Technical Workflow</b></StatusItem>
              <StatusItem><span>Version:</span> <b>Head</b></StatusItem>
              <StatusItem><span>Mode:</span> <b>Editor</b></StatusItem>
            </StatusGroup>
            <StatusGroup>
              {/* Zoom controls moved to TopToolbar */}
            </StatusGroup>
          </StatusBar>
        </CenterArea>




      </MainWrapper>

      {/* Modals */}
      {isConnectionManagerOpen && (
        <ConnectionManager onClose={() => setIsConnectionManagerOpen(false)} />
      )}
    </LayoutContainer>
  );
}
