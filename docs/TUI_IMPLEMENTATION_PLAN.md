# OAuth CLI Terminal User Interface (TUI) Implementation Plan

## Executive Summary

### Purpose

This document outlines a comprehensive plan to enhance the OAuth CLI tool with a modern Terminal User Interface (TUI), transforming it from a basic prompt-based interface to a sophisticated, visual, and highly interactive terminal application.

### Current State

- **Technology**: Basic Inquirer.js prompts for interactive mode
- **User Experience**: Sequential question-answer flow
- **Visual Feedback**: Limited to colored text output
- **Navigation**: Linear, menu-driven interface

### Target State

- **Technology**: Ink (React-based TUI) with @clack/prompts
- **User Experience**: Multi-panel dashboard with real-time updates
- **Visual Feedback**: Rich visual components, progress indicators, status badges
- **Navigation**: Tab-based navigation with keyboard shortcuts

### Benefits

1. **Improved User Experience**: 70% reduction in task completion time
2. **Enhanced Accessibility**: Full screen reader support (WCAG 2.1 AA)
3. **Better Visual Feedback**: Real-time status updates and progress tracking
4. **Professional Appearance**: Modern TUI comparable to tools like k9s, lazygit
5. **Increased Productivity**: Keyboard shortcuts and multi-panel workflows

## Technical Architecture

### Technology Stack

```typescript
// Core Dependencies
{
  "dependencies": {
    "ink": "^4.4.1",
    "react": "^18.2.0",
    "@clack/prompts": "^0.11.0",
    "ink-text-input": "^5.0.1",
    "ink-select-input": "^5.0.0",
    "ink-tab": "^3.0.0",
    "ink-spinner": "^4.0.3",
    "ink-gradient": "^3.0.0",
    "ink-big-text": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "ink-testing-library": "^3.0.0"
  }
}
```

### Component Architecture

```
src/
├── tui/
│   ├── App.tsx                 # Main TUI application
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── MainDashboard.tsx
│   │   │   ├── StatusPanel.tsx
│   │   │   ├── TokenPanel.tsx
│   │   │   └── ProviderPanel.tsx
│   │   ├── Auth/
│   │   │   ├── AuthWizard.tsx
│   │   │   ├── GrantTypeSelector.tsx
│   │   │   ├── ProviderSelector.tsx
│   │   │   └── AuthProgress.tsx
│   │   ├── Token/
│   │   │   ├── TokenManager.tsx
│   │   │   ├── TokenDisplay.tsx
│   │   │   ├── TokenRefresh.tsx
│   │   │   └── TokenInspector.tsx
│   │   ├── Config/
│   │   │   ├── ConfigManager.tsx
│   │   │   ├── ProviderForm.tsx
│   │   │   └── ConfigValidator.tsx
│   │   └── Common/
│   │       ├── Layout.tsx
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       ├── Tabs.tsx
│   │       └── FormInput.tsx
│   ├── hooks/
│   │   ├── useOAuth.ts
│   │   ├── useTokens.ts
│   │   ├── useConfig.ts
│   │   └── useKeyboard.ts
│   ├── context/
│   │   ├── AppContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── TokenContext.tsx
│   ├── services/
│   │   ├── TUIAuthService.ts
│   │   ├── TUITokenService.ts
│   │   └── TUIConfigService.ts
│   └── utils/
│       ├── formatting.ts
│       ├── validation.ts
│       └── accessibility.ts
```

### State Management

```typescript
// AppContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface AppState {
  currentView: 'dashboard' | 'auth' | 'tokens' | 'config';
  providers: ProviderConfig[];
  tokens: Map<string, OAuthToken>;
  activeProvider?: string;
  isLoading: boolean;
  error?: string;
}

type AppAction =
  | { type: 'SET_VIEW'; view: AppState['currentView'] }
  | { type: 'SET_PROVIDERS'; providers: ProviderConfig[] }
  | { type: 'SET_TOKENS'; tokens: Map<string, OAuthToken> }
  | { type: 'SET_ACTIVE_PROVIDER'; provider: string }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string };

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);
```

## Implementation Phases

### Phase 1: Foundation Setup (Week 1-2)

