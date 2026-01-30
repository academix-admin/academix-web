# NavigationStack - Comprehensive Documentation

> A production-ready React navigation library for building complex multi-stack applications with sophisticated lifecycle management, group-level visibility tracking, and race condition prevention.

**Table of Contents**
1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Lifecycle Events](#lifecycle-events)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Advanced Patterns](#advanced-patterns)
8. [Performance & Optimization](#performance--optimization)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is NavigationStack?

NavigationStack is a sophisticated React navigation library that handles the complexity of multi-page applications. It's designed to solve problems that most frameworks handle poorly:

- **Multi-stack navigation** with parent-child relationships
- **Group navigation** for managing related stacks together (think: tabs)
- **Page lifecycle events** (onEnter, onExit, onPause, onResume)
- **Cross-stack communication** via dependency injection
- **Automatic scroll restoration** per page
- **Race condition prevention** with lock mechanisms
- **SSR-safe initialization**

### Key Features

| Feature | Description |
|---------|-------------|
| **Stack-Based Navigation** | Pages organized in stacks like Android navigation |
| **Group Navigation** | Multiple stacks grouped together with visibility tracking |
| **Lifecycle Events** | Comprehensive page lifecycle (enter/exit/pause/resume) |
| **Object Injection** | Pass objects between pages via provideObject/getObject |
| **Scroll Restoration** | Automatic per-page scroll position tracking |
| **Memory Management** | Intelligent page caching and cleanup |
| **Race Condition Prevention** | Lock mechanism prevents concurrent operations |
| **URL Sync** | Optional browser history synchronization |
| **Error Boundaries** | Safe error handling for lazy-loaded components |

### File Statistics

```
File: src/lib/NavigationStack.tsx
Lines: ~4944
Complexity: High (production-grade)
Key Classes: 6
Key Hooks: 5+
Exported Types/Functions: 20+
```

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              React Components (Your Pages)                  │
│                                                              │
│  useNav() usePageLifecycle() useObject() ...                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│           Navigation Context Layer                          │
│  (NavContext, GroupNavigationContext, CurrentPageContext)   │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Core Navigation Engine                         │
│                                                              │
│  createApiFor(stackId, routes):                              │
│  • Manages stack state and operations                        │
│  • push(), pop(), replace(), go(), popToRoot()              │
│  • Coordinates with lifecycle manager                       │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│           System Managers & Registries                      │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │EnhancedLifecycle    │  │ TransitionManager            │ │
│  │Manager              │  │ • Animation state            │ │
│  │• Message bus        │  │ • Race condition prevention  │ │
│  │• Event firing       │  │ • Completion tracking        │ │
│  │• Handler registry   │  │ • Error handling             │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │PageMemoryManager    │  │ObjectReferenceRegistry       │ │
│  │• Page cache         │  │• Dependency injection        │ │
│  │• Memory cleanup     │  │• Object lifecycle            │ │
│  │• Performance        │  │• Scope management            │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│            Global State Storage                             │
│                                                              │
│  globalRegistry: Map<stackId, StackRegistryEntry>           │
│  • Stack instances                                          │
│  • Listener subscriptions                                   │
│  • Guard & middleware functions                             │
│  • Parent-child relationships                               │
└──────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. EnhancedLifecycleManager
Message bus pattern for lifecycle events. Decouples event firing from navigation logic.

```typescript
class EnhancedLifecycleManager {
  private handlers: Map<LifecycleHook, Set<Handler>>;
  
  addHandler(hook: LifecycleHook, handler: Handler): () => void
  trigger(hook: LifecycleHook, context: any): Promise<void>
  getHandlers(hook: LifecycleHook): Handler[]
  clear(hook?: LifecycleHook): void
}
```

#### 2. TransitionManager
Coordinates animation state transitions with race condition prevention.

```typescript
class TransitionManager {
  private activeTransitions: Map<string, any>;
  
  start(uid: string, duration: number, onComplete: () => void)
  cancel(uid: string, reason?: string)
  interrupt(uid: string, reason?: string)
  isComplete(uid: string): boolean
  awaitAllComplete(timeoutMs?: number): Promise<void>
}
```

#### 3. PageMemoryManager
Caches rendered pages for performance with automatic cleanup.

```typescript
class PageMemoryManager {
  private cache: Map<string, { element: ReactNode; lastActive: number }>;
  
  get(uid: string): ReactNode | undefined
  set(uid: string, element: ReactNode)
  delete(uid: string)
}
```

#### 4. ObjectReferenceRegistry
Global dependency injection system for passing objects between pages.

```typescript
class ObjectReferenceRegistry {
  register(stackId: string, key: string, getter: () => any, scopeId?: string)
  getWithOptions<T>(stackId: string, key: string, options: any): T | undefined
  unregister(stackId: string, key: string)
}
```

---

## Core Concepts

### Stack Entry

Every page in the stack is represented as a `StackEntry`:

```typescript
interface StackEntry {
  uid: string;              // Unique identifier for this instance
  key: string;              // Route key (e.g., 'profile')
  params: NavParams;        // Route parameters
  metadata?: any;           // Custom metadata
}
```

**Important**: The `uid` is stable for a given page instance. If you navigate away and back, you get a new `uid`. This allows tracking individual page instances.

### Navigation API

The `NavStackAPI` is the core interface:

```typescript
interface NavStackAPI {
  id: string;                           // Stack identifier
  
  // Navigation operations
  push(key: string, params?: NavParams): Promise<boolean>;
  pop(): Promise<boolean>;
  replace(key: string, params?: NavParams): Promise<boolean>;
  go(key: string, params?: NavParams): Promise<boolean>;
  popToRoot(): Promise<boolean>;
  
  // Stack inspection
  peek(): StackEntry | undefined;
  getStack(): StackEntry[];
  length(): number;
  isTop(uid?: string): boolean;
  
  // Lifecycle registration
  addOnEnter(handler): () => void;
  addOnExit(handler): () => void;
  addOnPause(handler): () => void;
  addOnResume(handler): () => void;
  
  // Object management
  provideObject<T>(key: string, getter: () => T, options?): () => void;
  getObject<T>(key: string, options?): T | undefined;
  hasObject(key: string, options?): boolean;
  
  // Guards & middleware
  registerGuard(fn: GuardFn): () => void;
  registerMiddleware(fn: MiddlewareFn): () => void;
  
  // Subscriptions
  subscribe(fn: (stack: StackEntry[]) => void): () => void;
}
```

### Group Navigation

Groups manage multiple stacks with visibility tracking:

```typescript
interface GroupNavigationContextType {
  getGroupId(): string | null;
  getCurrent(): string;
  goToGroupId(groupId: string): Promise<boolean>;
  isActiveStack(stackId: string): boolean;
}
```

When you have tabbed navigation:
- Only one group stack is visible at a time
- Other stacks receive `onPause` event
- When returning, stacks receive `onResume` event
- Scroll position is restored automatically

---

## Lifecycle Events

### Two Categories

NavigationStack has two categories of lifecycle events:

#### Category 1: Stack-Level Events (Page Transitions)

These fire when pages enter/exit the stack.

##### `onEnter`

- **Fired**: EXACTLY ONCE when page first enters stack
- **Context**: `{ current, previous, action }`
- **Guarantee**: Will NOT fire again if page stays in stack
- **Use for**: Initial data loading, animations, setup

```typescript
onEnter: ({ current, previous, action }) => {
  console.log(`Entering page: ${current.key}`);
  // Load user profile data
  // Start animations
  // Initialize websocket
  // Fetch initial data
}
```

##### `onExit`

- **Fired**: When page is removed from stack
- **Context**: `{ current, previous, action }`
- **Guarantee**: After onExit, page is gone
- **Use for**: Cleanup, save data, unsubscribe

```typescript
onExit: ({ current, previous }) => {
  console.log(`Leaving page: ${previous.key}`);
  // Save form draft
  // Unsubscribe from websocket
  // Cancel pending requests
  // Pause videos
}
```

#### Category 2: Visibility Events

These fire when page visibility changes (but page stays in stack).

##### `onPause`

- **Fired**: When page becomes hidden
- **Triggers**:
  - Another page pushed on top
  - Group switches to different stack
- **Context**: `{ current, reason }`
- **Can happen multiple times**: Yes
- **Use for**: Pause videos, freeze timers, animations

```typescript
onPause: ({ current, reason }) => {
  if (reason === 'group-switch') {
    // Tab switched away
    console.log('Another tab became active');
  } else {
    // Another page pushed on top
    console.log('Another page is now on top');
  }
  
  // Pause video playback
  video.pause();
  // Stop animations
  clearInterval(timerInterval);
}
```

##### `onResume`

- **Fired**: When page becomes visible again
- **Triggers**:
  - Page above is popped
  - Group becomes active again
- **Context**: `{ current, reason }`
- **Can happen multiple times**: Yes
- **Use for**: Resume videos, refresh data, timers

```typescript
onResume: ({ current, reason }) => {
  if (reason === 'group-switch') {
    // Tab switched back to us
    console.log('This tab is active again');
    // Refresh data that may have changed
    fetchLatestData();
  } else {
    // Page on top was removed
    console.log('Another page was removed');
  }
  
  // Resume video playback
  video.play();
  // Resume animations
  startTimer();
}
```

#### Category 3: Navigation Hooks

Fired before/after navigation operations.

```typescript
onBeforePush:    // Before page is pushed
onAfterPush:     // After page is pushed
onBeforePop:     // Before page is popped
onAfterPop:      // After page is popped
onBeforeReplace: // Before page is replaced
onAfterReplace:  // After page is replaced
```

### Lifecycle Flow Example: Multi-Tab App

```
User opens app → Feed tab active:
  Feed page receives: onEnter

User scrolls Feed, then clicks Profile tab:
  Feed page receives: onPause (reason: 'group-switch')
  Profile page receives: onEnter

User navigates within Profile (Profile → UserDetails):
  Profile page receives: onPause (reason: 'page-hidden')
  UserDetails page receives: onEnter

User clicks back in UserDetails:
  UserDetails page receives: onExit
  Profile page receives: onResume (reason: 'page-shown')

User switches back to Feed tab:
  Profile page receives: onPause (reason: 'group-switch')
  Feed page receives: onResume (reason: 'group-switch')
  
  🎉 Scroll position RESTORED automatically!
  Feed is exactly where user left it!
```

---

## API Reference

### Navigation Operations

#### `push(key, params?, metadata?): Promise<boolean>`

Add page to top of stack. Page becomes immediately visible.

```typescript
// Simple push
await nav.push('profile');

// With parameters
await nav.push('profile', { userId: 123 });

// With metadata
await nav.push('profile', { userId: 123 }, { animated: true });
```

**Returns**: `true` if successful, `false` if guard blocked

**Fires Events**:
1. `onBeforePush`
2. `onEnter` (new page)
3. `onAfterPush`

#### `pop(): Promise<boolean>`

Remove top page from stack. Reveals page below.

```typescript
const success = await nav.pop();
if (!success) {
  console.log('Stack is empty or pop was blocked');
}
```

**Returns**: `true` if successful, `false` if stack empty

**Fires Events**:
1. `onBeforePop`
2. `onExit` (removed page)
3. `onAfterPop`

#### `replace(key, params?, metadata?): Promise<boolean>`

Replace top page with new page. Stack size unchanged.

```typescript
// Replace current page with new one
await nav.replace('settings', { tab: 'privacy' });
```

**Fires Events**:
1. `onExit` (old page)
2. `onEnter` (new page)
3. `onAfterReplace`

#### `go(key, params?, metadata?): Promise<boolean>`

Clear entire stack and navigate to new page.

```typescript
// Clear everything and start fresh
await nav.go('home');
```

**Use for**: Major navigation changes, resetting app state

#### `popToRoot(): Promise<boolean>`

Remove all pages except first.

```typescript
// Go back to initial page
await nav.popToRoot();
```

### Stack Inspection

#### `peek(): StackEntry | undefined`

Get top page without removing.

```typescript
const currentPage = nav.peek();
console.log(currentPage?.key); // 'profile'
```

#### `getStack(): StackEntry[]`

Get copy of entire stack.

```typescript
const stack = nav.getStack();
console.log(stack.map(e => e.key)); // ['home', 'profile', 'settings']
```

#### `length(): number`

Get number of pages in stack.

```typescript
if (nav.length() === 0) {
  // Stack is empty
}
```

#### `isTop(uid?: string): boolean`

Check if page is currently at top.

```typescript
const currentPage = nav.peek();
if (nav.isTop(currentPage?.uid)) {
  // This page is at top
}

// Inside a page component
if (nav.isTop()) {
  // This component is the top page
}
```

### Lifecycle Registration

All lifecycle hooks return an unsubscribe function:

```typescript
// Register
const unsubscribe = nav.addOnEnter((context) => {
  console.log('Page entered');
});

// Cleanup
unsubscribe(); // Stops listening
```

### Object Management

#### `provideObject<T>(key, getter, options?): () => void`

Register object available to other pages.

```typescript
const userData = { id: 123, name: 'John' };

nav.provideObject('userData', () => userData, {
  global: true  // Available to any stack
});
```

**Options**:
- `global?: boolean` - Available across all stacks
- `stack?: boolean` - Stack-scoped
- `scope?: string` - Custom scope

#### `getObject<T>(key, options?): T | undefined`

Retrieve provided object.

```typescript
const userData = nav.getObject('userData', { global: true });
if (userData) {
  console.log(userData.name);
}
```

#### `hasObject(key, options?): boolean`

Check if object exists.

```typescript
if (nav.hasObject('userData')) {
  // Object is available
}
```

#### `removeObject(key): void`

Unregister object.

```typescript
nav.removeObject('userData');
```

### Guards & Middleware

#### `registerGuard(fn): () => void`

Permission check for all navigation. Return `false` to block.

```typescript
nav.registerGuard(async (action) => {
  if (action.to?.key === 'premium') {
    const isAuth = await checkAuthentication();
    if (!isAuth) {
      alert('Please login first');
      return false; // Block navigation
    }
  }
  return true; // Allow navigation
});
```

#### `registerMiddleware(fn): () => void`

Side effect handler for all navigation. Called after successful navigation.

```typescript
nav.registerMiddleware((action) => {
  analytics.track('navigation', {
    from: action.from?.key,
    to: action.to?.key,
    type: action.type
  });
});
```

#### `subscribe(fn): () => void`

Listen to stack changes.

```typescript
nav.subscribe((stack) => {
  console.log('Stack changed:', stack.map(e => e.key));
});
```

---

## Usage Examples

### Example 1: Basic Navigation

```typescript
'use client';

import { NavigationStack, useNav } from '@/lib/NavigationStack';

// Define your routes
const routes = {
  'home': HomePage,
  'profile': ProfilePage,
  'settings': SettingsPage,
};

// App component
export function MyApp() {
  return (
    <NavigationStack id='main-stack' routes={routes}>
      {/* Pages render here */}
    </NavigationStack>
  );
}

// Page component
export function HomePage() {
  const nav = useNav();
  
  return (
    <div>
      <h1>Home</h1>
      <button onClick={() => nav.push('profile')}>
        Go to Profile
      </button>
    </div>
  );
}

export function ProfilePage() {
  const nav = useNav();
  
  return (
    <div>
      <h1>Profile</h1>
      <button onClick={() => nav.pop()}>Go Back</button>
      <button onClick={() => nav.push('settings')}>Settings</button>
    </div>
  );
}
```

### Example 2: Lifecycle Management

```typescript
import { useNav, usePageLifecycle } from '@/lib/NavigationStack';

export function DataDetailsPage({ id }: { id: string }) {
  const nav = useNav();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Register lifecycle events
  usePageLifecycle(nav, {
    onEnter: async ({ current }) => {
      console.log('Page entered, loading data...');
      setIsLoading(true);
      try {
        const response = await fetch(`/api/data/${id}`);
        const json = await response.json();
        setData(json);
      } finally {
        setIsLoading(false);
      }
    },

    onExit: ({ previous }) => {
      console.log('Page exiting, cleaning up...');
      // Cancel pending requests
      // Save draft
      // Close connections
    },

    onPause: ({ reason }) => {
      if (reason === 'group-switch') {
        console.log('Paused: switched to another tab');
      }
      // Pause animations or videos
    },

    onResume: ({ reason }) => {
      if (reason === 'group-switch') {
        console.log('Resumed: back to this tab');
        // Refresh data that might have changed
      }
      // Resume animations or videos
    },
  }, [id]);

  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <h1>{data?.title}</h1>
      <button onClick={() => nav.pop()}>Go Back</button>
    </div>
  );
}
```

### Example 3: Tabbed Navigation (Groups)

```typescript
import { NavigationGroupProvider, NavigationStack } from '@/lib/NavigationStack';

export function TabbedApp() {
  const [activeGroup, setActiveGroup] = useState('feed');

  return (
    <NavigationGroupProvider>
      <div style={{ display: 'flex', height: '100%' }}>
        {/* Feed Stack */}
        <div style={{ flex: 1, display: activeGroup === 'feed' ? 'block' : 'none' }}>
          <NavigationStack 
            id='feed-stack' 
            routes={feedRoutes}
            group='main'
          >
            Feed Stack
          </NavigationStack>
        </div>

        {/* Profile Stack */}
        <div style={{ flex: 1, display: activeGroup === 'profile' ? 'block' : 'none' }}>
          <NavigationStack 
            id='profile-stack' 
            routes={profileRoutes}
            group='main'
          >
            Profile Stack
          </NavigationStack>
        </div>

        {/* Settings Stack */}
        <div style={{ flex: 1, display: activeGroup === 'settings' ? 'block' : 'none' }}>
          <NavigationStack 
            id='settings-stack' 
            routes={settingsRoutes}
            group='main'
          >
            Settings Stack
          </NavigationStack>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '10px', padding: '10px' }}>
        <button 
          onClick={() => setActiveGroup('feed')}
          style={{ fontWeight: activeGroup === 'feed' ? 'bold' : 'normal' }}
        >
          Feed
        </button>
        <button 
          onClick={() => setActiveGroup('profile')}
          style={{ fontWeight: activeGroup === 'profile' ? 'bold' : 'normal' }}
        >
          Profile
        </button>
        <button 
          onClick={() => setActiveGroup('settings')}
          style={{ fontWeight: activeGroup === 'settings' ? 'bold' : 'normal' }}
        >
          Settings
        </button>
      </div>
    </NavigationGroupProvider>
  );
}

// Pages receive pause/resume when tabs switch
export function FeedPage() {
  const nav = useNav();

  usePageLifecycle(nav, {
    onPause: ({ reason }) => {
      if (reason === 'group-switch') {
        console.log('Feed tab became inactive');
      }
    },
    onResume: ({ reason }) => {
      if (reason === 'group-switch') {
        console.log('Feed tab became active again');
        // Scroll position restored automatically!
      }
    },
  }, []);

  return <div>Feed Page (scroll position persisted)</div>;
}
```

### Example 4: Dependency Injection

```typescript
// Page 1: Provide Data
export function UserListPage() {
  const nav = useNav();
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  const goToUserDetail = (userId: number) => {
    nav.pushWith('user-detail', { userId }, {
      provideObjects: {
        'currentUser': () => users.find(u => u.id === userId),
      }
    });
  };

  return (
    <div>
      {users.map(user => (
        <button key={user.id} onClick={() => goToUserDetail(user.id)}>
          {user.name}
        </button>
      ))}
    </div>
  );
}

// Page 2: Consume Data
export function UserDetailPage() {
  const userObj = useObject('currentUser');

  if (!userObj.isProvided) {
    return <div>No user data available</div>;
  }

  const user = userObj.getter();

  return (
    <div>
      <h1>{user.name}</h1>
      <p>ID: {user.id}</p>
    </div>
  );
}
```

### Example 5: Guards & Permissions

```typescript
export function ProtectedApp() {
  const nav = useNav();

  // Register guard to check permissions
  nav.registerGuard(async (action) => {
    // Example: Check if user can access premium pages
    if (action.to?.key === 'premium-feature') {
      const hasPremium = await checkPremiumStatus();
      if (!hasPremium) {
        alert('This feature requires premium subscription');
        return false;
      }
    }

    // Example: Confirm before deleting
    if (action.to?.key === 'delete-confirmation') {
      const confirmed = window.confirm('Are you sure?');
      return confirmed;
    }

    return true; // Allow
  });

  return <div>App with permissions</div>;
}
```

### Example 6: Request/Response Pattern

```typescript
// Provider Page
export function DataProviderPage() {
  const nav = useNav();

  // Register handler
  nav.provideRequestHandler('fetchUserData', async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  }, { global: true });

  return <div>Data Provider</div>;
}

// Consumer Page
export function UserDetailsPage({ userId }: { userId: string }) {
  const nav = useNav();
  const [user, setUser] = useState(null);

  useEffect(() => {
    (async () => {
      const userData = await nav.sendRequest('fetchUserData', userId);
      setUser(userData);
    })();
  }, [userId]);

  return <div>{user?.name}</div>;
}
```

---

## Advanced Patterns

### Pattern 1: Form Drafts with Auto-Save

```typescript
export function FormPage() {
  const nav = useNav();
  const [form, setForm] = useState({ name: '', email: '' });

  usePageLifecycle(nav, {
    onExit: () => {
      // Save draft before leaving
      localStorage.setItem('form-draft', JSON.stringify(form));
    },
  }, [form]);

  useEffect(() => {
    // Load draft on enter
    const draft = localStorage.getItem('form-draft');
    if (draft) {
      setForm(JSON.parse(draft));
    }
  }, []);

  return (
    <form>
      <input 
        value={form.name}
        onChange={(e) => setForm({...form, name: e.target.value})}
      />
      <input 
        value={form.email}
        onChange={(e) => setForm({...form, email: e.target.value})}
      />
    </form>
  );
}
```

### Pattern 2: Multi-Step Wizard

```typescript
const steps = ['personal', 'address', 'payment', 'review'];

export function WizardPage() {
  const nav = useNav();
  const [currentStep, setCurrentStep] = useState(0);

  const goNext = async () => {
    if (currentStep < steps.length - 1) {
      await nav.push('wizard-step', { step: currentStep + 1 });
    }
  };

  const goBack = async () => {
    if (currentStep > 0) {
      await nav.pop();
    }
  };

  return (
    <div>
      <h2>{steps[currentStep]}</h2>
      <button onClick={goBack} disabled={currentStep === 0}>Back</button>
      <button onClick={goNext} disabled={currentStep === steps.length - 1}>Next</button>
    </div>
  );
}
```

---

## Performance & Optimization

### 1. Memory Management

**Problem**: Too many pages accumulate in memory

**Solution**:
```typescript
// Limit stack size
const maxStackSize = 50; // Clear old pages

// Manually clear when needed
nav.popToRoot(); // Go back to start

// Use PageMemoryManager to cache pages
```

### 2. Prevent Re-renders

**Problem**: Pages re-render excessively

**Solution**:
```typescript
// Memoize callbacks
const callbacks = useMemo(() => ({
  onEnter: () => { /* ... */ }
}), []);

usePageLifecycle(nav, callbacks);

// Memoize components
export const ProfilePage = React.memo(function ProfilePage() {
  // Component only re-renders if props change
  return <div>Profile</div>;
});
```

### 3. Lazy Load Pages

```typescript
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <NavigationStack routes={{ profile: ProfilePage }} />
    </Suspense>
  );
}
```

### 4. Scroll Restoration

Automatic! The `useGroupScopedScrollRestoration` hook handles it:
- Saves scroll position when navigating away
- Restores scroll position when returning
- Works per-group (each tab has own scroll)

---

## Troubleshooting

### Issue: onEnter fires multiple times

**Cause**: Creating new callback object on every render

**Solution**:
```typescript
// ❌ Bad: New object every render
usePageLifecycle(nav, {
  onEnter: () => { /* ... */ }
});

// ✅ Good: Stable object
const callbacks = useMemo(() => ({
  onEnter: () => { /* ... */ }
}), []);

usePageLifecycle(nav, callbacks);
```

### Issue: Cannot access useNav() outside component

**Cause**: Using outside NavigationStack context

**Solution**:
```typescript
// ❌ Bad: Outside NavigationStack
const api = useNav(); // Error!

// ✅ Good: Inside NavigationStack
function MyPage() {
  const nav = useNav(); // Works!
}
```

### Issue: State lost when navigating

**Cause**: Not using persistent state management

**Solution**: Pair with StateStack for persistence

```typescript
import { createStateStack } from '@/lib/state-stack';

const usePageState = createStateStack({
  key: 'myPage',
  scope: 'pages',
  persist: true  // Save to storage
});
```

### Issue: Race conditions in guards

**Cause**: Multiple navigation calls happening simultaneously

**Solution**: NavigationStack handles this automatically with lock mechanism

```typescript
// Safe: Lock prevents concurrent operations
await nav.push('page1');
await nav.push('page2'); // Waits for first to complete
```

---

## Summary

NavigationStack excels at:
- ✅ Complex multi-stack navigation
- ✅ Page lifecycle management
- ✅ Group-based visibility tracking
- ✅ Scroll position restoration
- ✅ Dependency injection between pages
- ✅ Race condition prevention

