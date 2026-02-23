'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { dia } from '@joint/core';
import { useDiagram } from '../context/DiagramProvider';

// ============================================================
// STYLED COMPONENTS
// ============================================================

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.modal || 1000};
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.colors.bg.secondary};
  width: 800px;
  height: 600px;
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
`;

// ---------- HEADER ----------

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.bg.tertiary};
`;

const HeaderTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const HeaderIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${({ theme }) => theme.colors.accent.primary};
`;

const HeaderTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.sizes.md};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.colors.text.tertiary};
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.sm};
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.colors.bg.canvas};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// ---------- MAIN BODY ----------

const Body = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
`;

// ---------- SIDEBAR ----------

const Sidebar = styled.div`
  width: 250px;
  background: ${({ theme }) => theme.colors.bg.tertiary};
  border-right: 1px solid ${({ theme }) => theme.colors.border.subtle};
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
`;

const ProviderLogo = styled.div`
  width: 40px;
  height: 40px;
  background: #fff;
  border-radius: ${({ theme }) => theme.radius.sm};
  display: flex;
  align-items: center;
  justify-content: center;
  img {
    max-width: 80%;
    max-height: 80%;
  }
`;

const ProviderInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const ProviderName = styled.div`
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`;

const ProviderConnector = styled.div`
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const TabList = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.sm} 0;
`;

const TabItem = styled.div<{ $active?: boolean }>`
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  color: ${({ $active, theme }) => ($active ? theme.colors.text.primary : theme.colors.text.secondary)};
  background: ${({ $active, theme }) => ($active ? theme.colors.bg.secondary : 'transparent')};
  border-left: 3px solid ${({ $active, theme }) => ($active ? theme.colors.accent.primary : 'transparent')};
  transition: all 0.2s;

  &:hover {
    background: ${({ $active, theme }) => ($active ? theme.colors.bg.secondary : theme.colors.bg.canvas)};
    color: ${({ theme }) => theme.colors.text.primary};
  }
`;

// ---------- CONTENT AREA ----------

const ContentArea = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.xl};
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const SectionTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.sizes.md};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  margin: 0 0 ${({ theme }) => theme.spacing.sm} 0;
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const RequiredAsterisk = styled.span`
  color: ${({ theme }) => theme.colors.accent?.danger || '#FF5C5C'};
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.canvas};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const SelectWrap = styled.div`
  position: relative;
  width: 100%;
  
  &::after {
    content: "▼";
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    color: ${({ theme }) => theme.colors.text.tertiary};
    pointer-events: none;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  padding-right: 32px;
  background: ${({ theme }) => theme.colors.bg.canvas};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  outline: none;
  appearance: none;
  cursor: pointer;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.xs};
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.colors.accent.primary};
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  cursor: pointer;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  background: ${({ theme }) => theme.colors.bg.canvas};
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  outline: none;
  resize: vertical;
  min-height: 80px;

  &:focus {
    border-color: ${({ theme }) => theme.colors.accent.primary};
  }
`;

const SchemaRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  width: 100%;
`;

const ActionButtonSmall = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.border.subtle};
  color: ${({ theme }) => theme.colors.text.primary};
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.sizes.xs};
  
  &:hover {
    background: ${({ theme }) => theme.colors.bg.canvas};
  }
`;

// ---------- FOOTER ----------

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.xl};
  border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  background: ${({ theme }) => theme.colors.bg.tertiary};
`;

const FooterButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'outline' }>`
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: ${({ theme }) => theme.typography.sizes.sm};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  ${({ $variant = 'outline', theme }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: ${theme.colors.accent.primary};
          color: #fff;
          border: 1px solid ${theme.colors.accent.primary};
          &:hover { opacity: 0.9; }
        `;
      case 'secondary':
        return `
          background: ${theme.colors.bg.canvas};
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.strong};
          &:hover { background: ${theme.colors.bg.secondary}; }
        `;
      case 'outline':
      default:
        return `
          background: transparent;
          color: ${theme.colors.text.primary};
          border: 1px solid ${theme.colors.border.default};
          &:hover { background: ${theme.colors.bg.canvas}; }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// ============================================================
// COMPONENT
// ============================================================

interface ConfigModalProps {
  cell: dia.Cell;
  onClose: () => void;
}

export default function ConfigModal({ cell, onClose }: ConfigModalProps) {
  const { commandManager } = useDiagram();
  
  // Tab state
  const [activeTab, setActiveTab] = useState('http');
  
  // Form state synced with cell
  const [moduleName, setModuleName] = useState('');
  const [pluginGroup, setPluginGroup] = useState('');
  const [pluginName, setPluginName] = useState('');
  const [inputType, setInputType] = useState('');
  const [outputType, setOutputType] = useState('');
  const [errorSuppression, setErrorSuppression] = useState(false);
  const [comment, setComment] = useState('');
  const [schemaCheckInput, setSchemaCheckInput] = useState(false);
  const [schemaCheckOutput, setSchemaCheckOutput] = useState(false);

  // Initialize state from cell attributes
  useEffect(() => {
    if (!cell) return;
    
    setModuleName(cell.attr('module/name') as string || cell.attr('label/text') as string || '');
    setPluginGroup(cell.attr('module/pluginGroup') as string || '');
    setPluginName(cell.attr('module/pluginName') as string || '');
    setInputType(cell.attr('module/inputType') as string || '');
    setOutputType(cell.attr('module/outputType') as string || '');
    setErrorSuppression(cell.attr('module/errorSuppression') as boolean || false);
    setComment(cell.attr('module/comment') as string || '');
    setSchemaCheckInput(cell.attr('module/schemaCheckInput') as boolean || false);
    setSchemaCheckOutput(cell.attr('module/schemaCheckOutput') as boolean || false);
  }, [cell]);

  // Close on Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleFinish = () => {
    commandManager.startBatch('configure-element');
    
    // Save attributes to cell
    cell.attr('module/name', moduleName);
    cell.attr('module/pluginGroup', pluginGroup);
    cell.attr('module/pluginName', pluginName);
    cell.attr('module/inputType', inputType);
    cell.attr('module/outputType', outputType);
    cell.attr('module/errorSuppression', errorSuppression);
    cell.attr('module/comment', comment);
    cell.attr('module/schemaCheckInput', schemaCheckInput);
    cell.attr('module/schemaCheckOutput', schemaCheckOutput);
    
    // Also update the visible label to match the module name
    cell.attr('label/text', moduleName || cell.get('type'));

    commandManager.stopBatch();
    onClose();
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContainer>
        <Header>
          <HeaderTitleGroup>
            <HeaderIcon>
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="7.5 4.21 12 6.81 16.5 4.21"></polyline>
                <polyline points="7.5 19.79 7.5 14.6 3 12"></polyline>
                <polyline points="21 12 16.5 14.6 16.5 19.79"></polyline>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
            </HeaderIcon>
            <HeaderTitle>Create New module</HeaderTitle>
          </HeaderTitleGroup>
          <CloseButton onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" width="18" height="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </CloseButton>
        </Header>

        <Body>
          <Sidebar>
            <SidebarHeader>
              <ProviderLogo>
                <svg viewBox="0 0 24 24" fill="#00C853" width="24" height="24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm4 4h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </ProviderLogo>
              <ProviderInfo>
                <ProviderName>Terra</ProviderName>
                <ProviderConnector>HTTP Connector</ProviderConnector>
              </ProviderInfo>
            </SidebarHeader>
            <TabList>
              <TabItem $active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General module properties</TabItem>
              <TabItem $active={activeTab === 'system'} onClick={() => setActiveTab('system')}>System Connector properties</TabItem>
              <TabItem $active={activeTab === 'http'} onClick={() => setActiveTab('http')}>HTTP Connector Properties</TabItem>
            </TabList>
          </Sidebar>

          <ContentArea>
            {activeTab === 'http' && (
              <>
                <SectionTitle>Module</SectionTitle>
                <FormGroup>
                  <Label>Name<RequiredAsterisk>*</RequiredAsterisk></Label>
                  <Input 
                    placeholder="Enter the value" 
                    value={moduleName} 
                    onChange={(e) => setModuleName(e.target.value)} 
                  />
                </FormGroup>
                
                <FormGroup>
                  <Label>Plug-in group</Label>
                  <SelectWrap>
                    <Select value={pluginGroup} onChange={(e) => setPluginGroup(e.target.value)}>
                      <option value="">Select Value</option>
                      <option value="group1">Group 1</option>
                      <option value="group2">Group 2</option>
                    </Select>
                  </SelectWrap>
                </FormGroup>
                
                <FormGroup>
                  <Label>Plug-in Name</Label>
                  <SelectWrap>
                    <Select value={pluginName} onChange={(e) => setPluginName(e.target.value)}>
                      <option value="">Select Value</option>
                      <option value="plugin1">Plugin 1</option>
                      <option value="plugin2">Plugin 2</option>
                    </Select>
                  </SelectWrap>
                </FormGroup>

                <SectionTitle style={{ marginTop: '16px' }}>Message type</SectionTitle>
                
                <FormGroup>
                  <Label>Input<RequiredAsterisk>*</RequiredAsterisk></Label>
                  <SelectWrap>
                    <Select value={inputType} onChange={(e) => setInputType(e.target.value)}>
                      <option value="">Select Value</option>
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="text">Text</option>
                    </Select>
                  </SelectWrap>
                  
                  <SchemaRow>
                    <CheckboxGroup>
                      <Checkbox 
                        id="chk-schema-input" 
                        checked={schemaCheckInput} 
                        onChange={(e) => setSchemaCheckInput(e.target.checked)} 
                      />
                      <CheckboxLabel htmlFor="chk-schema-input">Schema check</CheckboxLabel>
                    </CheckboxGroup>
                    <SelectWrap style={{ flex: 1 }}>
                      <Select disabled={!schemaCheckInput}>
                        <option value="">Select Value</option>
                      </Select>
                    </SelectWrap>
                    <ActionButtonSmall disabled={!schemaCheckInput}>...</ActionButtonSmall>
                  </SchemaRow>
                </FormGroup>

                <FormGroup>
                  <Label>Output<RequiredAsterisk>*</RequiredAsterisk></Label>
                  <SelectWrap>
                    <Select value={outputType} onChange={(e) => setOutputType(e.target.value)}>
                      <option value="">Select Value</option>
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="text">Text</option>
                    </Select>
                  </SelectWrap>
                  
                  <SchemaRow>
                    <CheckboxGroup>
                      <Checkbox 
                        id="chk-schema-output" 
                        checked={schemaCheckOutput} 
                        onChange={(e) => setSchemaCheckOutput(e.target.checked)} 
                      />
                      <CheckboxLabel htmlFor="chk-schema-output">Schema check</CheckboxLabel>
                    </CheckboxGroup>
                    <SelectWrap style={{ flex: 1 }}>
                      <Select disabled={!schemaCheckOutput}>
                        <option value="">Select Value</option>
                      </Select>
                    </SelectWrap>
                    <ActionButtonSmall disabled={!schemaCheckOutput}>...</ActionButtonSmall>
                  </SchemaRow>
                </FormGroup>

                <SectionTitle style={{ marginTop: '16px' }}>Error suppression</SectionTitle>
                <CheckboxGroup>
                  <Checkbox 
                    id="chk-err-sup" 
                    checked={errorSuppression} 
                    onChange={(e) => setErrorSuppression(e.target.checked)} 
                  />
                  <CheckboxLabel htmlFor="chk-err-sup">Consider workflow as successful despite executed error branch or scope</CheckboxLabel>
                </CheckboxGroup>

                <SectionTitle style={{ marginTop: '16px' }}>Comment</SectionTitle>
                <FormGroup>
                  <TextArea 
                    placeholder="Enter the value" 
                    value={comment} 
                    onChange={(e) => setComment(e.target.value)} 
                  />
                </FormGroup>
              </>
            )}
            
            {activeTab !== 'http' && (
              <div style={{ color: '#888', fontStyle: 'italic', padding: '20px' }}>
                Content for {activeTab} properties...
              </div>
            )}
          </ContentArea>
        </Body>

        <Footer>
          <FooterButtonGroup>
            <Button disabled>&lt; Back</Button>
            <Button disabled>Next &gt;</Button>
          </FooterButtonGroup>
          <FooterButtonGroup>
            <Button onClick={onClose}>Cancel</Button>
            <Button disabled>Validate</Button>
            <Button $variant="primary" onClick={handleFinish}>Finish</Button>
          </FooterButtonGroup>
        </Footer>
      </ModalContainer>
    </Overlay>
  );
}