#### Objectives

- Set up Ink and React infrastructure
- Create basic TUI application shell
- Implement navigation system

#### Deliverables

1. Basic Ink application with routing
2. Main layout components (Header, Footer, Layout)
3. Tab navigation system
4. Keyboard shortcut handler

#### Code Example

```tsx
// src/tui/App.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { MainDashboard } from './components/Dashboard/MainDashboard';
import { AuthWizard } from './components/Auth/AuthWizard';
import { TokenManager } from './components/Token/TokenManager';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'auth' | 'tokens'>('dashboard');

  useInput((input, key) => {
    if (key.ctrl && input === 'd') {
      setActiveTab('dashboard');
    } else if (key.ctrl && input === 'a') {
      setActiveTab('auth');
    } else if (key.ctrl && input === 't') {
      setActiveTab('tokens');
    } else if (key.escape) {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="single" paddingX={1}>
        <Text bold color="blue">OAuth CLI v1.0.0</Text>
        <Text> | </Text>
        <Text color={activeTab === 'dashboard' ? 'green' : 'gray'}>
          [Ctrl+D] Dashboard
        </Text>
        <Text> | </Text>
        <Text color={activeTab === 'auth' ? 'green' : 'gray'}>
          [Ctrl+A] Auth
        </Text>
        <Text> | </Text>
        <Text color={activeTab === 'tokens' ? 'green' : 'gray'}>
          [Ctrl+T] Tokens
        </Text>
      </Box>

      <Box flexGrow={1}>
        {activeTab === 'dashboard' && <MainDashboard />}
        {activeTab === 'auth' && <AuthWizard />}
        {activeTab === 'tokens' && <TokenManager />}
      </Box>

      <Box borderStyle="single" paddingX={1}>
        <Text dimColor>[ESC] Exit | [Tab] Navigate | [Enter] Select</Text>
      </Box>
    </Box>
  );
};
```

### Phase 2: Dashboard Implementation (Week 2-3)

#### Objectives

- Create main dashboard with status panels
- Implement real-time token status monitoring
- Add provider status indicators

#### Deliverables

1. Multi-panel dashboard layout
2. Token expiry countdown
3. Provider connection status
4. Quick actions panel

#### ASCII Mockup

```
╔═══════════════════════ OAuth CLI Dashboard ════════════════════════╗
║                                                                     ║
║  ┌─────────── Providers ──────────┐  ┌────────── Tokens ──────────┐║
║  │ ✅ Google (configured)         │  │ 🔐 google: Active (2h)     │║
║  │ ✅ GitHub (configured)         │  │ 🔐 github: Active (5m)     │║
║  │ ⚠️  Azure (needs config)       │  │ ⚠️  azure: Expired         │║
║  │ ➕ Add Provider                │  │ 🔄 Refresh All             │║
║  └────────────────────────────────┘  └────────────────────────────┘║
║                                                                     ║
║  ┌─────────── Recent Activity ─────────────────────────────────────┐║
║  │ [10:45] ✅ Token refreshed for Google                           │║
║  │ [10:42] ✅ Authentication completed for GitHub                  │║
║  │ [10:40] ⚠️  Token expired for Azure                            │║
║  │ [10:35] ✅ Config saved for Google provider                     │║
║  └──────────────────────────────────────────────────────────────────┘║
║                                                                     ║
║  Quick Actions: [A]uth | [R]efresh | [I]nspect | [C]onfig | [?]Help ║
╚═════════════════════════════════════════════════════════════════════╝
```

### Phase 3: Authentication Wizard (Week 3-4)

#### Objectives

- Create step-by-step authentication wizard
- Implement all OAuth grant types
- Add PKCE support visualization
- Real-time progress tracking

#### Deliverables

1. Multi-step wizard component
2. Grant type selector with descriptions
3. Dynamic form generation
4. OAuth flow progress indicator

#### Authentication Flow Mockup

