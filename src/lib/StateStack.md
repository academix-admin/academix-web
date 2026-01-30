# StateStack - Comprehensive Documentation

> A production-ready React state management library with automatic persistence, cross-tab synchronization, undo/redo history, and demand-based loading.

**Table of Contents**
1. [Introduction](#introduction)
2. [Architecture](#architecture)
3. [Core Concepts](#core-concepts)
4. [Storage System](#storage-system)
5. [API Reference](#api-reference)
6. [Hooks Reference](#hooks-reference)
7. [Usage Examples](#usage-examples)
8. [Common Patterns](#common-patterns)
9. [Performance & Optimization](#performance--optimization)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is StateStack?

StateStack is a sophisticated state management library designed to handle the complexity of managing application state in modern React apps. It solves problems that other solutions often miss:

- **Automatic persistence** - State survives page refresh
- **Cross-tab synchronization** - Changes sync between browser tabs instantly
- **Undo/redo history** - Track and revert state changes
- **TTL (Time-to-Live)** - Auto-expire state after time limit
- **Demand loading** - Load state only when needed
- **Reactive atoms** - Granular state updates
- **Flexible storage** - IndexedDB + localStorage with auto-fallback

### Key Features

| Feature | Description |
|---------|-------------|
| **Persistent State** | State automatically saved to IndexedDB/localStorage |
| **Cross-Tab Sync** | Changes sync between browser tabs instantly |
| **Undo/Redo** | Full history tracking with configurable depth |
| **TTL** | Auto-expire state after specified duration |
| **Demand Loading** | Lazy-load state on-demand with promises |
| **Atoms** | Granular reactive state units |
| **Computed Values** | Derived state without storage |
| **Custom Hooks** | useToggle, useList, useComputed, etc. |
| **SSR Safe** | Works in server-side rendering contexts |
| **Storage Adapters** | Pluggable storage backends |

### File Statistics

```
File: src/lib/state-stack.tsx
Lines: ~1545
Complexity: Medium (sophisticated but readable)
Key Classes: 2 (StateStackCore, IndexedDBAdapter)
Key Hooks: 5+
Exported Types/Functions: 15+
```

---

## Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│         React Components (Your App)                         │
│                                                              │
│  useAtom() useStateStack() useDemandState() ...              │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              State Stack Hooks Layer                        │
│  useSyncExternalStore integration with React               │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│          StateStackCore (Singleton)                         │
│                                                              │
│  Core Operations:                                            │
│  • setState(scope, key, value)                              │
│  • getState(scope, key)                                     │
│  • undo/redo management                                     │
│  • TTL timers                                               │
│  • Hydration coordination                                   │
│  • Cross-tab sync via storage events                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│           Storage Adapter Layer                             │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐ │
│  │IndexedDBAdapter     │  │ LocalStorageAdapter          │ │
│  │• Large data (>1MB)  │  │ • Small data (<100KB)        │ │
│  │• Better performance │  │ • Maximum compatibility      │ │
│  │• Async operations   │  │ • Synchronous                │ │
│  └─────────────────────┘  └──────────────────────────────┘ │
│                                                              │
│  Smart Adapter: Tries IndexedDB first, falls back to        │
│  localStorage if needed                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│        Browser Storage & Memory                             │
│                                                              │
│  • IndexedDB: up to 50MB+ (persistent)                      │
│  • localStorage: 5-10MB per domain (persistent)             │
│  • Memory cache: Runtime state (fast)                       │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

#### Setting State

```
setStateValue(scope, key, newValue)
        ↓
StateStackCore.setState()
        ↓
onBeforeChange hook (can throw to prevent)
        ↓
Notify subscribers (UI re-renders)
        ↓
Persist to storage adapter
        ↓
Broadcast to other tabs (storage event)
        ↓
onAfterChange hook
```

#### Getting State

```
getStateValue(scope, key)
        ↓
Check memory cache (fast)
        ↓
If not loaded:
  ├─ ensureHydrated(scope, key)
  ├─ Load from storage adapter
  └─ Notify hydration complete
        ↓
Return value
```

---

## Core Concepts

### Scope

A namespace for grouping related state.

```typescript
// Examples
const [user, setUser] = useAtom('userData', {}, { scope: 'user' });
const [settings, setSettings] = useAtom('appSettings', {}, { scope: 'settings' });
const [cache, setCache] = useAtom('apiCache', {}, { scope: 'cache' });

// Organize related state by scope
```

### Hydration

Loading persisted state on app startup. StateStack coordinates hydration to avoid race conditions.

```typescript
const [value, setValue, { isHydrating }] = useStateStack({
  key: 'myState',
  initial: { count: 0 },
  persist: true
});

if (isHydrating) {
  return <LoadingScreen />; // Wait for state to load
}
```

### History & Undo/Redo

Automatic tracking of state changes with configurable depth.

```typescript
const [value, setValue, { undo, redo }] = useStateStack({
  key: 'formData',
  initial: {},
  maxHistory: 20  // Keep 20 undo states
});

// Every change tracked automatically
setValue(newValue);

// Can undo/redo
undo();
redo();
```

### TTL (Time-To-Live)

State auto-expires after specified duration.

```typescript
const [otp, setOtp] = useStateStack({
  key: 'otp',
  initial: null,
  ttl: 5 * 60 * 1000  // 5 minutes
  // After 5 minutes, automatically expires
});
```

### Cross-Tab Sync

Changes automatically broadcast to other browser tabs.

```
Tab 1: setState(newValue)
         ↓
    Persist to storage
         ↓
    Storage event fired
         ↓
Tab 2: Receives event, updates state
Tab 3: Receives event, updates state

All tabs now have the same state! ✨
```

### Atoms

Granular state units. Similar to Recoil but lighter weight.

```typescript
// Each atom is independent
const [count, setCount] = useAtom('counter', 0);
const [isDarkMode, setDarkMode] = useAtom('darkMode', false);
const [todos, setTodos] = useAtom('todos', []);

// Only components using that atom re-render
// Other components unaffected
```

### Computed Values

Derived state computed on-demand without storage.

```typescript
const [todos, setTodos] = useAtom('todos', []);

const completedCount = useComputed(
  () => todos.filter(t => t.completed).length,
  0,
  [todos]
);

// Recomputes when todos changes
// Not stored, just calculated
```

---

## Storage System

### Storage Adapters

#### 1. Smart Default Adapter (Recommended)

```typescript
initStateStack({
  preferredStorage: 'auto'  // Default
});
```

- Tries IndexedDB first (unlimited space, async)
- Falls back to localStorage (5-10MB, sync)
- Works everywhere

#### 2. IndexedDB Only

```typescript
initStateStack({
  preferredStorage: 'indexeddb'
});
```

**Best for**:
- Large datasets (> 1MB)
- Complex nested objects
- High-frequency updates

**Limitations**:
- Not available in private browsing
- Async operations

#### 3. localStorage Only

```typescript
initStateStack({
  preferredStorage: 'localstorage'
});
```

**Best for**:
- Small config objects (< 100KB)
- Settings, preferences
- Maximum compatibility

**Limitations**:
- ~5-10MB total per domain
- Synchronous (slower)
- Not available in private mode on some browsers

#### 4. No Persistence

```typescript
createStateStack({
  key: 'tempData',
  persist: false  // Memory only
});
```

**Best for**:
- Temporary state
- Sensitive data (never persisted)
- Real-time data

### Storage Quota

```
IndexedDB:
  • Chrome: 50MB default, up to 90% disk space
  • Firefox: 50MB default
  • Safari: 50MB default
  • Edge: Same as Chrome

localStorage:
  • Most browsers: 5-10MB per domain
  • IE: 10MB per domain
```

### Check Storage Usage

```typescript
if (navigator.storage?.estimate) {
  const estimate = await navigator.storage.estimate();
  const used = estimate.usage;
  const quota = estimate.quota;
  const percentUsed = (used / quota) * 100;
  console.log(`Using ${percentUsed.toFixed(2)}% of quota`);
}
```

### Custom Storage Adapter

```typescript
interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear?(): Promise<void>;
  getAllKeys?(): Promise<string[]>;
}

// Implement your own
const myAdapter: StorageAdapter = {
  async getItem(key) {
    // Custom implementation
  },
  // ... implement other methods
};

initStateStack({
  defaultStorageAdapter: myAdapter
});
```

---

## API Reference

### Initialization

#### `initStateStack(options?): void`

Configure StateStack globally.

```typescript
import { initStateStack } from '@/lib/state-stack';

initStateStack({
  storagePrefix: 'myapp',              // Prefix all keys
  preferredStorage: 'auto',            // 'auto' | 'indexeddb' | 'localstorage'
  debug: true,                         // Enable debug logging
  crossTabSync: true                   // Sync between tabs
});
```

### State Creation

#### `createStateStack<T>(config): UseStateStack<T>`

Create a reusable state stack.

```typescript
const useUserState = createStateStack({
  key: 'user',
  scope: 'user',
  initial: { name: '', email: '' },
  persist: true,
  maxHistory: 10,
  ttl: 24 * 60 * 60 * 1000,  // 24 hours
  
  // Lifecycle hooks
  onBeforeChange: (oldValue, newValue) => {
    console.log('Changing from', oldValue, 'to', newValue);
  },
  onAfterChange: (newValue) => {
    console.log('Changed to', newValue);
  },
  onHydration: (value) => {
    console.log('Loaded from storage', value);
  },
  onCrossTabSync: (value) => {
    console.log('Synced from another tab', value);
  }
});

// Use in component
function MyComponent() {
  const [user, setUser, { undo, redo, reset, isHydrating }] = useUserState();
  
  return <div>{user.name}</div>;
}
```

---

## Hooks Reference

### useStateStack<T>(config): [T, SetValue<T>, Utils]

Core hook for managed state.

```typescript
const [value, setValue, { undo, redo, reset, isHydrating }] = useStateStack({
  key: 'myState',
  scope: 'myScope',
  initial: {},
  persist: true,
  maxHistory: 10
});
```

**Returns**:
- `value` - Current state value
- `setValue` - Function to update state
- `undo` - Undo last change
- `redo` - Redo undone change
- `reset` - Reset to initial value
- `isHydrating` - Whether loading from storage

### useAtom<T>(key, initial, options?): [T, SetValue<T>]

Simple atomic state (like useState but persistent).

```typescript
const [count, setCount] = useAtom('counter', 0);
const [isDarkMode, setDarkMode] = useAtom('darkMode', false);
const [todos, setTodos] = useAtom('todos', []);

// State persists and syncs across tabs!
```

**Options**:
```typescript
{
  scope?: string;          // Namespace for state
  persist?: boolean;       // Save to storage (default: true)
  storage?: StorageAdapter; // Custom storage
}
```

### useComputed<T>(compute, defaultValue, deps?): T

Derived state computed on-demand.

```typescript
const [todos, setTodos] = useAtom('todos', []);

const completedCount = useComputed(
  () => todos.filter(t => t.completed).length,
  0,  // default if compute fails
  [todos]  // dependencies
);

const remainingCount = useComputed(
  () => todos.length - completedCount,
  0,
  [todos, completedCount]
);
```

**Not stored** - only calculated when accessed.

### useDemandState<T>(key, loader): [T, SetValue<T>, Utils]

Lazy-load state on demand with promise.

```typescript
const [data, setData, { isLoading, error, retry }] = useDemandState(
  'largeDataset',
  async () => {
    const response = await fetch('/api/large-dataset');
    return response.json();
  }
);

if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} onRetry={retry} />;

return <DataGrid data={data} />;
```

**Features**:
- Loads only when component mounts
- Caches result automatically
- Handles errors gracefully
- Can retry on failure

### useToggle(initial?: boolean): [boolean, () => void]

Boolean toggle state.

```typescript
const [isVisible, toggle] = useToggle(false);

return (
  <>
    <button onClick={toggle}>
      {isVisible ? 'Hide' : 'Show'}
    </button>
    {isVisible && <Content />}
  </>
);
```

### useList<T>(initial?: T[]): [T[], ListUtils<T>]

Array state with helper methods.

```typescript
const [todos, { add, remove, update, clear, filter, map }] = useList<Todo>([]);

// Add item
add({ id: 1, title: 'New todo', completed: false });

// Remove item
remove(todo => todo.id === 1);

// Update item
update(todo => todo.id === 1, { completed: true });

// Clear all
clear();

// Filter
const completed = filter(t => t.completed);

// Map
const titles = map(t => t.title);
```

---

## Usage Examples

### Example 1: Basic State

```typescript
import { useAtom } from '@/lib/state-stack';

export function Counter() {
  const [count, setCount] = useAtom('counter', 0);
  
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <button onClick={() => setCount(count - 1)}>Decrement</button>
    </div>
  );
}

// Count persists and syncs across tabs!
```

### Example 2: Form with Undo

```typescript
import { createStateStack } from '@/lib/state-stack';

const useFormState = createStateStack({
  key: 'contactForm',
  scope: 'forms',
  initial: { name: '', email: '', message: '' },
  persist: true,
  maxHistory: 20
});

export function ContactForm() {
  const [form, setForm, { undo, redo, reset }] = useFormState();

  return (
    <form>
      <input 
        value={form.name}
        onChange={(e) => setForm({...form, name: e.target.value})}
        placeholder="Name"
      />
      <input 
        value={form.email}
        onChange={(e) => setForm({...form, email: e.target.value})}
        placeholder="Email"
      />
      <textarea 
        value={form.message}
        onChange={(e) => setForm({...form, message: e.target.value})}
        placeholder="Message"
      />
      
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
      <button onClick={reset}>Clear</button>
      <button onClick={() => submitForm(form)}>Send</button>
    </form>
  );
}

// Draft auto-saved! User can edit, refresh page, and continue
```

### Example 3: Cross-Tab Sync

```typescript
import { useAtom } from '@/lib/state-stack';

export function UserPreferences() {
  // All tabs share this state automatically!
  const [isDarkMode, setDarkMode] = useAtom('darkMode', false);
  const [language, setLanguage] = useAtom('language', 'en');

  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={isDarkMode}
          onChange={(e) => setDarkMode(e.target.checked)}
        />
        Dark Mode
      </label>
      
      <select 
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="es">Español</option>
        <option value="fr">Français</option>
      </select>
    </div>
  );
}

// Change in one tab → changes in all tabs instantly!
```

### Example 4: TTL Auto-Expire

```typescript
import { createStateStack } from '@/lib/state-stack';

const useOTPState = createStateStack({
  key: 'otp',
  scope: 'auth',
  initial: { code: '', expiresAt: null },
  persist: false,  // Don't persist sensitive data
  ttl: 5 * 60 * 1000  // 5 minutes
});

export function OTPVerification() {
  const [otp, setOtp] = useOTPState();

  useEffect(() => {
    // Trigger OTP send
    sendOTP();
    
    // Set expiry time
    setOtp({
      code: '',
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    
    // After 5 minutes, state auto-clears
    // onExpire hook fires
  }, []);

  return (
    <div>
      <input 
        type="text"
        placeholder="Enter OTP"
        value={otp.code}
        onChange={(e) => setOtp({...otp, code: e.target.value})}
      />
      <p>Expires at: {new Date(otp.expiresAt).toLocaleTimeString()}</p>
    </div>
  );
}
```

### Example 5: Computed Values

```typescript
import { useAtom, useComputed } from '@/lib/state-stack';

export function Leaderboard() {
  const [players, setPlayers] = useAtom('players', [
    { name: 'Alice', score: 150 },
    { name: 'Bob', score: 120 },
    { name: 'Charlie', score: 200 },
  ]);

  // Sorted list (computed, not stored)
  const sorted = useComputed(
    () => [...players].sort((a, b) => b.score - a.score),
    [],
    [players]
  );

  // Top 3 (computed from computed)
  const topThree = useComputed(
    () => sorted.slice(0, 3),
    [],
    [sorted]
  );

  return (
    <div>
      <h2>Top Players</h2>
      {topThree.map((player, i) => (
        <div key={i}>
          #{i + 1} {player.name}: {player.score} points
        </div>
      ))}
    </div>
  );
}

// Recomputes whenever players changes
// Sorting happens in real-time
```

### Example 6: Lazy Loading

```typescript
import { useDemandState } from '@/lib/state-stack';

export function SearchResults({ query }: { query: string }) {
  const [results, setResults, { isLoading, error, retry }] = useDemandState(
    `search-${query}`,
    async () => {
      const response = await fetch(`/api/search?q=${query}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    }
  );

  if (isLoading) {
    return <div className="spinner">Searching...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Search failed: {error.message}</p>
        <button onClick={retry}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      <p>{results.length} results found</p>
      {results.map(result => (
        <div key={result.id}>{result.title}</div>
      ))}
    </div>
  );
}

// Data only loads when query changes
// Results cached automatically
```

### Example 7: Todo List

```typescript
import { useList } from '@/lib/state-stack';

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

export function TodoApp() {
  const [todos, { add, remove, update }] = useList<Todo>([]);

  const handleAdd = (title: string) => {
    add({
      id: Date.now(),
      title,
      completed: false
    });
  };

  const handleToggle = (id: number) => {
    update(
      t => t.id === id,
      todo => ({ ...todo, completed: !todo.completed })
    );
  };

  const handleDelete = (id: number) => {
    remove(t => t.id === id);
  };

  const completed = todos.filter(t => t.completed).length;

  return (
    <div>
      <h1>Todos</h1>
      <p>{completed} of {todos.length} completed</p>
      
      <NewTodoForm onAdd={handleAdd} />
      
      {todos.map(todo => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => handleToggle(todo.id)}
          />
          <span style={{
            textDecoration: todo.completed ? 'line-through' : 'none'
          }}>
            {todo.title}
          </span>
          <button onClick={() => handleDelete(todo.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// All changes persisted and synced across tabs!
```

---

## Common Patterns

### Pattern 1: Session Persistence

```typescript
const useAuthState = createStateStack({
  key: 'auth',
  scope: 'auth',
  initial: { token: null, user: null, isLoggedIn: false },
  persist: true,
  ttl: 24 * 60 * 60 * 1000  // 24 hours
});

// User stays logged in after browser restart
// But auto-logs out after 24 hours (refreshing token)
```

### Pattern 2: API Response Cache

```typescript
export function useApiCache(url: string) {
  const [cached, setCached] = useAtom(
    `api-cache-${url}`,
    null,
    { scope: 'cache', persist: true }
  );

  const [isLoading, setIsLoading] = useState(false);

  const fetch = async () => {
    if (cached) return cached; // Use cache if available
    
    setIsLoading(true);
    try {
      const response = await fetch(url);
      const data = await response.json();
      setCached(data);
      return data;
    } finally {
      setIsLoading(false);
    }
  };

  return { cached, fetch, isLoading };
}
```

### Pattern 3: Multi-Step Wizard

```typescript
const useWizardState = createStateStack({
  key: 'wizard',
  scope: 'forms',
  initial: {
    step: 1,
    personal: {},
    address: {},
    payment: {},
  },
  persist: true,
  maxHistory: 10
});

export function Wizard() {
  const [wizard, setWizard, { undo }] = useWizardState();

  const goBack = () => undo();
  
  const goNext = () => {
    setWizard({
      ...wizard,
      step: wizard.step + 1
    });
  };

  // User can refresh page and continue where they left off!
}
```

### Pattern 4: Filter/Search State

```typescript
const useFilterState = createStateStack({
  key: 'filters',
  scope: 'search',
  initial: {
    category: 'all',
    priceRange: [0, 1000],
    sortBy: 'name'
  },
  persist: true
});

export function SearchFilters() {
  const [filters, setFilters] = useFilterState();

  // Filters persist even after page refresh
  // User's search state preserved
}
```

---

## Performance & Optimization

### 1. Batch Updates

**Problem**: Multiple updates trigger multiple persists

**Solution**:
```typescript
// ❌ Bad: Multiple updates
setUser({ name: newName });
setUser({ email: newEmail });
setUser({ bio: newBio });

// ✅ Good: Single update
setUser({
  name: newName,
  email: newEmail,
  bio: newBio
});
```

### 2. Split State

**Problem**: All components re-render when any state changes

**Solution**:
```typescript
// ❌ Bad: All state in one atom
const [appState, setAppState] = useAtom('appState', {
  user: {},
  settings: {},
  cache: {}
});

// ✅ Good: Separate atoms
const [user, setUser] = useAtom('user', {});
const [settings, setSettings] = useAtom('settings', {});
const [cache, setCache] = useAtom('cache', {});

// Only affected component re-renders
```

### 3. Use Computed for Derived Data

**Problem**: Storing derived data wastes storage

**Solution**:
```typescript
// ❌ Bad: Storing derived data
const [todos, setTodos] = useAtom('todos', []);
const [completedCount, setCompletedCount] = useAtom('completedCount', 0);

// ✅ Good: Compute derived data
const [todos, setTodos] = useAtom('todos', []);
const completedCount = useComputed(
  () => todos.filter(t => t.completed).length,
  0,
  [todos]
);
```

### 4. Don't Persist Temporary Data

**Problem**: Temporary state clutters storage

**Solution**:
```typescript
// ❌ Bad: Persisting everything
const [searchInput, setSearchInput] = useAtom('searchInput', '');

// ✅ Good: Don't persist temporary state
const [searchInput, setSearchInput] = useAtom('searchInput', '', {
  persist: false
});
```

### 5. Prioritize Hydration

**Problem**: App sluggish while loading all state

**Solution**:
```typescript
export function App() {
  const [user, setUser, { isHydrating: userHydrating }] = useAtom('user', {});
  const [cache, setCache, { isHydrating: cacheHydrating }] = useAtom('cache', {});

  if (userHydrating) {
    // Only wait for critical state
    return <SplashScreen />;
  }

  // Cache loads in background
  return <MainApp />;
}
```

---

## Troubleshooting

### Issue: State not persisting

**Cause**: Persistence disabled

**Solution**:
```typescript
// ✅ Enable persistence
const [value, setValue] = useAtom('key', initial, { persist: true });
```

### Issue: Changes not syncing between tabs

**Cause**: Cross-tab sync disabled

**Solution**:
```typescript
initStateStack({
  crossTabSync: true  // Ensure enabled
});
```

### Issue: Memory leaks in hydration

**Cause**: Hydration promises not cleaned up

**Solution**: StateStack handles this automatically. Just ensure proper cleanup in effects:

```typescript
useEffect(() => {
  return () => {
    // Cleanup subscriptions
  };
}, []);
```

### Issue: Storage quota exceeded

**Cause**: Storing too much data

**Solution**:
```typescript
// Don't persist large datasets
const [largeData, setLargeData] = useDemandState(
  'largeData',
  async () => { /* fetch */ },
  { persist: false }  // Load on-demand instead
);
```

### Issue: Slow persistence

**Cause**: Using localStorage for large data

**Solution**:
```typescript
initStateStack({
  preferredStorage: 'indexeddb'  // Use IndexedDB for large data
});
```

---

## Summary

StateStack excels at:
- ✅ Persistent state management
- ✅ Cross-tab synchronization
- ✅ Undo/redo functionality
- ✅ Automatic expiration (TTL)
- ✅ Demand-based loading
- ✅ Granular atomic state