```
╔═══════════════════ OAuth Authentication Wizard ════════════════════╗
║  Step 2 of 4: Grant Type Selection                                 ║
║  ─────────────────────────────────────────────────────────────────║
║                                                                     ║
║  Select OAuth Grant Type:                                          ║
║                                                                     ║
║  ┌─────────────────────────────────────────────────────────────┐  ║
║  │ ▶ 🌐 Authorization Code                                     │  ║
║  │   Best for: Web applications with server backend            │  ║
║  │   Security: ⭐⭐⭐⭐⭐ (with PKCE)                           │  ║
║  ├─────────────────────────────────────────────────────────────┤  ║
║  │   🤖 Client Credentials                                     │  ║
║  │   Best for: Machine-to-machine authentication               │  ║
║  │   Security: ⭐⭐⭐⭐                                        │  ║
║  ├─────────────────────────────────────────────────────────────┤  ║
║  │   📱 Device Code                                            │  ║
║  │   Best for: Devices with limited input (TV, IoT)            │  ║
║  │   Security: ⭐⭐⭐⭐                                        │  ║
║  └─────────────────────────────────────────────────────────────┘  ║
║                                                                     ║
║  Progress: [██████░░░░░░░░░░░░░░] 30%                             ║
║                                                                     ║
║  [←] Previous  [→] Next  [ESC] Cancel                             ║
╚═════════════════════════════════════════════════════════════════════╝
```

### Phase 4: Token Management Interface (Week 4-5)

#### Objectives

- Create comprehensive token management UI
- Add token inspection capabilities
- Implement refresh workflows
- Token export/import features

#### Deliverables

1. Token list with status indicators
2. JWT decoder and visualizer
3. Token refresh interface
4. Copy to clipboard functionality

#### Token Manager Mockup

```
╔══════════════════════ Token Management ═════════════════════════════╗
║  ┌─────────── Token List ──────────┐  ┌──────── Token Details ─────┐║
║  │ Provider    Status   Expires     │  │ Provider: Google           │║
║  │ ─────────────────────────────── │  │ Type: Bearer               │║
║  │ ▶ Google    Active   2h 15m     │  │ Expires: 2024-01-20 14:30 │║
║  │   GitHub    Active   5m 30s     │  │                            │║
║  │   Azure     Expired  -          │  │ Scopes:                    │║
║  │   Slack     Active   1d 3h      │  │ - openid                   │║
║  │                                  │  │ - profile                  │║
║  │ Actions:                         │  │ - email                    │║
║  │ [R]efresh Selected              │  │                            │║
║  │ [D]elete                        │  │ Token Preview:             │║
║  │ [E]xport                        │  │ eyJhbGciOiJSUzI1NiIs...   │║
║  │ [I]mport                        │  │                            │║
║  └────────────────────────────────┘  │ [C]opy | [I]nspect JWT    │║
║                                       └────────────────────────────┘║
╚══════════════════════════════════════════════════════════════════════╝
```

### Phase 5: JWT Inspector (Week 5-6)

#### Objectives

- Create visual JWT decoder
- Add signature verification UI
- Implement claims visualization
- Token validation feedback

#### Deliverables

1. JWT structure visualizer
2. Claims table with descriptions
3. Signature verification status
4. Token validation results

#### JWT Inspector Mockup

```
╔════════════════════════ JWT Token Inspector ════════════════════════╗
║  ┌─────────────────────── Token Structure ───────────────────────┐ ║
║  │ HEADER (Algorithm & Type)                                     │ ║
║  │ ┌─────────────────────────────────────────────────────────┐  │ ║
║  │ │ {                                                        │  │ ║
║  │ │   "alg": "RS256",                                        │  │ ║
║  │ │   "typ": "JWT",                                          │  │ ║
║  │ │   "kid": "rsa-key-1"                                     │  │ ║
║  │ │ }                                                        │  │ ║
║  │ └─────────────────────────────────────────────────────────┘  │ ║
║  │                                                               │ ║
║  │ PAYLOAD (Claims)                                             │ ║
║  │ ┌─────────────────────────────────────────────────────────┐  │ ║
║  │ │ Claim          Value                    Description      │  │ ║
║  │ │ ─────────────────────────────────────────────────────  │  │ ║
║  │ │ iss            oauth.provider.com       Issuer          │  │ ║
║  │ │ sub            user123                  Subject         │  │ ║
║  │ │ exp            1706280000               Expires         │  │ ║
║  │ │ iat            1706276400               Issued At       │  │ ║
║  │ │ scope          "read write"             Permissions     │  │ ║
║  │ └─────────────────────────────────────────────────────────┘  │ ║
║  │                                                               │ ║
║  │ SIGNATURE       ⚠️  Unverified (no key available)           │ ║
║  └───────────────────────────────────────────────────────────────┘ ║
║  Validation: ✅ Structure | ⚠️  Expiry (2h left) | ❌ Signature    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Phase 6: Configuration Manager (Week 6-7)

#### Objectives

- Create provider configuration interface
- Add template-based setup
- Implement validation feedback
- Configuration import/export

#### Deliverables

1. Provider configuration forms
2. Template selector
3. Real-time validation
4. Configuration file manager

### Phase 7: Advanced Features (Week 7-9)

#### Objectives

- Device code flow visualization
- PKCE flow diagram
- Token lifecycle visualization
- Command palette implementation

#### Device Code Flow Mockup

```
╔═══════════════════ Device Authorization Flow ═══════════════════════╗
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐ ║
║  │                                                                │ ║
║  │   Please visit: https://device.provider.com/activate          │ ║
║  │                                                                │ ║
║  │   Enter this code:  ABCD-1234                                 │ ║
║  │                                                                │ ║
║  │        ┌─────────────────────────────────┐                    │ ║
║  │        │   A B C D  -  1 2 3 4           │                    │ ║
║  │        └─────────────────────────────────┘                    │ ║
║  │                                                                │ ║
║  │   Status: ⏳ Waiting for authorization...                      │ ║
║  │                                                                │ ║
║  │   [=========>                          ] 25% (15s remaining)  │ ║
║  │                                                                │ ║
║  │   Expires in: 14:45                                           │ ║
║  │                                                                │ ║
║  └────────────────────────────────────────────────────────────────┘ ║
║                                                                      ║
║  [C]opy URL | [O]pen Browser | [R]etry | [ESC] Cancel              ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Phase 8: Testing & Polish (Week 9-11)

#### Objectives

- Comprehensive testing
- Performance optimization
- Accessibility compliance
- Documentation

## Component Specifications

### Core Components

#### 1. MainDashboard Component

```typescript
interface MainDashboardProps {
  providers: ProviderConfig[];
  tokens: Map<string, OAuthToken>;
  recentActivity: ActivityLog[];
}

// Features:
// - Real-time token expiry countdown
// - Provider status indicators
// - Quick action buttons
// - Activity feed with auto-refresh
```

#### 2. AuthWizard Component

```typescript
interface AuthWizardProps {
  provider?: string;
  onComplete: (token: OAuthToken) => void;
  onCancel: () => void;
}

// Features:
// - Step-by-step navigation
// - Dynamic form generation
// - Progress indicator
// - Error recovery
```

#### 3. TokenManager Component

```typescript
interface TokenManagerProps {
  tokens: Map<string, OAuthToken>;
  onRefresh: (provider: string) => Promise<void>;
  onDelete: (provider: string) => void;
}

// Features:
// - Token list with status
// - Bulk operations
// - Export/Import functionality
// - Refresh scheduling
```

#### 4. JWTInspector Component

```typescript
interface JWTInspectorProps {
  token: string;
  verificationKey?: string;
}

// Features:
// - Visual token structure
// - Claims explanation
// - Signature verification
// - Copy functionality
```

## Migration Strategy

### Phase 1: Parallel Implementation

- Keep existing Inquirer interface
- Build TUI components alongside
- Add `--tui` flag to enable new interface

### Phase 2: Feature Parity

- Ensure all Inquirer features work in TUI
- Add TUI-exclusive enhancements
- Maintain backward compatibility

### Phase 3: User Testing

- Beta release with opt-in TUI
- Gather user feedback
- Iterate on design and functionality

### Phase 4: Default Switch

- Make TUI the default interface
- Keep `--classic` flag for old interface
- Deprecation notice for Inquirer mode

## Testing Strategy

### Unit Testing

```typescript
// Example: Testing AuthWizard component
import { render } from 'ink-testing-library';
import { AuthWizard } from '../components/Auth/AuthWizard';

describe('AuthWizard', () => {
  it('should navigate through steps', () => {
    const { lastFrame, stdin } = render(
      <AuthWizard onComplete={jest.fn()} onCancel={jest.fn()} />
    );

    expect(lastFrame()).toContain('Step 1');
    stdin.write('\r'); // Press enter
    expect(lastFrame()).toContain('Step 2');
  });
});
```

### Integration Testing

- Test OAuth flows end-to-end
- Verify state management
- Test keyboard navigation
- Validate form submissions

### Accessibility Testing

- Screen reader compatibility
- Keyboard-only navigation
- High contrast mode
- Focus management

## Performance Considerations

### Rendering Optimization

- Use React.memo for static components
- Implement virtual scrolling for long lists
- Batch state updates
- Minimize re-renders

### Memory Management

- Clear unused state
- Implement cleanup in useEffect
- Limit history entries
- Optimize token storage

## Accessibility Implementation

### Screen Reader Support

```tsx
// Example: Accessible button component
<Box
  aria-role="button"
  aria-label="Refresh token for Google"
  aria-state={{ pressed: isRefreshing }}
>
  <Text>🔄 Refresh</Text>
</Box>
```

### Keyboard Navigation

- Tab order management
- Focus trap in modals
- Keyboard shortcuts
- Skip navigation links

### Visual Accessibility

- High contrast mode support
- Configurable color themes
- Clear focus indicators
- Sufficient text sizing

## Development Timeline

### Week 1-2: Foundation

- [ ] Set up Ink infrastructure
- [ ] Create base components
- [ ] Implement routing
- [ ] Add keyboard handling

### Week 3-4: Core Features

- [ ] Build dashboard
- [ ] Create auth wizard
- [ ] Implement token manager
- [ ] Add provider selector

### Week 5-6: Token Features

- [ ] JWT inspector
- [ ] Token refresh UI
- [ ] Token storage interface
- [ ] Export/Import functionality

### Week 7-8: Advanced Features

- [ ] Device flow UI
- [ ] PKCE visualization
- [ ] Command palette
- [ ] History viewer

### Week 9-10: Polish

- [ ] Accessibility compliance
- [ ] Performance optimization
- [ ] Error handling
- [ ] Help documentation

### Week 11: Release Preparation

- [ ] Final testing
- [ ] Documentation
- [ ] Migration guide
- [ ] Release notes

## Risk Assessment

### Technical Risks

1. **Ink Performance**: Mitigation - Performance testing early
2. **State Complexity**: Mitigation - Use proven patterns
3. **Testing Challenges**: Mitigation - Comprehensive test suite

### User Adoption Risks

1. **Learning Curve**: Mitigation - Extensive documentation
2. **Feature Parity**: Mitigation - Gradual migration
3. **Accessibility**: Mitigation - Early testing with screen readers

## Success Metrics

1. **Performance**
   - TUI startup time < 200ms
   - Response time < 50ms
   - Memory usage < 100MB

2. **Usability**
   - Task completion time reduced by 50%
   - User satisfaction score > 4.5/5
   - Zero accessibility violations

3. **Adoption**
   - 80% users prefer TUI over CLI
   - < 5% revert to classic mode
   - Positive community feedback

## Conclusion

This comprehensive TUI implementation plan transforms the OAuth CLI tool into a modern, accessible, and user-friendly application. By leveraging Ink's React-based architecture and following accessibility best practices, we can create a terminal interface that rivals modern GUI applications while maintaining the efficiency and scriptability that CLI users expect.

The phased approach ensures steady progress while maintaining backward compatibility, and the focus on testing and accessibility guarantees a production-ready result that serves all users effectively.

## Next Steps

1. **Approval**: Review and approve implementation plan
2. **Team Assignment**: Allocate 2-3 developers
3. **Environment Setup**: Install dependencies and create TUI branch
4. **Phase 1 Kickoff**: Begin foundation implementation
5. **Weekly Reviews**: Track progress against milestones

---

*This implementation plan serves as the definitive guide for the OAuth CLI TUI enhancement project. All development should reference this document for architectural decisions, component specifications, and implementation guidelines.*
