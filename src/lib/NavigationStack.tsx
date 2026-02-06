'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useState,
  ReactNode,
  ReactElement,
  useContext,
  createContext,
  lazy,
  Suspense,
  ComponentType,
  useLayoutEffect
} from "react";

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useEffect : () => {};

// ==================== Types ====================
type NavParams = Record<string, any> | undefined;
type LazyComponent = Promise<{ default: ComponentType<any> }>;
type TransitionState = "enter" | "idle" | "exit" | "done";
type ParsedStack = { code: string; params?: NavParams }[];

export type StackEntry = {
  // uid format: "groupId:stackId:pageUid" (composite key for scroll restoration)
  uid: string;
  key: string;
  params?: NavParams;
  metadata?: {
    title?: string;
    icon?: ReactNode;
    breadcrumb?: string;
    lazy?: () => LazyComponent;
  };
};

type StackChangeListener = (stack: StackEntry[]) => void;
type RenderRecord = {
  entry: StackEntry;
  state: TransitionState;
  createdAt: number;
};

type MissingRouteConfig = {
  className?: string;
  containerClassName?: string;
  textClassName?: string;
  buttonClassName?: string;
  labels?: {
    missingRoute?: string;
    goBack?: string;
    goToRoot?: string;
  };
};

export type NavStackAPI = {
  id: string;
  push: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  replace: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  pop: () => Promise<boolean>;
  popUntil: (predicate: (entry: StackEntry, idx: number, stack: StackEntry[]) => boolean) => Promise<boolean>;
  popToRoot: () => Promise<boolean>;
  pushAndPopUntil: (rawKey: string, predicate: (entry: StackEntry, idx: number, stack: StackEntry[]) => boolean, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  pushAndReplace: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  peek: () => StackEntry | undefined;
  go: (rawKey: string, params?: NavParams, metadata?: StackEntry['metadata']) => Promise<boolean>;
  replaceParam: (params: NavParams, merge?: boolean) => Promise<boolean>;

  provideObject: <T>(
    key: string,
    getter: () => T,
    options?: ObjectOptions
  ) => () => void;

  getObject: <T>(
    key: string,
    options?: ObjectOptions
  ) => T | undefined;

  hasObject: (
    key: string,
    options?: ObjectOptions
  ) => boolean;

  removeObject: (key: string) => void;
  clearObjects: () => void;
  listObjects: () => string[];

  // Subscribe to object provision events
  onObjectProvision: <T>(
    key: string,
    callback: (value: T) => void,
    options?: ObjectOptions
  ) => () => void;

  // Subscribe to getter registration - called when a new getter is registered
  onGetterRegistered?: (
    key: string,
    callback: () => void,
    options?: ObjectOptions
  ) => () => void;

  // ============ Optional Request/Response Pattern ============
  
  provideRequestHandler?: <TRequest = any, TResponse = any>(
    key: string,
    handler: (request: TRequest) => TResponse | Promise<TResponse>,
    options?: ObjectOptions
  ) => () => void;

  sendRequest?: <TRequest = any, TResponse = any>(
    key: string,
    request: TRequest,
    options?: ObjectOptions
  ) => Promise<TResponse>;

  onRequestHandlerRegistered?: (
    key: string,
    callback: () => void,
    options?: ObjectOptions
  ) => () => void;

  pushWith: (
    rawKey: string,
    params?: NavParams,
    options?: {
      requireObjects?: string[];
      provideObjects?: Record<string, () => any>;
      metadata?: StackEntry['metadata'];
    }
  ) => Promise<boolean>;

  replaceWith: (
    rawKey: string,
    params?: NavParams,
    options?: {
      requireObjects?: string[];
      provideObjects?: Record<string, () => any>;
      metadata?: StackEntry['metadata'];
    }
  ) => Promise<boolean>;

  goWith: (
    rawKey: string,
    params?: NavParams,
    options?: {
      requireObjects?: string[];
      provideObjects?: Record<string, () => any>;
      metadata?: StackEntry['metadata'];
    }
  ) => Promise<boolean>;

  getStack: () => StackEntry[];
  length: () => number;
  subscribe: (fn: StackChangeListener) => () => void;
  registerGuard: (guard: GuardFn) => () => void;
  registerMiddleware: (middleware: MiddlewareFn) => () => void;
  dispose: () => void;
  clearAllPersistedStacks: () => void;
  syncWithBrowserHistory: (enabled: boolean) => void;
  isTop: (uid?: string) => boolean;
  getFullPath: () => string;
  getNavLink: () => NavigationMap;
  isActiveStack: () => boolean;
  isInGroup: () => boolean;
  getGroupId: () => string | null;
  /**
   * Switch to a group and optionally execute operations on its stack
   * @param groupId - The group to switch to
   * @param callback - Optional callback that receives the new group's API
   * 
   * Examples:
   *   // Without callback - returns promise of NavStackAPI
   *   const api = await nav.goToGroupId('profile-stack');
   *   
   *   // With callback - executes on new group's stack
   *   await nav.goToGroupId('profile-stack', (api) => api.push('security_page', {isNew: true}));
   */
  goToGroupId(groupId: string, callback?: (api: NavStackAPI) => Promise<void> | void): Promise<NavStackAPI>;
  addOnCreate: (handler: LifecycleHandler) => () => void;
  addOnDispose: (handler: LifecycleHandler) => () => void;
  addOnPause: (handler: LifecycleHandler) => () => void;
  addOnResume: (handler: LifecycleHandler) => () => void;
  addOnEnter: (handler: LifecycleHandler) => () => void;
  addOnExit: (handler: LifecycleHandler) => () => void;
  addOnBeforePush: (handler: AsyncLifecycleHandler) => () => void;
  addOnAfterPush: (handler: LifecycleHandler) => () => void;
  addOnBeforePop: (handler: AsyncLifecycleHandler) => () => void;
  addOnAfterPop: (handler: LifecycleHandler) => () => void;
  addOnBeforeReplace: (handler: AsyncLifecycleHandler) => () => void;
  addOnAfterReplace: (handler: LifecycleHandler) => () => void;
  clearAllLifecycleHandlers: (hook?: LifecycleHook) => void;
  getLifecycleHandlers: (hook: LifecycleHook) => LifecycleHandler[];
  _getLifecycleManager: () => EnhancedLifecycleManager;
};

type NavigationMap = Record<string, ComponentType<any> | (() => LazyComponent)>;
type BuiltinTransition = "fade" | "slide" | "none";
type TransitionRenderer = (props: {
  children: ReactNode;
  state: TransitionState;
  index: number;
  isTop: boolean;
}) => ReactNode;

type GuardFn = (action: {
  type: "push" | "replace" | 'replaceParam' | "pop" | "popUntil" | "popToRoot";
  from?: StackEntry | undefined;
  to?: StackEntry | undefined;
  stackSnapshot: StackEntry[];
}) => boolean | Promise<boolean>;

type MiddlewareFn = (action: {
  type: "push" | "replace" | 'replaceParam' | "pop" | "popUntil" | "popToRoot" | "init";
  from?: StackEntry | undefined;
  to?: StackEntry | undefined;
  stackSnapshot: StackEntry[];
}) => void;

type LifecycleHook =
  | 'onCreate'
  | 'onDispose'
  | 'onPause'
  | 'onResume'
  | 'onEnter'
  | 'onExit'
  | 'onBeforePush'
  | 'onAfterPush'
  | 'onBeforePop'
  | 'onAfterPop'
  | 'onBeforeReplace'
  | 'onAfterReplace';

type LifecycleHandler = (context: {
  stack: StackEntry[];
  current?: StackEntry;
  previous?: StackEntry;
  action?: {
    type: 'push' | 'pop' | 'replace' | 'replaceParam' | 'popUntil' | 'popToRoot';
    target?: StackEntry;
  };
}) => void | Promise<void>;

type AsyncLifecycleHandler = (context: {
  stack: StackEntry[];
  current?: StackEntry;
  previous?: StackEntry;
  action?: {
    type: 'push' | 'pop' | 'replace' | 'replaceParam' | 'popUntil' | 'popToRoot';
    target?: StackEntry;
  };
}) => Promise<void> | void;

type ObjectKey = string | string[];

type ObjectOptions = {
  stack?: boolean;
  scope?: string;
  global?: boolean;
};

// ==================== Constants ====================
const DEFAULT_TRANSITION_DURATION = 220;
const DEFAULT_MAX_STACK_SIZE = 50;
const STORAGE_TTL_MS = 1000 * 60 * 30;
const MEMORY_CACHE_SIZE = 5;
const MEMORY_CACHE_EXPIRY = 1000 * 60 * 5;
const NAV_STACK_VERSION = '1';
const STACK_SEPARATOR = 'x';


// ==================== Enhanced Object Reference Registry ====================

type ObjectMetadata = {
  scopeId?: string;
  description?: string;
  isStackScoped?: boolean;
  isGlobal?: boolean;
  originalKey?: string;
  createdAt?: number; // For memory leak detection
};

class ObjectReferenceRegistry {
  // Format: "stackId[:scopeId]:key" or "global:key"
  private getters = new Map<string, () => any>();
  private metadata = new Map<string, ObjectMetadata>();
  // Callbacks waiting for a getter to be provided
  private waitingCallbacks = new Map<string, Set<() => void>>();

  // Request/Response pattern support
  private requestHandlers = new Map<string, (request: any) => any | Promise<any>>();
  private waitingRequestHandlers = new Map<string, Set<() => void>>();

  // Memory management
  private cleanupTimers = new Map<string, NodeJS.Timeout>();
  private readonly CLEANUP_TIMEOUT = 1000 * 60 * 10; // 10 minutes

  // ============ Backward Compatible Methods ============

  // Register a getter function for an object (backward compatible)
  register<T>(
    stackId: string,
    key: string,
    getter: () => T,
    scopeId?: string
  ): () => void {
    return this.registerWithOptions(stackId, key, getter, {
      scopeId,
      isStackScoped: false,
      isGlobal: false
    });
  }

  // Unregister a getter (backward compatible)
  unregister(stackId: string, key: string): void {
    // Try to find the key with various formats
    const possibleKeys = [
      `${stackId}:${key}`,                    // Page scope
      `global:${key}`,                        // Global scope
    ];

    for (const possibleKey of possibleKeys) {
      if (this.getters.has(possibleKey)) {
        this.getters.delete(possibleKey);
        this.metadata.delete(possibleKey);
        return;
      }
    }

    // Also search through metadata for stack-scoped keys
    const prefix = `${stackId}:`;
    for (const [fullKey, meta] of this.metadata.entries()) {
      if (fullKey.startsWith(prefix) && meta.originalKey === key) {
        this.getters.delete(fullKey);
        this.metadata.delete(fullKey);
        return;
      }
    }
  }

  // Get the current object instance (backward compatible)
  get<T>(stackId: string, key: string): T | undefined {

    return this.getWithOptions<T>(stackId, key, {});
  }

  // Check if a getter is registered (backward compatible)
  hasGetter(stackId: string, key: string): boolean {
    return this.hasWithOptions(stackId, key, {});
  }

  // Get all registered keys for a stack (backward compatible)
  getRegisteredKeys(stackId: string): string[] {
    const keys: string[] = [];
    const prefix = `${stackId}:`;

    for (const [key, meta] of this.metadata.entries()) {
      // Include keys for this stack OR global keys
      if (key.startsWith(prefix) || meta.isGlobal) {
        const originalKey = meta.originalKey || this.extractOriginalKey(key);
        if (originalKey && !keys.includes(originalKey)) {
          keys.push(originalKey);
        }
      }
    }

    return keys;
  }

  // Clear all getters for a specific scope (backward compatible)
  clearScope(stackId: string, scopeId: string): void {
    const keysToRemove: string[] = [];

    for (const [key, meta] of this.metadata.entries()) {
      if (key.startsWith(`${stackId}:`) && meta.scopeId === scopeId) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.getters.delete(key);
      this.metadata.delete(key);
    });
  }

  // Clear all getters for a stack (backward compatible)
  clearStack(stackId: string): void {
    const keysToRemove: string[] = [];

    for (const key of this.getters.keys()) {
      if (key.startsWith(`${stackId}:`)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      this.getters.delete(key);
      this.metadata.delete(key);
      this.waitingCallbacks.delete(key);
      this.requestHandlers.delete(key);
      this.waitingRequestHandlers.delete(key);
    });
  }

  // Clear everything (backward compatible)
  clearAll(): void {
    this.getters.clear();
    this.metadata.clear();
    this.waitingCallbacks.clear();
    this.requestHandlers.clear();
    this.waitingRequestHandlers.clear();
    this.cleanupTimers.forEach(timer => clearTimeout(timer));
    this.cleanupTimers.clear();
  }

  // ============ Memory Management & Cleanup ============

  /**
   * Schedule auto-cleanup for a getter to prevent memory leaks
   * Useful for page-scoped or temporary getters
   */
  scheduleCleanup(fullKey: string, timeoutMs?: number): void {
    // Clear any existing timer
    const existingTimer = this.cleanupTimers.get(fullKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timeout = timeoutMs || this.CLEANUP_TIMEOUT;
    const timer = setTimeout(() => {
      if (this.getters.has(fullKey)) {
        console.log(`[Registry] Auto-cleanup: removing "${fullKey}" due to timeout`);
        this.getters.delete(fullKey);
        this.metadata.delete(fullKey);
        this.waitingCallbacks.delete(fullKey);
        this.requestHandlers.delete(fullKey);
        this.waitingRequestHandlers.delete(fullKey);
      }
      this.cleanupTimers.delete(fullKey);
    }, timeout);

    this.cleanupTimers.set(fullKey, timer);
  }

  /**
   * Cancel scheduled cleanup for a getter
   */
  cancelCleanup(fullKey: string): void {
    const timer = this.cleanupTimers.get(fullKey);
    if (timer) {
      clearTimeout(timer);
      this.cleanupTimers.delete(fullKey);
    }
  }

  /**
   * Get memory stats for debugging
   */
  getMemoryStats(): {
    gettersCount: number;
    callbacksCount: number;
    handlersCount: number;
    pendingCleanups: number;
  } {
    let callbacksCount = 0;
    let handlersCount = 0;

    this.waitingCallbacks.forEach(set => {
      callbacksCount += set.size;
    });

    this.waitingRequestHandlers.forEach(set => {
      handlersCount += set.size;
    });

    return {
      gettersCount: this.getters.size,
      callbacksCount,
      handlersCount,
      pendingCleanups: this.cleanupTimers.size
    };
  }

  // ============ Enhanced Methods ============

  // Enhanced register with options
  // Priority: global > stack > custom scope > page scope (default)
  registerWithOptions<T>(
    stackId: string,
    key: string,
    getter: () => T | Promise<T>,
    options?: {
      scopeId?: string;
      isStackScoped?: boolean;
      isGlobal?: boolean;
      description?: string;
    }
  ): () => void {
    const {
      scopeId,
      isStackScoped = false,
      isGlobal = false,
      description
    } = options || {};

    let finalKey: string;
    let finalScopeId: string | undefined;

    // Priority: global wins over all
    if (isGlobal) {
      finalKey = `global:${key}`;
      finalScopeId = 'global';
    } else if (isStackScoped) {
      // Stack scope is second priority
      finalKey = `${stackId}:${key}`;
      finalScopeId = stackId;
    } else if (typeof scopeId === 'string' && scopeId) {
      // Custom scope is third priority - ✅ FIXED: removed typo 'k'
      finalKey = `${stackId}:${scopeId}:${key}`;
      finalScopeId = scopeId;
    } else {
      // Default to page scope
      finalKey = `${stackId}:${key}`;
      finalScopeId = scopeId;
    }

    // Register the getter
    this.getters.set(finalKey, getter);
    this.metadata.set(finalKey, {
      scopeId: finalScopeId,
      description: description || `Object ${key}`,
      isStackScoped,
      isGlobal,
      originalKey: key
    });

    // Notify all callbacks waiting for this getter
    const callbacks = this.waitingCallbacks.get(finalKey);
    if (callbacks) {
      console.log(`[Registry.registerWithOptions] Notifying ${callbacks.size} waiting callbacks for "${finalKey}"`);
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (err) {
          console.error(`[Registry.registerWithOptions] Callback error:`, err);
        }
      });
      this.waitingCallbacks.delete(finalKey);
    }

    return () => {
      this.unregisterByKey(finalKey);
    };
  }

  // Enhanced get with options - returns object or promise, along with pattern key for subscription
  getWithOptionsAndKey<T>(
    stackId: string,
    key: string,
    options?: {
      scopeId?: string;
      isStackScoped?: boolean;
      isGlobal?: boolean;
    }
  ): { value: T | Promise<T> | undefined; patternKey: string | null } {
    const {
      scopeId,
      isStackScoped = false,
      isGlobal = false
    } = options || {};

    // Build search patterns in order of priority
    const searchPatterns: string[] = [];

    if (isGlobal) {
      // Global scope
      searchPatterns.push(`global:${key}`);
    }

    if (isStackScoped) {
      // Stack scope
      searchPatterns.push(`${stackId}:${key}`);
    }

    if (scopeId) {
      // Custom scope
      searchPatterns.push(`${stackId}:${scopeId}:${key}`);
    }

    // Page scope (default fallback)
    searchPatterns.push(`${stackId}:${key}`);

    // Try each pattern in order
    for (const pattern of searchPatterns) {
      // If getter exists, return it
      const getter = this.getters.get(pattern);
      if (getter) {
        return { value: getter as any, patternKey: pattern };
      }
    }

    return { value: undefined, patternKey: null };
  }

  // Original getWithOptions for backward compatibility
  getWithOptions<T>(
    stackId: string,
    key: string,
    options?: {
      scopeId?: string;
      isStackScoped?: boolean;
      isGlobal?: boolean;
    }
  ): T | undefined {
    const result = this.getWithOptionsAndKey<T>(stackId, key, options);
    return result.value as T | undefined;
  }

  // Enhanced check if object exists
  hasWithOptions(
    stackId: string,
    key: string,
    options?: {
      scopeId?: string;
      isStackScoped?: boolean;
      isGlobal?: boolean;
    }
  ): boolean {
    const {
      scopeId,
      isStackScoped = false,
      isGlobal = false
    } = options || {};

    // Build search patterns
    const searchPatterns: string[] = [];

    if (isGlobal) {
      searchPatterns.push(`global:${key}`);
    }

    if (isStackScoped) {
      searchPatterns.push(`${stackId}:${key}`);
    }

    if (scopeId) {
      searchPatterns.push(`${stackId}:${scopeId}:${key}`);
    }

    // Page scope (default)
    searchPatterns.push(`${stackId}:${key}`);

    // Check if any pattern exists
    return searchPatterns.some(pattern => this.getters.has(pattern));
  }

  // ============ Utility Methods ============

  // Get all objects with detailed info (for debugging)
  debugAll(): Array<{
    key: string;
    fullKey: string;
    scopeId: string;
    isGlobal: boolean;
    isStackScoped: boolean;
    stackId: string;
    description?: string;
  }> {
    const result = [];

    for (const [fullKey, meta] of this.metadata.entries()) {
      const parts = fullKey.split(':');
      let stackId = '';
      let originalKey = '';

      if (meta.isGlobal) {
        stackId = 'global';
        originalKey = meta.originalKey || parts[1] || fullKey;
      } else if (meta.isStackScoped) {
        stackId = parts[0] || 'unknown';
        originalKey = meta.originalKey || parts[1] || fullKey;
      } else if (meta.scopeId && meta.scopeId !== parts[0]) {
        // Has custom scope
        stackId = parts[0] || 'unknown';
        originalKey = meta.originalKey || parts[2] || fullKey;
      } else {
        // Page scope
        stackId = parts[0] || 'unknown';
        originalKey = meta.originalKey || parts[1] || fullKey;
      }

      result.push({
        key: originalKey,
        fullKey,
        scopeId: meta.scopeId || 'page',
        isGlobal: meta.isGlobal || false,
        isStackScoped: meta.isStackScoped || false,
        stackId,
        description: meta.description
      });
    }

    return result;
  }

  // Get objects by scope
  getByScope(stackId: string, scopeId: string): Array<{
    key: string;
    getter: () => any;
  }> {
    const result = [];
    const prefix = `${stackId}:${scopeId}:`;

    for (const [key, getter] of this.getters.entries()) {
      if (key.startsWith(prefix)) {
        const meta = this.metadata.get(key);
        result.push({
          key: meta?.originalKey || key.slice(prefix.length),
          getter
        });
      }
    }

    return result;
  }

  // Get global objects
  getGlobalObjects(): Array<{
    key: string;
    getter: () => any;
  }> {
    const result = [];

    for (const [key, getter] of this.getters.entries()) {
      if (key.startsWith('global:')) {
        const meta = this.metadata.get(key);
        result.push({
          key: meta?.originalKey || key.slice(7), // Remove 'global:'
          getter
        });
      }
    }

    return result;
  }

  // Get stack-scoped objects
  getStackScopedObjects(stackId: string): Array<{
    key: string;
    getter: () => any;
  }> {
    const result = [];

    for (const [key, getter] of this.getters.entries()) {
      if (key.startsWith(`${stackId}:`)) {
        const meta = this.metadata.get(key);
        if (meta?.isStackScoped) {
          result.push({
            key: meta.originalKey || key.slice(stackId.length + 1),
            getter
          });
        }
      }
    }

    return result;
  }

  // ============ Private Helper Methods ============

  private unregisterByKey(fullKey: string): void {
    this.getters.delete(fullKey);
    this.metadata.delete(fullKey);
    this.waitingCallbacks.delete(fullKey);
  }

  private extractOriginalKey(fullKey: string): string {
    const parts = fullKey.split(':');
    if (parts[0] === 'global') {
      return parts.slice(1).join(':');
    }
    return parts.slice(-1)[0];
  }

  // Subscribe to getter registration - called when a new getter is registered
  onGetterRegistered(fullKey: string, callback: () => void): () => void {
    // If getter already exists, call immediately
    if (this.getters.has(fullKey)) {
      console.log(`[Registry.onGetterRegistered] Getter already exists for "${fullKey}", calling immediately`);
      try {
        callback();
      } catch (err) {
        console.error(`[Registry.onGetterRegistered] Callback error:`, err);
      }
      return () => {}; // No-op unsubscribe
    }

    // Otherwise, save callback for when getter is registered
    if (!this.waitingCallbacks.has(fullKey)) {
      this.waitingCallbacks.set(fullKey, new Set());
    }
    this.waitingCallbacks.get(fullKey)!.add(callback);
    console.log(`[Registry.onGetterRegistered] Added waiting callback for "${fullKey}"`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.waitingCallbacks.get(fullKey);
      if (callbacks) {
        callbacks.delete(callback);
        // Clean up empty callback set immediately
        if (callbacks.size === 0) {
          this.waitingCallbacks.delete(fullKey);
        }
      }
      // Also perform periodic cleanup of any empty sets
      this.cleanupEmptyCallbackSets();
    };
  }

  /**
   * Clean up any empty callback sets from waitingCallbacks
   * Called automatically after callback removal to prevent memory accumulation
   */
  private cleanupEmptyCallbackSets(): void {
    for (const [key, callbacks] of this.waitingCallbacks.entries()) {
      if (callbacks.size === 0) {
        this.waitingCallbacks.delete(key);
      }
    }
  }

  // ============ Request/Response Pattern (Optional) ============

  /**
   * Register a request handler for a specific key
   * Provider side: handles requests from consumers
   */
  registerRequestHandler(
    fullKey: string,
    handler: (request: any) => any | Promise<any>
  ): () => void {
    this.requestHandlers.set(fullKey, handler);
    console.log(`[Registry.registerRequestHandler] Handler registered for "${fullKey}"`);

    // Notify waiting consumers
    const callbacks = this.waitingRequestHandlers.get(fullKey);
    if (callbacks) {
      console.log(`[Registry.registerRequestHandler] Notifying ${callbacks.size} waiting request handlers for "${fullKey}"`);
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (err) {
          console.error(`[Registry.registerRequestHandler] Callback error:`, err);
        }
      });
      this.waitingRequestHandlers.delete(fullKey);
    }

    return () => {
      this.requestHandlers.delete(fullKey);
    };
  }

  /**
   * Send a request and wait for response
   * Consumer side: sends request to provider and waits for response
   */
  async sendRequest<TRequest = any, TResponse = any>(
    fullKey: string,
    request: TRequest
  ): Promise<TResponse> {
    const handler = this.requestHandlers.get(fullKey);
    if (!handler) {
      throw new Error(`No request handler registered for key: ${fullKey}`);
    }

    try {
      const response = await handler(request);
      return response as TResponse;
    } catch (error) {
      console.error(`[Registry.sendRequest] Error in handler for "${fullKey}":`, error);
      throw error;
    }
  }

  /**
   * Subscribe to request handler registration
   * Consumer side: waits for provider to register handler
   */
  onRequestHandlerRegistered(fullKey: string, callback: () => void): () => void {
    // If handler already exists, call immediately
    if (this.requestHandlers.has(fullKey)) {
      console.log(`[Registry.onRequestHandlerRegistered] Handler already exists for "${fullKey}", calling immediately`);
      try {
        callback();
      } catch (err) {
        console.error(`[Registry.onRequestHandlerRegistered] Callback error:`, err);
      }
      return () => {}; // No-op unsubscribe
    }

    // Otherwise, save callback for when handler is registered
    if (!this.waitingRequestHandlers.has(fullKey)) {
      this.waitingRequestHandlers.set(fullKey, new Set());
    }
    this.waitingRequestHandlers.get(fullKey)!.add(callback);
    console.log(`[Registry.onRequestHandlerRegistered] Added waiting callback for "${fullKey}"`);

    // Return unsubscribe function
    return () => {
      const callbacks = this.waitingRequestHandlers.get(fullKey);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.waitingRequestHandlers.delete(fullKey);
        }
      }
    };
  }

  // Alias methods for backward compatibility
  has = this.hasGetter;
}

// Global instance (maintains same export)
const globalObjectRegistry = new ObjectReferenceRegistry();

// ==================== Global Systems ====================
// Only create these on the client side
let globalRegistry: Map<string, any>;
let isServer = typeof window === 'undefined';

if (!isServer) {
  globalRegistry = new Map<string, {
    stack: StackEntry[];
    listeners: Set<StackChangeListener>;
    guards: Set<GuardFn>;
    middlewares: Set<MiddlewareFn>;
    maxStackSize: number;
    historySyncEnabled: boolean;
    snapshotBuffer: StackEntry[];
    parentId: string | null;
    childIds: Set<string>;
    navLink?: NavigationMap;
    api?: NavStackAPI;
    currentPath?: string;
    isInGroup?: boolean;
    groupId?: string;
    lifecycleHandlers: Map<LifecycleHook, Set<LifecycleHandler | AsyncLifecycleHandler>>;
    currentState: 'active' | 'paused' | 'background';
    lastActiveEntry?: StackEntry;
  }>();
} else {
  // Server-side stub
  globalRegistry = new Map();
}

// ==================== Group Context ====================
type GroupNavigationContextType = {
  getGroupId: () => string | null;
  getCurrent: () => string;
  goToGroupId: (groupId: string) => Promise<boolean>;
  isActiveStack: (stackId: string) => boolean;
};

const GroupNavigationContext = createContext<GroupNavigationContextType | null>(null);
const GroupStackIdContext = createContext<string | null>(null);

function useGroupNavigation() {
  const context = useContext(GroupNavigationContext);
  return context;
}

function useGroupStackId() {
  const context = useContext(GroupStackIdContext);
  return context;
}

// ==================== Transition Manager ====================
class TransitionManager {
  private activeTransitions = new Map<string, any>();
  private completedTransitions = new Set<string>();
  private interruptSignals = new Map<string, { interrupted: boolean; reason?: string }>();
  private onError: ((error: Error, uid: string) => void) | null = null;

  start(uid: string, duration: number, onComplete: () => void, onError?: (error: Error) => void) {
    // Cancel any existing transition for this uid
    this.cancel(uid);
    this.interruptSignals.delete(uid);

    const timer = setTimeout(() => {
      try {
        const signal = this.interruptSignals.get(uid);
        
        if (signal?.interrupted) {
          // Transition was interrupted, skip completion
          console.debug(`Transition ${uid} was interrupted: ${signal.reason || 'unknown reason'}`);
        } else {
          this.activeTransitions.delete(uid);
          this.completedTransitions.add(uid);
          onComplete();
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`Error completing transition ${uid}:`, err);
        if (onError) {
          try { onError(err); } catch (e) { console.error("onError callback failed:", e); }
        }
        if (this.onError) {
          try { this.onError(err, uid); } catch (e) { console.error("Global onError handler failed:", e); }
        }
      }
    }, duration) as any;
    
    this.activeTransitions.set(uid, timer);
  }

  /**
   * Cancel a transition and optionally interrupt ongoing completions
   */
  cancel(uid: string, reason?: string) {
    const timer = this.activeTransitions.get(uid);
    if (timer) {
      clearTimeout(timer);
      this.activeTransitions.delete(uid);
      
      // Mark as interrupted if reason provided
      if (reason) {
        this.interruptSignals.set(uid, { interrupted: true, reason });
      }
    }
  }

  /**
   * Interrupt a transition that's currently completing
   */
  interrupt(uid: string, reason?: string) {
    this.interruptSignals.set(uid, { interrupted: true, reason });
    this.cancel(uid, reason);
  }

  isComplete(uid: string): boolean {
    return this.completedTransitions.has(uid);
  }

  isInterrupted(uid: string): boolean {
    const signal = this.interruptSignals.get(uid);
    return signal?.interrupted || false;
  }

  /**
   * Set global error handler for all transitions
   */
  setErrorHandler(handler: ((error: Error, uid: string) => void) | null) {
    this.onError = handler;
  }

  /**
   * Get active transition count for monitoring
   */
  getActiveCount(): number {
    return this.activeTransitions.size;
  }

  /**
   * Wait for all active transitions to complete or be interrupted
   */
  awaitAllComplete(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve) => {
      if (this.activeTransitions.size === 0) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const completedPromises: Promise<void>[] = [];

      // Create a promise for each active transition
      for (const uid of this.activeTransitions.keys()) {
        const transitionPromise = new Promise<void>((transitionResolve) => {
          const checkTransition = () => {
            // Transition completed or was interrupted
            if (!this.activeTransitions.has(uid) || 
                this.completedTransitions.has(uid) ||
                this.isInterrupted(uid)) {
              transitionResolve();
              return;
            }

            // Timeout check
            if (Date.now() - startTime > timeoutMs) {
              this.interrupt(uid, 'timeout');
              transitionResolve();
              return;
            }

            // Still waiting, check again
            setTimeout(checkTransition, 10);
          };
          checkTransition();
        });
        completedPromises.push(transitionPromise);
      }

      // Wait for all transition promises to resolve
      Promise.all(completedPromises).then(() => {
        resolve();
      });
    });
  }

  dispose() {
    // Interrupt all active transitions before cleanup
    const uids = Array.from(this.activeTransitions.keys());
    uids.forEach(uid => this.interrupt(uid, 'disposal'));

    this.activeTransitions.forEach(timer => clearTimeout(timer));
    this.activeTransitions.clear();
    this.completedTransitions.clear();
    this.interruptSignals.clear();
    this.onError = null;
  }
}

// ==================== Page Memory Manager ====================
class PageMemoryManager {
  private cache = new Map<string, {
    element: ReactNode;
    lastActive: number;
  }>();

  get(uid: string): ReactNode | undefined {
    const entry = this.cache.get(uid);
    if (entry) {
      entry.lastActive = Date.now();
      return entry.element;
    }
    return undefined;
  }

  set(uid: string, element: ReactNode) {
    this.cleanup();
    this.cache.set(uid, {
      element,
      lastActive: Date.now()
    });
  }

  delete(uid: string) {
    this.cache.delete(uid);
  }

  private cleanup() {
    if (this.cache.size >= MEMORY_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastActive - b[1].lastActive);

      for (let i = 0; i < entries.length - MEMORY_CACHE_SIZE + 1; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    const now = Date.now();
    this.cache.forEach((value, key) => {
      if (now - value.lastActive > MEMORY_CACHE_EXPIRY) {
        this.cache.delete(key);
      }
    });
  }

  dispose() {
    this.cache.clear();
  }
}

// ==================== Enhanced Lifecycle Manager ====================
class EnhancedLifecycleManager {
  private handlers: Map<LifecycleHook, Set<LifecycleHandler | AsyncLifecycleHandler>>;
  private stackId: string;
  private cleanupCallbacks: (() => void)[] = [];

  constructor(stackId: string) {
    this.stackId = stackId;
    this.handlers = new Map();

    // Initialize all lifecycle hooks
    const hooks: LifecycleHook[] = [
      'onCreate', 'onDispose', 'onPause', 'onResume',
      'onEnter', 'onExit', 'onBeforePush', 'onAfterPush',
      'onBeforePop', 'onAfterPop', 'onBeforeReplace', 'onAfterReplace'
    ];

    hooks.forEach(hook => {
      this.handlers.set(hook, new Set());
    });
  }

  // Add app state tracking
  enableAppStateTracking(getCurrentContext: () => { stack: StackEntry[]; current?: StackEntry }) {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      const context = getCurrentContext();
      if (document.hidden) {
        this.trigger('onPause', context);
      } else {
        this.trigger('onResume', context);
      }
    };

    const handlePageHide = () => {
      const context = getCurrentContext();
      this.trigger('onPause', context);
    };

    const handlePageShow = () => {
      const context = getCurrentContext();
      this.trigger('onResume', context);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    const cleanup = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };

    this.cleanupCallbacks.push(cleanup);
    return cleanup;
  }

  addHandler(hook: LifecycleHook, handler: LifecycleHandler | AsyncLifecycleHandler): () => void {
    const hookHandlers = this.handlers.get(hook);
    if (hookHandlers) {
      hookHandlers.add(handler);
      return () => hookHandlers.delete(handler);
    }
    return () => {};
  }

  async trigger(hook: LifecycleHook, context: any): Promise<void> {
    const hookHandlers = this.handlers.get(hook);
    if (!hookHandlers) return;

    const handlers = Array.from(hookHandlers);

    // For async handlers (onBefore* hooks), wait for all to complete
    if (hook.startsWith('onBefore')) {
      for (const handler of handlers) {
        await (handler as AsyncLifecycleHandler)(context);
      }
    } else {
      // For sync handlers, run in parallel but don't wait
      handlers.forEach(handler => {
        try {
          (handler as LifecycleHandler)(context);
        } catch (error) {
          console.warn(`Lifecycle handler for ${hook} threw:`, error);
        }
      });
    }
  }

  getHandlers(hook: LifecycleHook): LifecycleHandler[] {
    const hookHandlers = this.handlers.get(hook);
    return hookHandlers ? Array.from(hookHandlers) as LifecycleHandler[] : [];
  }

  clear(hook?: LifecycleHook) {
    if (hook) {
      this.handlers.get(hook)?.clear();
    } else {
      this.handlers.forEach(handlers => handlers.clear());
    }
  }

  dispose() {
    this.cleanupCallbacks.forEach(cleanup => cleanup());
    this.cleanupCallbacks = [];
    this.clear();
    this.handlers.clear();
  }
}

// ==================== Group-Scoped Scroll Restoration ====================

// Global scroll storage shared across all stack hooks
const globalScrollData = {
  scrollPositions: new Map<string, number>(),
  lastUid: null as string | null,
  lastGroupStackKey: null as string | null,
  lastActive: true,
  currentScrollY: 0,
};

interface ContainerData {
  element: HTMLElement;
  level: number;
  maxHeight: string;
  overflowX: string;
  overflowY: string;
  clientHeight: number;
  clientWidth: number;
  scrollHeight: number;
  scrollWidth: number;
  score: number;
}

export function useGroupScopedScrollRestoration(
  api: NavStackAPI,
  renders: RenderRecord[],
  stackSnapshot: StackEntry[],
  groupContext: GroupNavigationContextType | null,
  groupStackId: string | null
) {
  // Composite key: groupId:stackId
  const groupStackKey = groupContext 
    ? `${groupContext.getGroupId()}:${groupStackId}`
    : 'root:root';

  const scrollData = useRef<{
    scrollContainers: Map<string, ContainerData | 'window'>;
    lastWindowWidth: number;
  }>({
    scrollContainers: new Map(),
    lastWindowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
  }).current;

  const isActiveGroup = groupContext ? groupContext.isActiveStack(groupStackId || '') : true;
  const [cacheVersion, setCacheVersion] = useState(0);

  // UID is already composite (groupId:stackId:pageUid), just return it
  const makeScrollKey = (uid: string): string => uid;

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Scrollable detection
  const analyzeContainer = (element: HTMLElement, level: number): ContainerData => {
    const style = getComputedStyle(element);

    // Calculate score
    let score = 0;

    // For max-height constraints (often indicates intentional scroll container)
    if (style.maxHeight && style.maxHeight !== 'none') score += level + 40;

    return {
      element,
      level,
      maxHeight: style.maxHeight,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      clientHeight: element.clientHeight,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      scrollWidth: element.scrollWidth,
      score
    };
  };

  // Check if window dimensions changed significantly
  const hasWindowDimensionsChanged = (): boolean => {
    if (typeof window === 'undefined') return false;

    const currentWidth = window.innerWidth;

    const significantChange =
      Math.abs(scrollData.lastWindowWidth - currentWidth) > 1;

    if (significantChange) {
      scrollData.lastWindowWidth = currentWidth;
      return true;
    }

    return false;
  };

  // Invalidate cache for a specific UID
  const invalidateContainerCache = (uid: string) => {
    scrollData.scrollContainers.delete(uid);
    setCacheVersion(x => x + 1); // <-- SIGNAL React to re-run effects
  };

  // Invalidate all container caches
  const invalidateAllContainerCaches = () => {
    scrollData.scrollContainers.clear();
    setCacheVersion(x => x + 1); // <-- SIGNAL React to re-run effects
  };

  // Scrollable container detection with cache invalidation
  const findScrollableContainer = (uid: string): ContainerData | 'window' | null => {
    // Find the page element
    const pageElement = document.querySelector(`[data-nav-uid="${uid}"]`) as HTMLElement;
    if (!pageElement) return null;


    // Collect data for all potential containers
    const containerData: ContainerData[] = [];
    let currentElement: HTMLElement | null = pageElement;
    let level = 0;

    while (currentElement && level < 50) {
      const data = analyzeContainer(currentElement, level);
      containerData.push(data);
      currentElement = currentElement.parentElement;
      level++;
    }

    if (containerData.length === 0) return 'window';

    // Sort by score (highest first)
    containerData.sort((a, b) => {
      return b.score - a.score;
    });

    const bestContainer = containerData[0];

    if (bestContainer.score > 0) return bestContainer;

    return 'window';
  };

  // Get scrollable container with cache management
  const getScrollableContainer = (uid: string): HTMLElement | 'window' => {
    if (typeof document === 'undefined') return 'window';


    // Check cache first
    const cached = scrollData.scrollContainers.get(uid);
    if (cached) {
      if (cached === 'window') return 'window';
      return cached.element;
    }

    const container = findScrollableContainer(uid);

    if (!container) return 'window';

    if (container === 'window') {
      scrollData.scrollContainers.set(uid, 'window');
      return 'window';
    }

    // Store the container
    scrollData.scrollContainers.set(uid, container);
    return container.element;
  };

  // Get current scroll position
  const getCurrentScrollPosition = (container: HTMLElement | 'window'): number => {
    if (container === 'window') {
      return typeof window !== 'undefined' ? window.scrollY : 0;
    }
    return container.scrollTop;
  };

  // Set scroll position
  const setScrollPosition = (position: number, container: HTMLElement | 'window') => {
    if (container === 'window') {
      window.scrollTo(0, position);
    } else {
      container.scrollTop = position;
    }
  };

  // Add scroll listener to the appropriate element
  const addScrollListener = (container: HTMLElement | 'window', handler: () => void) => {
    const target = container === 'window' ? window : container;
    target.addEventListener('scroll', handler, { passive: true });
    return () => target.removeEventListener('scroll', handler);
  };

  // Manual cache invalidation function that can be called externally
  const invalidateCache = useCallback((uid?: string) => {
    if (uid) {
      invalidateContainerCache(uid);
    } else {
      invalidateAllContainerCaches();
    }
  }, []);

  // Track scroll position for active page
  useEffect(() => {
    if (!isActiveGroup) return;

    const top = stackSnapshot.at(-1);
    if (!top) return;

    const container = getScrollableContainer(top.uid);
    const scrollKey = makeScrollKey(top.uid);

    const handleScroll = () => {
      const scrollPosition = getCurrentScrollPosition(container);
      globalScrollData.scrollPositions.set(scrollKey, scrollPosition);
      globalScrollData.currentScrollY = scrollPosition;
    };

    const removeListener = addScrollListener(container, handleScroll);

    return () => {
      removeListener();
    };
  }, [stackSnapshot, isActiveGroup, groupStackKey, cacheVersion]);

  // Reset scroll for NEW pages SYNCHRONOUSLY before React renders
  // This uses useLayoutEffect to run BEFORE paint, preventing inherited scroll
  useLayoutEffect(() => {
    if (!isActiveGroup) return;
    
    const topEntry = stackSnapshot.at(-1);
    if (!topEntry) return;

    const { uid } = topEntry;
    const savedPosition = globalScrollData.scrollPositions.get(uid);
    
    // If this is a brand new page (no saved position), reset scroll immediately
    if (savedPosition === undefined) {
      const container = getScrollableContainer(uid);
      setScrollPosition(0, container);
    }
  }, [stackSnapshot, isActiveGroup]); // Minimal deps - just the stack

  // Restore scroll position when page changes
  useEffect(() => {
    const topEntry = stackSnapshot.at(-1);
    if (!topEntry) return;

    const { uid } = topEntry;
    const { lastUid, lastGroupStackKey, lastActive, currentScrollY } = globalScrollData;

    const groupStackKeyChanged = lastGroupStackKey !== groupStackKey;
    const uidChanged = uid !== lastUid;
    const activeChanged = lastActive !== isActiveGroup;

    // Save current position before switching - get ACTUAL position from container, not cached value
    if (lastUid && lastActive && lastGroupStackKey && (groupStackKeyChanged || uidChanged)) {
      const lastScrollKey = lastUid;
      // Get the ACTUAL scroll position from the container at switch time
      const lastContainer = getScrollableContainer(lastUid);
      const actualScrollPosition = getCurrentScrollPosition(lastContainer);
      globalScrollData.scrollPositions.set(lastScrollKey, actualScrollPosition);
    }

    // Restore position when becoming active
    if (isActiveGroup && (groupStackKeyChanged || uidChanged || activeChanged)) {
      const scrollKey = makeScrollKey(uid);
      const savedPosition = globalScrollData.scrollPositions.get(scrollKey);
      const container = getScrollableContainer(uid);
      
      // Explicitly determine if this is a new/fresh page
      const isNewPage = savedPosition === undefined;

      if (isNewPage) {
        // For brand new pages, SYNCHRONOUSLY reset to 0 immediately
        setScrollPosition(0, container);
      } else if (savedPosition !== undefined) {
        // For existing pages, restore from saved position with fallbacks
        const restoreScroll = () => {
          setScrollPosition(savedPosition, container);
        };

        // --- IMMEDIATE RESTORE ---
        restoreScroll();

        // --- DOM-settled fallback ---
        requestAnimationFrame(() => restoreScroll());
        setTimeout(() => restoreScroll(), 20);
      }
    }

    // Update global state
    globalScrollData.lastUid = uid;
    globalScrollData.lastGroupStackKey = groupStackKey;
    globalScrollData.lastActive = isActiveGroup;
  }, [stackSnapshot, isActiveGroup, groupStackKey, cacheVersion]);

  // Clean up scroll for pages no longer in entire navigation system
  useEffect(() => {
    // Build set of ALL valid UIDs across entire navigation tree (including nested/parent stacks)
    const validUids = new Set<string>();
    const visited = new Set<string>();
    
    // Recursively collect UIDs from a stack and its children
    const collectUidsRecursive = (stackId: string) => {
      if (visited.has(stackId)) return;
      visited.add(stackId);
      
      const regEntry = globalRegistry.get(stackId);
      if (!regEntry) return;
      
      // Add UIDs from this stack
      if (regEntry.stack && Array.isArray(regEntry.stack)) {
        regEntry.stack.forEach((entry: StackEntry) => {
          validUids.add(entry.uid);
        });
      }
      
      // Recursively add UIDs from child stacks
      if (regEntry.childIds && regEntry.childIds.size > 0) {
        regEntry.childIds.forEach((childId: string) => {
          collectUidsRecursive(childId);
        });
      }
    };
    
    // Traverse entire registry to collect all UIDs from all stacks (including nested)
    if (typeof window !== 'undefined' && globalRegistry) {
      globalRegistry.forEach((regEntry, stackId) => {
        // Only start from root stacks (no parent)
        if (!regEntry.parentId) {
          collectUidsRecursive(stackId);
        }
      });
    }

    // Delete scroll entries that don't exist in ANY stack in the entire navigation
    const keysToDelete: string[] = [];
    globalScrollData.scrollPositions.forEach((_, key) => {
      if (!validUids.has(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => globalScrollData.scrollPositions.delete(key));
  }, [stackSnapshot, api]);

  // Clean up container cache when UIDs are removed
  useEffect(() => {
    const currentUids = new Set(stackSnapshot.map(entry => entry.uid));

    // Remove cached containers for UIDs that no longer exist
    scrollData.scrollContainers.forEach((_, uid) => {
      if (!currentUids.has(uid)) {
        invalidateContainerCache(uid);
      }
    });
  }, [stackSnapshot]);

  // Listen for window resize events to invalidate cache
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(() => {
        if (hasWindowDimensionsChanged()) {
          invalidateAllContainerCaches();
        }
      }, 100); // 100ms debounce
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);


  // Return the cache invalidation function so it can be used by consumers
  return {
    invalidateScrollContainerCache: invalidateCache
  };
}


// ==================== Core Functions ====================
const NavContext = createContext<NavStackAPI | null>(null);
const CurrentPageContext = createContext<string | null>(null);

function findParentNavContext(): NavStackAPI | null {
  try {
    return useContext(NavContext);
  } catch (e) {
    return null;
  }
}

function isEqual(a: StackEntry[], b: StackEntry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((entry, i) =>
    entry.key === b[i].key &&
    JSON.stringify(entry.params) === JSON.stringify(b[i].params)
  );
}

function generateStableUid(key: string, params?: NavParams): string {
  const str = key + (params ? JSON.stringify(params) : '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `uid_${Math.abs(hash)}`;
}

// Generate composite UID: "groupId:stackId:pageUid"
function generateCompositeUid(
  stackId: string,
  groupContext: GroupNavigationContextType | null,
  groupStackId: string | null,
  key: string,
  params?: NavParams
): string {
  const groupStackKey = groupContext
    ? `${groupContext.getGroupId()}:${groupStackId}`
    : 'root:root';
  const pageUid = generateStableUid(key, params);
  return `${groupStackKey}:${pageUid}`;
}

// Ensure UID is composite format - upgrade old non-composite UIDs if needed
function ensureCompositeUid(
  uid: string | undefined,
  stackId: string,
  groupContext: GroupNavigationContextType | null,
  groupStackId: string | null,
  key: string,
  params?: NavParams
): string {
  // If already composite (contains ':'), return as-is
  if (uid && uid.includes(':')) {
    return uid;
  }
  // Otherwise regenerate as composite
  return generateCompositeUid(stackId, groupContext, groupStackId, key, params);
}

function parseRawKey(raw: string, params?: NavParams) {
  if (!raw) return { key: '', params };

  const [k, qs] = raw.split("?");
  let merged = params;
  if (qs) {
    try {
      const sp = new URLSearchParams(qs);
      const obj = Object.fromEntries(sp.entries());
      merged = merged ? { ...merged, ...obj } : obj;
    } catch (e) {}
  }
  return { key: k, params: merged };
}

function storageKeyFor(id: string) {
  return `navstack:${id}`;
}

function readPersistedStack(id: string, groupContext: GroupNavigationContextType | null, groupStackId: string | null): StackEntry[] | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(storageKeyFor(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timestamp: number; entries: any[] };
    if (!parsed.timestamp || !parsed.entries || !Array.isArray(parsed.entries)) return null;
    const expired = Date.now() - parsed.timestamp > STORAGE_TTL_MS;
    if (expired) {
      sessionStorage.removeItem(storageKeyFor(id));
      return null;
    }
    return parsed.entries.map((p) => {
      const compositeUid = ensureCompositeUid(p.uid, id, groupContext, groupStackId, p.key, p.params);
      return { uid: compositeUid, key: p.key, params: p.params, metadata: p.metadata };
    });
  } catch (e) {
    return null;
  }
}

function writePersistedStack(id: string, stack: StackEntry[]) {
  try {
    if (typeof window === "undefined") return;
    const simplified = {
      timestamp: Date.now(),
      entries: stack.map((s) => ({ key: s.key, params: s.params, metadata: s.metadata })),
    };
    sessionStorage.setItem(storageKeyFor(id), JSON.stringify(simplified));
  } catch (e) {}
}

function encodeStackPath(navLink: NavigationMap, key: string): string {
  const keys = Object.keys(navLink);
  const index = keys.indexOf(key);

  if (index === -1) {
    try {
      return 'k:' + encodeURIComponent(key);
    } catch {
      return 'k:' + key;
    }
  }
  if (index < 26) return String.fromCharCode(97 + index) + '1';
  if (index < 52) return 'a' + String.fromCharCode(65 + index - 26);

  const firstChar = String.fromCharCode(97 + Math.floor((index - 52) / 26));
  const secondChar = String.fromCharCode(97 + ((index - 52) % 26));
  return `${firstChar}${secondChar}1`;
}

function decodeStackPath(navLink: NavigationMap, code: string): string | null {
  if (code.startsWith('k:')) {
    try {
      return decodeURIComponent(code.slice(2));
    } catch {
      return code.slice(2);
    }
  }

  const keys = Object.keys(navLink);

  if (code.length === 2 && code[1] === '1' && code[0] >= 'a' && code[0] <= 'z') {
    const index = code.charCodeAt(0) - 97;
    return keys[index] || null;
  }

  if (code.length === 2 && code[0] === 'a' && code[1] >= 'A' && code[1] <= 'Z') {
    const index = 26 + (code.charCodeAt(1) - 65);
    return keys[index] || null;
  }

  if (code.length === 3 && code[2] === '1' &&
      code[0] >= 'a' && code[0] <= 'z' &&
      code[1] >= 'a' && code[1] <= 'z') {
    const first = code.charCodeAt(0) - 97;
    const second = code.charCodeAt(1) - 97;
    const index = 52 + (first * 26) + second;
    return keys[index] || null;
  }

  return null;
}

function encodeParams(params: NavParams): string {
  if (!params) return '';
  try {
    return 'p:' + btoa(encodeURIComponent(JSON.stringify(params)));
  } catch {
    return '';
  }
}

function decodeParams(encoded: string): NavParams {
  if (!encoded.startsWith('p:')) return undefined;
  try {
    return JSON.parse(decodeURIComponent(atob(encoded.slice(2))));
  } catch {
    return undefined;
  }
}

function buildUrlPath(stacks: Array<{navLink: NavigationMap, stack: StackEntry[]}>): string {
  let path = NAV_STACK_VERSION;

  stacks.forEach(({navLink, stack}, depth) => {
    if (depth > 0) path += '.' + STACK_SEPARATOR;

    stack.forEach(entry => {
      const code = encodeStackPath(navLink, entry.key);
      if (!code) return;

      path += '.' + code;

      if (entry.params) {
        const paramsStr = encodeParams(entry.params);
        if (paramsStr) path += '.' + paramsStr;
      }
    });
  });

  return path;
}

function parseUrlPathIntoStacks(path: string) {
  const parts = path.split('.');
  if (parts[0] !== NAV_STACK_VERSION) return [];

  const stacks: ParsedStack[] = [];
  let currentStack: ParsedStack = [];

  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];
    if (!token) continue;

    if (token === STACK_SEPARATOR) {
      if (currentStack.length > 0) {
        stacks.push(currentStack);
      } else {
        stacks.push([]);
      }
      currentStack = [];
      continue;
    }

    if (token.startsWith('p:')) {
      if (currentStack.length > 0) {
        currentStack[currentStack.length - 1].params = decodeParams(token);
      }
      continue;
    }

    currentStack.push({ code: token });
  }

  stacks.push(currentStack);

  return stacks;
}

function parseCombinedNavParam(navParam: string | null | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  if (!navParam) return map;
  try {
    navParam.split('|').forEach(segment => {
      if (!segment) return;
      const idx = segment.indexOf(':');
      if (idx === -1) return;
      const id = segment.slice(0, idx);
      const path = segment.slice(idx + 1);
      if (id) map[id] = path;
    });
  } catch (e) {
  }
  return map;
}

function buildCombinedNavParam(map: Record<string, string>): string {
  return Object.keys(map)
    .filter(k => map[k] && map[k].length > 0)
    .map(k => `${k}:${map[k]}`)
    .join('|');
}

function updateNavQueryParamForStack(stackId: string, path: string | null, groupContext: GroupNavigationContextType | null, groupStackId: string | null) {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('nav');
    const map = parseCombinedNavParam(current || undefined);

    if (path && path.length > 0) {
      map[stackId] = path;
    } else {
      delete map[stackId];
    }

    const newParam = buildCombinedNavParam(map);

    if (newParam) {
      if(groupContext)url.searchParams.set('group', groupStackId || '');
      url.searchParams.set('nav', newParam);
    } else {
      if(groupContext)url.searchParams.delete('group');
      url.searchParams.delete('nav');
    }

    const newHref = url.toString();
    if (window.location.href !== newHref) {
      if(groupContext)window.history.replaceState({ group: groupStackId }, "", newHref);
      window.history.replaceState({ navStack: newParam }, "", newHref);
    }
  } catch (e) {
  }
}
function removeNavQueryParamForStack(stackId: string, groupContext: GroupNavigationContextType | null, groupStackId: string | null) {
  if (typeof window === "undefined") return;

  try {
    const url = new URL(window.location.href);

    if(groupContext)url.searchParams.delete('group');
    url.searchParams.delete('nav');


    const newHref = url.toString();
    if (window.location.href !== newHref) {
      if(groupContext)window.history.replaceState({ group: null }, "", newHref);
      window.history.replaceState({ navStack: null }, "", newHref);
    }
  } catch (e) {
  }
}


function createApiFor(id: string, navLink: NavigationMap, syncHistory: boolean, parentApi: NavStackAPI | null, currentPath: string, groupContext: GroupNavigationContextType | null = null, groupStackId : string | null): NavStackAPI {
  const transitionManager = new TransitionManager();
  const memoryManager = new PageMemoryManager();
  const lifecycleManager = new EnhancedLifecycleManager(id);

  let safeRegEntry = globalRegistry.get(id);
  if (!safeRegEntry) {
    safeRegEntry = {
      stack: [],
      listeners: new Set(),
      guards: new Set(),
      middlewares: new Set(),
      maxStackSize: DEFAULT_MAX_STACK_SIZE,
      historySyncEnabled: false,
      snapshotBuffer: [],
      parentId: parentApi?.id || null,
      childIds: new Set(),
      navLink,
      lifecycleHandlers: new Map(),
      currentState: 'active',
      lastActiveEntry: undefined,
    };
    globalRegistry.set(id, safeRegEntry);

    if (parentApi) {
      const parentReg = globalRegistry.get(parentApi.id);
      if (parentReg) {
        parentReg.childIds.add(id);
      }
    }
  } else {
    safeRegEntry.navLink = navLink;
    safeRegEntry.parentId = parentApi?.id || null;
  }
  const regEntry = safeRegEntry;


  function emit(previousStack?: StackEntry[], action?: { type: string; target?: StackEntry }) {
      const stackCopy = regEntry!.stack.slice();
      const regEntryCurrentPath = regEntry.currentPath || (typeof window !== 'undefined' ? window.location.pathname : '');

      const previous = previousStack ? previousStack[previousStack.length - 1] : undefined;
      const current = stackCopy[stackCopy.length - 1];

      if (!previousStack) {
        if (current) {
          lifecycleManager.trigger('onEnter', {
            stack: stackCopy,
            current,
            previous: undefined,
            action
          });
        }
      } else {
        const previousTop = previousStack[previousStack.length - 1];
        const currentTop = stackCopy[stackCopy.length - 1];

        const isDifferentPage = !previousTop || !currentTop || previousTop.uid !== currentTop.uid;

        if (isDifferentPage) {
          if (previousTop) {
            lifecycleManager.trigger('onExit', {
              stack: stackCopy,
              current: currentTop,
              previous: previousTop,
              action
            });
          }

          if (currentTop) {
            lifecycleManager.trigger('onEnter', {
              stack: stackCopy,
              current: currentTop,
              previous: previousTop,
              action
            });
          }
        }
      }

    // Update registry state
    regEntry.lastActiveEntry = current;

    if ((syncHistory || regEntry.historySyncEnabled) && regEntryCurrentPath) {
      if (typeof window !== 'undefined' && window.location.pathname !== regEntryCurrentPath) {
        console.warn(`NavigationStack ${id}: Path changed from ${regEntryCurrentPath} to ${window.location.pathname}, disabling URL updates`);
        regEntry.listeners.forEach((l: StackChangeListener) => {
          try { l(stackCopy); } catch (e) { console.warn(e); }
        });
        return;
      }
    }

    if (syncHistory || regEntry.historySyncEnabled) {
      try {
        const localPath = buildUrlPath([{ navLink, stack: stackCopy }]);
        updateNavQueryParamForStack(id, localPath, groupContext, groupStackId);
      } catch (e) {
        try {
          const fallback = buildUrlPath([{ navLink, stack: stackCopy }]);
          updateNavQueryParamForStack(id, fallback, groupContext, groupStackId);
        } catch {}
      }
    }

    regEntry.listeners.forEach((l: StackChangeListener) => {
      try { l(stackCopy); } catch (e) { console.warn(e); }
    });
  }

  function runMiddlewares(action: Parameters<MiddlewareFn>[0]) {
    regEntry.middlewares.forEach((m: MiddlewareFn) => {
      try { m(action); } catch (e) { console.warn("Nav middleware threw:", e); }
    });
  }

  async function runGuards(action: Parameters<GuardFn>[0]): Promise<boolean> {
   const guards = Array.from(regEntry.guards) as GuardFn[];
    for (const g of guards) {
      try {
        const res = await Promise.resolve(g(action));
        if (!res) return false;
      } catch (e) {
        console.warn("Nav guard threw:", e);
        return false;
      }
    }
    return true;
  }

  // ============ Improved Lock Mechanism (Race Condition Prevention) ============
  let actionLock = false;
  let pendingOperations = 0;

  async function withLock<T>(fn: () => Promise<T>): Promise<T | false> {
    if (actionLock) {
      console.warn('[NavStack] Lock already acquired, operation rejected to prevent race condition');
      return false as unknown as T;
    }

    actionLock = true;
    pendingOperations++;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      console.error('[NavStack] Operation failed:', err);
      throw err;
    } finally {
      pendingOperations--;
      actionLock = false;
    }
  }

  /**
   * Wait for all pending navigation operations to complete
   * Useful for ensuring state stability before cleanup
   */
  function awaitPendingOperations(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve) => {
      if (pendingOperations === 0) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (pendingOperations === 0) {
          clearInterval(checkInterval);
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          console.warn('[NavStack] Timeout waiting for pending operations', { pendingOperations });
          resolve();
        }
      }, 50);
    });
  }

  const api: NavStackAPI = {
    id,
    async push(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);

        const newEntry: StackEntry = {
          uid: generateCompositeUid(id, groupContext, groupStackId, key, p),
          key,
          params: p,
          metadata
        };

        const previousStack = regEntry.stack.slice();

        // Before push lifecycle
        await lifecycleManager.trigger('onBeforePush', {
          stack: regEntry.stack.slice(),
          current: regEntry.stack[regEntry.stack.length - 1],
          previous: undefined,
          action: { type: 'push', target: newEntry }
        });

        const action = {
          type: "push" as const,
          from: regEntry.stack[regEntry.stack.length - 1],
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;
        if (regEntry.maxStackSize && regEntry.stack.length >= regEntry.maxStackSize) {
          regEntry.stack.splice(0, regEntry.stack.length - regEntry.maxStackSize + 1);
        }
        regEntry.stack.push(newEntry);
        runMiddlewares(action);
        emit(previousStack, { type: 'push', target: newEntry });

        // After push lifecycle
        lifecycleManager.trigger('onAfterPush', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: action.from,
          action: { type: 'push', target: newEntry }
        });

        return true;
      });
    },

   async replace(rawKey, params, metadata) {
     return withLock<boolean>(async () => {
       const { key, params: p } = parseRawKey(rawKey, params);
       const newEntry: StackEntry = { uid: generateCompositeUid(id, groupContext, groupStackId, key, p), key, params: p, metadata };
       const previousEntry = regEntry.stack[regEntry.stack.length - 1];

       // Before replace lifecycle
       await lifecycleManager.trigger('onBeforeReplace', {
         stack: regEntry.stack.slice(),
         current: previousEntry,
         previous: undefined,
         action: { type: 'replace', target: newEntry }
       });

       const action = {
         type: "replace" as const,
         from: previousEntry,
         to: newEntry,
         stackSnapshot: regEntry.stack.slice()
       };

       const ok = await runGuards(action);
       if (!ok) return false;

       const previousStack = regEntry.stack.slice();
       if (regEntry.stack.length === 0) {
         regEntry.stack.push(newEntry);
       } else {
         regEntry.stack[regEntry.stack.length - 1] = newEntry;
       }

       runMiddlewares(action);
       emit(previousStack, { type: 'replace', target: newEntry });

       // After replace lifecycle
       lifecycleManager.trigger('onAfterReplace', {
         stack: regEntry.stack.slice(),
         current: newEntry,
         previous: previousEntry,
         action: { type: 'replace', target: newEntry }
       });

       return true;
     });
   },

    async pop() {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) {
            if (regEntry.parentId) return false;
            return false;
        }
        const top = regEntry.stack[regEntry.stack.length - 1];

        await lifecycleManager.trigger('onBeforePop', {
          stack: regEntry.stack.slice(),
          current: top,
          previous: regEntry.stack[regEntry.stack.length - 2],
          action: { type: 'pop', target: top }
        });

        const action = {
          type: "pop" as const,
          from: top,
          to: regEntry.stack[regEntry.stack.length - 2],
          stackSnapshot: regEntry.stack.slice()
        };
        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();

        regEntry.stack.pop();
        runMiddlewares(action);
        emit(previousStack, { type: 'pop', target: top });
        // After pop lifecycle
        lifecycleManager.trigger('onAfterPop', {
          stack: regEntry.stack.slice(),
          current: regEntry.stack[regEntry.stack.length - 1],
          previous: top,
          action: { type: 'pop', target: top }
        });
        return true;
      });
    },

    async popUntil(predicate) {
      return withLock<boolean>(async () => {
        if (regEntry.stack.length === 0) {
          if (regEntry.parentId) return false;
          return false;
        }

        const previousStack = regEntry.stack.slice();
        let i = regEntry.stack.length - 1;
        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) i--;

        if (i < regEntry.stack.length - 1) {
          const poppedEntries = regEntry.stack.slice(i + 1);
          const targetEntry = regEntry.stack[i];

          // Before popUntil lifecycle for each popped entry
          for (const poppedEntry of poppedEntries) {
            await lifecycleManager.trigger('onBeforePop', {
              stack: previousStack,
              current: poppedEntry,
              previous: targetEntry,
              action: { type: 'popUntil', target: poppedEntry }
            });
          }

          const action = {
            type: "popUntil" as const,
            stackSnapshot: previousStack
          };

          const ok = await runGuards(action);
          if (!ok) return false;

          regEntry.stack.splice(i + 1);

          runMiddlewares(action);
          emit(previousStack, { type: 'popUntil', target: targetEntry });

          // After popUntil lifecycle
          lifecycleManager.trigger('onAfterPop', {
            stack: regEntry.stack.slice(),
            current: targetEntry,
            previous: poppedEntries[poppedEntries.length - 1],
            action: { type: 'popUntil', target: targetEntry }
          });

          // Trigger onExit for each popped entry
          poppedEntries.forEach((poppedEntry: StackEntry) => {
            lifecycleManager.trigger('onExit', {
              stack: regEntry.stack.slice(),
              current: targetEntry,
              previous: poppedEntry,
              action: { type: 'popUntil', target: poppedEntry }
            });
          });

          return true;
        }
        return false;
      });
    },

    async popToRoot() {
      return withLock<boolean>(async () => {
        const action = {
          type: "popToRoot" as const,
          stackSnapshot: regEntry.stack.slice()
        };

        if (regEntry.parentId) return false;

        if (regEntry.stack.length <= 1) return false;

        const previousStack = regEntry.stack.slice();
        const poppedEntries = regEntry.stack.slice(1);
        const targetEntry = regEntry.stack[0];

        // Before popToRoot lifecycle for each popped entry
        for (const poppedEntry of poppedEntries) {
          await lifecycleManager.trigger('onBeforePop', {
            stack: previousStack,
            current: poppedEntry,
            previous: targetEntry,
            action: { type: 'popToRoot', target: poppedEntry }
          });
        }

        const ok = await runGuards(action);
        if (!ok) return false;

        regEntry.stack.splice(1);

        runMiddlewares(action);
        emit(previousStack, { type: 'popToRoot', target: targetEntry });

        // After popToRoot lifecycle
        lifecycleManager.trigger('onAfterPop', {
          stack: regEntry.stack.slice(),
          current: targetEntry,
          previous: poppedEntries[poppedEntries.length - 1],
          action: { type: 'popToRoot', target: targetEntry }
        });

        // Trigger onExit for each popped entry
        poppedEntries.forEach((poppedEntry: StackEntry) => {
          lifecycleManager.trigger('onExit', {
            stack: regEntry.stack.slice(),
            current: targetEntry,
            previous: poppedEntry,
            action: { type: 'popToRoot', target: poppedEntry }
          });
        });

        return true;
      });
    },

    async pushAndPopUntil(rawKey, predicate, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateCompositeUid(id, groupContext, groupStackId, key, p), key, params: p, metadata };

        const previousStack = regEntry.stack.slice();
        const lastTop = regEntry.stack[regEntry.stack.length - 1];

        // Before push lifecycle
        await lifecycleManager.trigger('onBeforePush', {
          stack: previousStack,
          current: lastTop,
          previous: undefined,
          action: { type: 'pushAndPopUntil', target: newEntry }
        });

        const action = {
          type: "push" as const,
          from: lastTop,
          to: newEntry,
          stackSnapshot: previousStack
        };

        const ok = await runGuards(action);
        if (!ok)return false;

        regEntry.stack.push(newEntry);

        runMiddlewares(action);

        emit(previousStack, { type: 'pushAndPopUntil', target: newEntry });

        // Now pop everything above the first match for predicate
        let i = regEntry.stack.length - 2; // start below newEntry
        const poppedEntries: StackEntry[] = [];

        while (i >= 0 && !predicate(regEntry.stack[i], i, regEntry.stack)) {
          poppedEntries.push(regEntry.stack[i]);
          regEntry.stack.splice(i, 1);
          i--;
        }

        // After push lifecycle
        lifecycleManager.trigger('onAfterPush', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: lastTop,
          action: { type: 'pushAndPopUntil', target: newEntry }
        });

        // Trigger onExit for popped entries
        for (const poppedEntry of poppedEntries) {
          lifecycleManager.trigger('onExit', {
            stack: regEntry.stack.slice(),
            current: newEntry,
            previous: poppedEntry,
            action: { type: 'pushAndPopUntil', target: poppedEntry }
          });
        }

        // Emit final stack state after all pop operations are complete
        // This ensures subscribers and persistence layer get the correct final state.
        // We pass the current final stack as "previousStack" so emit detects no page change
        // at the top (since top entry is still newEntry) and only notifies subscribers/persists.
        if (poppedEntries.length > 0) {
          emit(regEntry.stack.slice(), { type: 'popUntil', target: undefined });
        }

        return true;
      });
    },

    async pushAndReplace(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateCompositeUid(id, groupContext, groupStackId, key, p), key, params: p, metadata };
        const previousEntry = regEntry.stack[regEntry.stack.length - 1];

        // Before replace lifecycle
        await lifecycleManager.trigger('onBeforeReplace', {
          stack: regEntry.stack.slice(),
          current: previousEntry,
          previous: undefined,
          action: { type: 'pushAndReplace', target: newEntry }
        });

        const action = {
          type: "replace" as const,
          from: previousEntry,
          to: newEntry,
          stackSnapshot: regEntry.stack.slice()
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();
        if (regEntry.stack.length > 0) regEntry.stack.pop();
        regEntry.stack.push(newEntry);

        runMiddlewares(action);
        emit(previousStack, { type: 'pushAndReplace', target: newEntry });

        // After replace lifecycle
        lifecycleManager.trigger('onAfterReplace', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: previousEntry,
          action: { type: 'pushAndReplace', target: newEntry }
        });

        return true;
      });
    },

    async go(rawKey, params, metadata) {
      return withLock<boolean>(async () => {
        const { key, params: p } = parseRawKey(rawKey, params);
        const newEntry: StackEntry = { uid: generateCompositeUid(id, groupContext, groupStackId, key, p), key, params: p, metadata };
        const previousEntry = regEntry.stack[regEntry.stack.length - 1];

        // Before replace lifecycle (go is essentially a replace)
        await lifecycleManager.trigger('onBeforeReplace', {
          stack: regEntry.stack.slice(),
          current: previousEntry,
          previous: undefined,
          action: { type: 'go', target: newEntry }
        });

        const action = {
          type: "replace" as const,
          from: previousEntry,
          to: newEntry,
          stackSnapshot: regEntry.stack.slice(),
        };

        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();
        const len = regEntry.stack.length;
        regEntry.stack.push(newEntry);
        regEntry.stack.splice(0, len);

        runMiddlewares(action);
        emit(previousStack, { type: 'go', target: newEntry });

        // After replace lifecycle
        lifecycleManager.trigger('onAfterReplace', {
          stack: regEntry.stack.slice(),
          current: newEntry,
          previous: previousEntry,
          action: { type: 'go', target: newEntry }
        });

        return true;
      });
    },

    async replaceParam(newParams: NavParams, merge: boolean = true) {
      return withLock<boolean>(async () => {
        const currentEntry = regEntry.stack[regEntry.stack.length - 1];

        if (!currentEntry) {
          console.warn('replaceParam: No current page in stack');
          return false;
        }

        // Calculate the new parameters
        const finalParams = merge
          ? { ...currentEntry.params, ...newParams }
          : newParams;
        // Check if parameters actually changed
        const paramsChanged = JSON.stringify(currentEntry.params) !== JSON.stringify(finalParams);
        if (!paramsChanged) {
          // No changes needed
          return true;
        }

        // Create updated entry but KEEP THE SAME UID
        // This is the key fix - don't generate new UID for param changes
        const updatedEntry: StackEntry = {
          ...currentEntry, // Keep the same UID and all other properties
          params: finalParams
        };

        // Before replace lifecycle
        await lifecycleManager.trigger('onBeforeReplace', {
          stack: regEntry.stack.slice(),
          current: currentEntry,
          previous: undefined,
          action: { type: 'replaceParam', target: updatedEntry }
        });

        const action = {
          type: "replaceParam" as const,
          from: currentEntry,
          to: updatedEntry,
          stackSnapshot: regEntry.stack.slice()
        };

        // Run guards
        const ok = await runGuards(action);
        if (!ok) return false;

        const previousStack = regEntry.stack.slice();

        // Replace the current entry with updated parameters (same position, same UID)
        regEntry.stack[regEntry.stack.length - 1] = updatedEntry;

        // Run middlewares
        runMiddlewares(action);

        // Emit changes to listeners - this should NOT trigger transitions
        // since the UID remains the same
        emit(previousStack, { type: 'replaceParam', target: updatedEntry });

        // After replace lifecycle
        lifecycleManager.trigger('onAfterReplace', {
          stack: regEntry.stack.slice(),
          current: updatedEntry,
          previous: currentEntry,
          action: { type: 'replaceParam', target: updatedEntry }
        });

        return true;
      });
    },

    provideObject<T>(key: string, getter: () => T | Promise<T>, options?: ObjectOptions) {
      const { stack = false, scope, global = false } = options || {};
      const current = regEntry.stack[regEntry.stack.length - 1];

      return globalObjectRegistry.registerWithOptions(id, key, getter, {
        scopeId: scope || current?.uid,
        isStackScoped: stack,
        isGlobal: global
      });
    },

    getObject<T>(key: string, options?: ObjectOptions): T | undefined {
      const { stack = false, scope, global = false } = options || {};

      return globalObjectRegistry.getWithOptions<T>(id, key, {
        scopeId: scope,
        isStackScoped: stack,
        isGlobal: global
      });
    },

    hasObject(key: string, options?: ObjectOptions): boolean {
      const { stack = false, scope, global = false } = options || {};

      return globalObjectRegistry.hasWithOptions(id, key, {
        scopeId: scope,
        isStackScoped: stack,
        isGlobal: global
      });
    },

    removeObject(key: string): void {
      globalObjectRegistry.unregister(id, key); // Changed from remove() to unregister()
    },

    clearObjects(): void {
      globalObjectRegistry.clearStack(id);
    },

    listObjects(): string[] {
      return globalObjectRegistry.getRegisteredKeys(id);
    },

    onObjectProvision<T>(
      key: string,
      callback: (value: T) => void,
      options?: ObjectOptions
    ): () => void {
      const { stack = false, scope, global = false } = options || {};

      // Build the pattern key
      let patternKey: string;
      if (global) {
        patternKey = `global:${key}`;
      } else if (stack) {
        patternKey = `${id}:${key}`;
      } else if (scope) {
        patternKey = `${id}:${scope}:${key}`;
      } else {
        patternKey = `${id}:${key}`;
      }

      // Subscribe to getter registration in message bus model
      // When getter is registered, callback is called (backward compat wrapper for callback signature)
      return globalObjectRegistry.onGetterRegistered(patternKey, () => {
        // In message bus model, getter is now available
        // For backward compatibility, we notify the consumer that something changed
        callback(undefined as T);
      });
    },

    onGetterRegistered(
      key: string,
      callback: () => void,
      options?: ObjectOptions
    ): () => void {
      const { stack = false, scope, global = false } = options || {};

      // Build the pattern key
      let patternKey: string;
      if (global) {
        patternKey = `global:${key}`;
      } else if (stack) {
        patternKey = `${id}:${key}`;
      } else if (scope) {
        patternKey = `${id}:${scope}:${key}`;
      } else {
        patternKey = `${id}:${key}`;
      }

      // Subscribe to getter registration events
      return globalObjectRegistry.onGetterRegistered(patternKey, callback);
    },

    // ============ Optional Request/Response Pattern ============

    provideRequestHandler<TRequest = any, TResponse = any>(
      key: string,
      handler: (request: TRequest) => TResponse | Promise<TResponse>,
      options?: ObjectOptions
    ): () => void {
      const { stack = false, scope, global = false } = options || {};

      // Build the pattern key
      let patternKey: string;
      if (global) {
        patternKey = `global:${key}`;
      } else if (stack) {
        patternKey = `${id}:${key}`;
      } else if (scope) {
        patternKey = `${id}:${scope}:${key}`;
      } else {
        patternKey = `${id}:${key}`;
      }

      return globalObjectRegistry.registerRequestHandler(patternKey, handler);
    },

    async sendRequest<TRequest = any, TResponse = any>(
      key: string,
      request: TRequest,
      options?: ObjectOptions
    ): Promise<TResponse> {
      const { stack = false, scope, global = false } = options || {};

      // Build the pattern key
      let patternKey: string;
      if (global) {
        patternKey = `global:${key}`;
      } else if (stack) {
        patternKey = `${id}:${key}`;
      } else if (scope) {
        patternKey = `${id}:${scope}:${key}`;
      } else {
        patternKey = `${id}:${key}`;
      }

      return globalObjectRegistry.sendRequest<TRequest, TResponse>(patternKey, request);
    },

    onRequestHandlerRegistered(
      key: string,
      callback: () => void,
      options?: ObjectOptions
    ): () => void {
      const { stack = false, scope, global = false } = options || {};

      // Build the pattern key
      let patternKey: string;
      if (global) {
        patternKey = `global:${key}`;
      } else if (stack) {
        patternKey = `${id}:${key}`;
      } else if (scope) {
        patternKey = `${id}:${scope}:${key}`;
      } else {
        patternKey = `${id}:${key}`;
      }

      return globalObjectRegistry.onRequestHandlerRegistered(patternKey, callback);
    },

    // ============ OBJECT-ENABLED NAVIGATION METHODS ============

    async pushWith(
      rawKey: string,
      params?: NavParams,
      options?: {
        requireObjects?: string[];
        provideObjects?: Record<string, () => any>;
        metadata?: StackEntry['metadata'];
      }
    ): Promise<boolean> {
      const { requireObjects = [], provideObjects = {}, metadata } = options || {};

      // Verify required objects exist
      for (const key of requireObjects) {
        if (!globalObjectRegistry.hasGetter(id, key)) {
          console.warn(`Cannot push ${rawKey}: Required object "${key}" not found`);
          return false;
        }
      }

      // Create enhanced params with object references
      const enhancedParams = {
        ...params,
        __providedObjects: Object.keys(provideObjects),
      };

      // Push first
      const success = await api.push(rawKey, enhancedParams, metadata);
      if (!success) return false;

      // Register provided objects on the new page
      const current = regEntry.stack[regEntry.stack.length - 1];
      if (current) {
        Object.entries(provideObjects).forEach(([key, getter]) => {
          globalObjectRegistry.register(id, key, getter, current.uid);
        });
      }

      return true;
    },

    async replaceWith(
      rawKey: string,
      params?: NavParams,
      options?: {
        requireObjects?: string[];
        provideObjects?: Record<string, () => any>;
        metadata?: StackEntry['metadata'];
      }
    ): Promise<boolean> {
      const { requireObjects = [], provideObjects = {}, metadata } = options || {};

      // Verify required objects exist
      for (const key of requireObjects) {
        if (!globalObjectRegistry.hasGetter(id, key)) {
          console.warn(`Cannot replace with ${rawKey}: Required object "${key}" not found`);
          return false;
        }
      }

      // Create enhanced params
      const enhancedParams = {
        ...params,
        __providedObjects: Object.keys(provideObjects),
      };

      // Replace
      const success = await api.replace(rawKey, enhancedParams, metadata);
      if (!success) return false;

      // Register provided objects
      const current = regEntry.stack[regEntry.stack.length - 1];
      if (current) {
        Object.entries(provideObjects).forEach(([key, getter]) => {
          globalObjectRegistry.register(id, key, getter, current.uid);
        });
      }

      return true;
    },

    async goWith(
      rawKey: string,
      params?: NavParams,
      options?: {
        requireObjects?: string[];
        provideObjects?: Record<string, () => any>;
        metadata?: StackEntry['metadata'];
      }
    ): Promise<boolean> {
      const { requireObjects = [], provideObjects = {}, metadata } = options || {};

      // Verify required objects exist
      for (const key of requireObjects) {
        if (!globalObjectRegistry.hasGetter(id, key)) {
          console.warn(`Cannot go with ${rawKey}: Required object "${key}" not found`);
          return false;
        }
      }

      // Create enhanced params
      const enhancedParams = {
        ...params,
        __providedObjects: Object.keys(provideObjects),
      };

      // Replace
      const success = await api.go(rawKey, enhancedParams, metadata);
      if (!success) return false;

      // Register provided objects
      const current = regEntry.stack[regEntry.stack.length - 1];
      if (current) {
        Object.entries(provideObjects).forEach(([key, getter]) => {
          globalObjectRegistry.register(id, key, getter, current.uid);
        });
      }

      return true;
    },


    peek() {
      return regEntry.stack[regEntry.stack.length - 1];
    },

    getStack() {
      return regEntry.stack.slice();
    },

    length() {
      return regEntry.stack.length;
    },

    subscribe(fn) {
      regEntry.listeners.add(fn);
      try { fn(regEntry.stack.slice()); } catch(e) {}
      return () => regEntry.listeners.delete(fn);
    },

    registerGuard(fn) {
      regEntry.guards.add(fn);
      return () => regEntry.guards.delete(fn);
    },

    registerMiddleware(fn) {
      regEntry.middlewares.add(fn);
      return () => regEntry.middlewares.delete(fn);
    },

    syncWithBrowserHistory(enabled) {
      regEntry.historySyncEnabled = enabled;
      if (enabled ) {
        try {
          const localPath = buildUrlPath([{ navLink, stack: regEntry.stack }]);
          updateNavQueryParamForStack(id, localPath, groupContext, groupStackId);
        } catch {
          updateNavQueryParamForStack(id, buildUrlPath([{ navLink, stack: regEntry.stack }]), groupContext, groupStackId);
        }
      }
    },

    isTop(uid) {
      if (uid) {
        const top = this.peek();
        return top?.uid === uid;
      }

      try {
        const currentUid = useContext(CurrentPageContext);
        if (currentUid) {
          const top = this.peek();
          return top?.uid === currentUid;
        }
      } catch (e) {
        console.warn("nav.isTop() called outside of page context.");
      }

      return false;
    },

    getFullPath() {
      const allStacks: Array<{navLink: NavigationMap, stack: StackEntry[]}> = [];
      let currentId: string | null = id;
      let currentNavLink = navLink;

      while (currentId) {
        const reg = globalRegistry.get(currentId);
        if (!reg) break;

        if (reg.historySyncEnabled) {
          allStacks.unshift({ navLink: reg.navLink || currentNavLink, stack: reg.stack });
        }

        currentId = reg.parentId;
      }

      if (allStacks.length === 0) {
        allStacks.push({ navLink: navLink, stack: regEntry.stack });
      }

      return buildUrlPath(allStacks);
    },

    getNavLink() {
      return navLink;
    },

    isActiveStack() {
      if (!regEntry.historySyncEnabled) return false;

      const childIds = Array.from(regEntry.childIds || []) as string[];
      for (const childId of childIds) {
        const childReg = globalRegistry.get(childId as string);
        if (childReg?.historySyncEnabled) return false;
      }

      return true;
    },

    isInGroup() {
      return groupContext !== null;
    },

    getGroupId() {
      return groupContext ? groupContext.getGroupId() : null;
    },

    goToGroupId(groupId: string, callback?: (api: NavStackAPI) => Promise<void> | void): Promise<NavStackAPI > {
      if (!groupContext) {
        return Promise.reject(new Error(`Stack ${id} is not in a group`));
      }

      // The groupId IS the stackId - each NavigationStack in the group has a unique id
      const targetStack = globalRegistry.get(groupId);
      const targetApi = targetStack?.api;
      
      if (!targetApi) {
        return Promise.reject(new Error(`Stack ${groupId} not found in group`));
      }

      // Switch to the group
      return groupContext.goToGroupId(groupId).then(async (success) => {
        if (!success) {
          throw new Error(`Failed to switch to group ${groupId}`);
        }

        // Execute callback if provided
        if (callback) {
          await callback(targetApi);
          return;
        }

        return targetApi;
      });
    },

    addOnCreate: (handler) => lifecycleManager.addHandler('onCreate', handler),
    addOnDispose: (handler) => lifecycleManager.addHandler('onDispose', handler),
    addOnPause: (handler) => lifecycleManager.addHandler('onPause', handler),
    addOnResume: (handler) => lifecycleManager.addHandler('onResume', handler),
    addOnEnter: (handler) => lifecycleManager.addHandler('onEnter', handler),
    addOnExit: (handler) => lifecycleManager.addHandler('onExit', handler),
    addOnBeforePush: (handler) => lifecycleManager.addHandler('onBeforePush', handler),
    addOnAfterPush: (handler) => lifecycleManager.addHandler('onAfterPush', handler),
    addOnBeforePop: (handler) => lifecycleManager.addHandler('onBeforePop', handler),
    addOnAfterPop: (handler) => lifecycleManager.addHandler('onAfterPop', handler),
    addOnBeforeReplace: (handler) => lifecycleManager.addHandler('onBeforeReplace', handler),
    addOnAfterReplace: (handler) => lifecycleManager.addHandler('onAfterReplace', handler),

    clearAllLifecycleHandlers: (hook) => lifecycleManager.clear(hook),
    getLifecycleHandlers: (hook) => lifecycleManager.getHandlers(hook),
    _getLifecycleManager: () => lifecycleManager,

    dispose() {

      globalObjectRegistry.clearStack(id);

      lifecycleManager.trigger('onDispose', {
        stack: regEntry.stack.slice(),
        current: regEntry.stack[regEntry.stack.length - 1]
      });

      lifecycleManager.dispose();
      transitionManager.dispose();
      memoryManager.dispose();
      regEntry.listeners.clear();
      regEntry.guards.clear();
      regEntry.middlewares.clear();

      try {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem(storageKeyFor(id));
            }
      } catch (e) {
            console.warn(`Failed to clear persisted storage for stack ${id}:`, e);
      }

      if (regEntry.parentId) {
        const parentReg = globalRegistry.get(regEntry.parentId);
        if (parentReg) {
          parentReg.childIds.delete(id);
        }
      }

      regEntry.childIds?.forEach((childId : string) => {
        const childReg = globalRegistry.get(childId as string);
        if (childReg) {
          childReg.parentId = null;
        }
      });

      try {
        updateNavQueryParamForStack(id, null, groupContext, groupStackId);
      } catch {}

      globalRegistry.delete(id);
    },

    clearAllPersistedStacks() {
        if (typeof window === "undefined") return;

        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('navstack:')) {
              sessionStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.warn('Failed to clear all persisted stacks:', e);
        }
      }
  };

  regEntry.api = api;
  (api as any).lifecycleManager = lifecycleManager;
  return api;
}

function LazyRouteLoader({ lazyComponent }: { lazyComponent: () => LazyComponent }) {
  const LazyComponent = lazy(lazyComponent);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

function MissingRoute({
  entry,
  isTop,
  api,
  config = {}
}: {
  entry: StackEntry;
  isTop: boolean;
  api: NavStackAPI;
  config?: MissingRouteConfig;
}) {
  const defaultLabels = {
    missingRoute: 'Missing route',
    goBack: 'Go Back',
    goToRoot: 'Go to Root'
  };

  const {
    className = '',
    containerClassName = '',
    textClassName = '',
    buttonClassName = '',
    labels = {}
  } = config;

  const mergedLabels = { ...defaultLabels, ...labels };

  const handleNavigation = () => {
    if (api.length() > 1) {
      api.pop();
    } else {
      api.popToRoot();
    }
  };

  return (
    <div
      className={`navstack-page ${className} ${containerClassName}`}
      inert={!isTop}
      data-nav-uid={entry.uid}
    >
      <div className={`navstack-missing-route ${textClassName}`} style={{ padding: 16 }}>
        <strong>{mergedLabels.missingRoute}:</strong> {entry.key}
        <button
          className={`navstack-missing-route-button ${buttonClassName}`}
          onClick={handleNavigation}
        >
          {api.length() > 1 ? mergedLabels.goBack : mergedLabels.goToRoot}
        </button>
      </div>
    </div>
  );
}

function SlideTransitionRenderer({
  children,
  state,
  isTop,
  uid,
  baseClass,
}: {
  children: React.ReactNode;
  state: TransitionState;
  isTop: boolean;
  uid: string;
  baseClass: string;
}) {
  const [stage, setStage] = useState<"init" | "active" | "done">(state === "enter" ? "init" : "done");

  useEffect(() => {
    if (state === "enter") {
      setStage("init");
      const frame = requestAnimationFrame(() => {
        setStage("active");
        setTimeout(() => setStage("done"), DEFAULT_TRANSITION_DURATION);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [state]);

  const slideCls =
    state === "enter"
      ? stage === "init"
        ? "nav-slide-enter"
        : stage === "active"
        ? "nav-slide-enter-active"
        : ""
      : state === "exit"
      ? "nav-slide-exit nav-slide-exit-active"
      : "";

  return (
    <div key={uid} className={`${baseClass} ${slideCls}`} inert={!isTop} data-nav-uid={uid}>
      {children}
    </div>
  );
}

function FadeTransitionRenderer({
  children,
  state,
  isTop,
  uid,
  baseClass
}: {
  children: React.ReactNode;
  state: TransitionState;
  isTop: boolean;
  uid: string;
  baseClass: string;
}) {
  const [stage, setStage] = useState<"active" | "done">(state === "enter" ? "active" : "done");

  useEffect(() => {
    if (state === "enter") {
      setStage("active");
      setTimeout(() => setStage("done"), DEFAULT_TRANSITION_DURATION);
    }
  }, [state]);

  const fadeCls =
    state === "enter"
      ? stage === "active"
        ? "nav-fade-enter nav-fade-enter-active"
        : ""
      : state === "exit"
      ? "nav-fade-exit nav-fade-exit-active"
      : "";

  return (
    <div key={uid} className={`${baseClass} ${fadeCls}`} inert={!isTop} data-nav-uid={uid}>
      {children}
    </div>
  );
}

// ==================== Error Boundary & Safety Utilities ====================

/**
 * Error Boundary Component for lazy-loaded components and navigation
 * Prevents crashes from propagating up the component tree
 */
export class NavigationErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[NavigationErrorBoundary] Error caught:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: '#d32f2f',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

/**
 * Check if code is running in browser (not SSR)
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Safe window access for SSR-safe code
 */
export function safeWindow<T>(
  callback: (win: Window) => T,
  fallback?: T
): T | undefined {
  if (!isBrowser()) {
    return fallback;
  }
  try {
    return callback(window);
  } catch (err) {
    console.warn('[SafeWindow] Error accessing window:', err);
    return fallback;
  }
}

export function useNav() {
  const context = useContext(NavContext);
  if (!context) throw new Error("useNav must be used within a NavigationStack");
  return context;
}

/**
 * Debug hook to inspect available objects in current stack
 * Useful for troubleshooting object availability
 */
export function useDebugObjects() {
  const nav = useContext(NavContext);
  
  if (!nav) {
    return {
      stackId: null,
      availableObjects: [],
      hasGlobal: false,
      hasStackScoped: false,
      isInGroup: false,
      groupId: null,
    };
  }

  const objects = nav.listObjects();
  
  return {
    stackId: nav.id,
    availableObjects: objects,
    hasGlobal: objects.length > 0,
    hasStackScoped: objects.length > 0,
    isInGroup: nav.isInGroup(),
    groupId: nav.getGroupId(),
    registeredCount: objects.length,
  };
}

// ==================== Custom Hooks ====================

/**
 * Hook for managing page lifecycle events
 * Supports both stack-level events (push, pop, replace) and group-level events (pause, resume)
 * @param nav - The navigation stack API
 * @param callbacks - Object containing lifecycle callback functions
 * @param dependencies - Additional dependencies for the callbacks
 */
export function usePageLifecycle(
  nav: NavStackAPI,
  callbacks: {
    onEnter?: (context: any) => void;
    onExit?: (context: any) => void;
    onPause?: (context: any) => void;
    onResume?: (context: any) => void;
    onBeforePush?: (context: any) => Promise<void>;
    onAfterPush?: (context: any) => void;
    onBeforePop?: (context: any) => Promise<void>;
    onAfterPop?: (context: any) => void;
    onBeforeReplace?: (context: any) => Promise<void>;
    onAfterReplace?: (context: any) => void;
  },
  dependencies: any[] = []
) {
  const stableCallbacks = useMemo(() => callbacks, dependencies);
  const currentPageUid = useContext(CurrentPageContext);
  const groupContext = useContext(GroupNavigationContext);
  const groupStackId = useContext(GroupStackIdContext);
  const isMounted = useRef(false);
  const hasTriggeredInitialEnter = useRef(false);
  const hasOnEnterBeenCalled = useRef(false); // Track if onEnter has EVER been called for this page
  const isStackActive = useRef(true);

  // Helper to check if stack is active in its group
  const isStackCurrentlyActive = () => {
    if (!groupContext || !groupStackId) {
      return true; // Not in a group, always active
    }
    return groupContext.isActiveStack(groupStackId);
  };

  useEffect(() => {
    isMounted.current = true;
    const cleanupFunctions: (() => void)[] = [];

    // Get current page info
    const currentEntry = nav.peek();
    const isCurrentPageActive = currentEntry?.uid === currentPageUid;
    const stackIsActive = isStackCurrentlyActive();

    // Helper to check if context belongs to current page
    const isOurPageEntering = (context: any) =>
      context.current?.uid === currentPageUid;

    const isOurPageExiting = (context: any) =>
      context.previous?.uid === currentPageUid;

    const isOurPageCurrent = (context: any) =>
      context.current?.uid === currentPageUid;

    // Handle initial page load - only for the current page and only if stack is active
    if (isCurrentPageActive && currentEntry && stableCallbacks.onEnter && !hasOnEnterBeenCalled.current && stackIsActive) {
      hasOnEnterBeenCalled.current = true;

      const initialContext = {
        stack: nav.getStack(),
        current: currentEntry,
        previous: undefined,
        action: { type: 'initial' }
      };

      // Use microtask to ensure component is mounted
      Promise.resolve().then(() => {
        if (isMounted.current) {
          stableCallbacks.onEnter!(initialContext);
        }
      });
    }

    // Register scoped lifecycle handlers

    // PAGE TRANSITION EVENTS (scoped to specific page)
    if (stableCallbacks.onEnter) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        
        // CRITICAL CHECK: onEnter can only fire ONCE per page lifecycle
        // Once it has been called, it NEVER fires again
        if (hasOnEnterBeenCalled.current) {
          return;
        }
        
        // Stack must be CURRENTLY active in group
        if (!isStackCurrentlyActive()) {
          return;
        }
        
        // This must be our page entering
        if (!isOurPageEntering(context)) {
          return;
        }
        
        // Mark that onEnter has been called - permanently
        hasOnEnterBeenCalled.current = true;
        
        // Now fire onEnter - and it will never fire again for this page
        stableCallbacks.onEnter!(context);
      };
      cleanupFunctions.push(nav.addOnEnter(handler));
    }

    if (stableCallbacks.onExit) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // Only fire if stack was active when exiting
        if (!isStackCurrentlyActive()) return;
        if (isOurPageExiting(context)) {
          stableCallbacks.onExit!(context);
        }
      };
      cleanupFunctions.push(nav.addOnExit(handler));
    }

    // APP-LEVEL EVENTS (not scoped - fire for active page)
    if (stableCallbacks.onPause) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // Only if stack is active (not paused by group switch) and page is on top
        if (!isStackCurrentlyActive()) return;
        const currentTopPage = nav.peek();
        if (currentTopPage?.uid === currentPageUid) {
          stableCallbacks.onPause!(context);
        }
      };
      cleanupFunctions.push(nav.addOnPause(handler));
    }

    if (stableCallbacks.onResume) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // Only if stack is active (not paused by group switch) and page is on top
        if (!isStackCurrentlyActive()) return;
        const currentTopPage = nav.peek();
        if (currentTopPage?.uid === currentPageUid) {
          stableCallbacks.onResume!(context);
        }
      };
      cleanupFunctions.push(nav.addOnResume(handler));
    }

    // NAVIGATION ACTION EVENTS (scoped to initiating page)
    if (stableCallbacks.onBeforePush) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onBeforePush: only when pushing FROM our current page
        if (isOurPageCurrent(context)) {
          return stableCallbacks.onBeforePush!(context);
        }
      };
      cleanupFunctions.push(nav.addOnBeforePush(handler));
    }

    if (stableCallbacks.onAfterPush) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onAfterPush: only when push was initiated FROM our page
        if (context.previous?.uid === currentPageUid) {
          stableCallbacks.onAfterPush!(context);
        }
      };
      cleanupFunctions.push(nav.addOnAfterPush(handler));
    }

    if (stableCallbacks.onBeforePop) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onBeforePop: only when popping FROM our current page
        if (isOurPageCurrent(context)) {
          return stableCallbacks.onBeforePop!(context);
        }
      };
      cleanupFunctions.push(nav.addOnBeforePop(handler));
    }

    if (stableCallbacks.onAfterPop) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onAfterPop: only when our page was popped
        if (isOurPageExiting(context)) {
          stableCallbacks.onAfterPop!(context);
        }
      };
      cleanupFunctions.push(nav.addOnAfterPop(handler));
    }

    if (stableCallbacks.onBeforeReplace) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onBeforeReplace: only when replacing our current page
        if (isOurPageCurrent(context)) {
          return stableCallbacks.onBeforeReplace!(context);
        }
      };
      cleanupFunctions.push(nav.addOnBeforeReplace(handler));
    }

    if (stableCallbacks.onAfterReplace) {
      const handler = (context: any) => {
        if (!isMounted.current) return;
        // onAfterReplace: only when our page was replaced
        if (isOurPageExiting(context)) {
          stableCallbacks.onAfterReplace!(context);
        }
      };
      cleanupFunctions.push(nav.addOnAfterReplace(handler));
    }

    return () => {
      isMounted.current = false;
      hasTriggeredInitialEnter.current = false;
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [nav, stableCallbacks, currentPageUid]);

  // Track group-level visibility changes (pause/resume when stack becomes inactive/active)
  useEffect(() => {
    if (!groupContext || !groupStackId || !stableCallbacks.onPause && !stableCallbacks.onResume) {
      return; // Not in a group or no pause/resume callbacks
    }

    if (!isMounted.current) return;

    // Check if the page is currently visible in its group
    const wasActive = isStackActive.current;
    const isCurrentlyActive = groupContext.isActiveStack(groupStackId);

    // Only fire events if page is the active page in its stack
    const currentTopPage = nav.peek();
    const isTopPage = currentTopPage?.uid === currentPageUid;

    if (!isTopPage) {
      return; // Only fire group events for the top page
    }

    // Stack became inactive (switched to another stack in group)
    if (wasActive && !isCurrentlyActive && stableCallbacks.onPause) {
      isStackActive.current = false;
      stableCallbacks.onPause({
        stack: nav.getStack(),
        current: currentTopPage,
        reason: 'group-switch',
        action: { type: 'group-paused' }
      });
    }

    // Stack became active (returned to this stack in group)
    if (!wasActive && isCurrentlyActive && stableCallbacks.onResume) {
      isStackActive.current = true;
      stableCallbacks.onResume({
        stack: nav.getStack(),
        current: currentTopPage,
        reason: 'group-switch',
        action: { type: 'group-resumed' }
      });
    }
  }, [
    groupContext, // Watch for all group context changes (including activeStackId changes)
    groupStackId,
    nav,
    stableCallbacks,
    currentPageUid
  ]);
}

/**
 * Advanced hook with page state management
 * @param nav - The navigation stack API
 * @param pageKey - Optional page key to filter events
 */
export function usePageState(nav: NavStackAPI, pageKey?: string) {
  const [state, setState] = useState({
    isActive: false,
    isPaused: false,
    enterTime: null as number | null,
    exitTime: null as number | null
  });

  usePageLifecycle(nav, {
    onEnter: (context) => {
      if (pageKey && context.current?.key !== pageKey) return;

      setState(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        enterTime: Date.now(),
        exitTime: null
      }));
    },

    onExit: (context) => {
      if (pageKey && context.current?.key !== pageKey) return;

      setState(prev => ({
        ...prev,
        isActive: false,
        exitTime: Date.now()
      }));
    },

    onPause: () => {
      setState(prev => ({ ...prev, isPaused: true }));
    },

    onResume: () => {
      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [pageKey]);

  return state;
}

/**
 * Hook for page-specific lifecycle with automatic cleanup
 * @param nav - The navigation stack API
 * @param pageKey - The specific page key to watch
 * @param callbacks - Lifecycle callbacks
 */
export function usePageSpecificLifecycle(
  nav: NavStackAPI,
  pageKey: string,
  callbacks: {
    onEnter?: (context: any) => void;
    onExit?: (context: any) => void;
    onPause?: (context: any) => void;
    onResume?: (context: any) => void;
  }
) {
  usePageLifecycle(nav, {
    onEnter: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onEnter?.(context);
      }
    },
    onExit: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onExit?.(context);
      }
    },
    onPause: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onPause?.(context);
      }
    },
    onResume: (context) => {
      if (context.current?.key === pageKey) {
        callbacks.onResume?.(context);
      }
    }
  }, [pageKey]);
}

// ==================== Enhanced Object Hooks ====================

interface UseObjectOptions {
  stack?: boolean;
  scope?: string;
  global?: boolean;
}

/**
 * Enhanced hook to provide an object with scoping options
 */
export function useProvideObject<T>(
  key: string,
  getter: () => T,
  options?: UseObjectOptions & { dependencies?: any[] }
): void {
  const nav = useContext(NavContext);
  const { dependencies = [], ...objectOptions } = options || {};
  const currentPageUid = useContext(CurrentPageContext);

  useEffect(() => {
    if (!nav) return;

    // If no scoping options specified, default to page scope
    const finalOptions = { ...objectOptions };

    if (!finalOptions.stack && !finalOptions.scope && !finalOptions.global) {
      // Default to page scope using current page UID
      if (currentPageUid) {
        finalOptions.scope = currentPageUid;
      }
    }

    const cleanup = nav.provideObject(key, getter, finalOptions);
    return cleanup;
  }, [nav, key, currentPageUid, ...dependencies]);
}

type UseObjectResult<T> =
  | { isProvided: false; getter: undefined }
  | { isProvided: true; getter: () => T };

export function useObject<T>(
  key: string,
  options?: UseObjectOptions
): UseObjectResult<T> {
  const nav = useContext(NavContext);
  const currentPageUid = useContext(CurrentPageContext);
  const [getter, setGetter] = useState<(() => T) | undefined>(undefined);
  const [isProvided, setIsProvided] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const optionsRef = useRef(options);

  if (!nav) {
    throw new Error("useObject must be used within a NavigationStack");
  }

  // Memoize string representation of options to detect actual changes
  const optionsString = useMemo(() => JSON.stringify(options), [options]);

  // Update ref when options actually change
  useEffect(() => {
    optionsRef.current = options;
  }, [optionsString]);

  const finalOptions = useMemo(() => {
    const opts = { ...optionsRef.current };

    // If requesting stack-scoped without explicit scope, use current stack
    if (opts.stack && !opts.scope && !opts.global) {
      opts.scope = nav.id;
    }

    return opts;
  }, [nav.id, optionsString]);

  useEffect(() => {
    // Reset mounted flag when effect runs
    isMountedRef.current = true;
    
    if (!nav) return;

    // Try to get the getter
    const foundGetter = nav.getObject<() => T>(key, finalOptions);

    if (!foundGetter) {
      // Getter not yet provided - wait for it
      setGetter(undefined);
      setIsProvided(false);

      // Subscribe to getter registration
      unsubscribeRef.current = nav.onGetterRegistered?.(key, () => {
        // Getter registered - force effect rerun
        if (isMountedRef.current) {
          setGetter(undefined);
        }
      }, finalOptions) || (() => {});
      return;
    }

    // Clean up old subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Provider has established the link - set getter and isProvided
    setGetter(() => foundGetter);
    setIsProvided(true);
  }, [nav, key, finalOptions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [key]);

  return { getter, isProvided } as UseObjectResult<T>;
}

// ==================== Request/Response Pattern Hooks ====================

/**
 * Provider hook: Register a request handler
 * The handler receives requests from consumers and returns responses
 * 
 * Example:
 * useProvideRequestHandler('user-action', async (request: {action: string}) => {
 *   // Handle request and return response
 *   return {success: true, result: ...}
 * })
 */
export function useProvideRequestHandler<TRequest = any, TResponse = any>(
  key: string,
  handler: (request: TRequest) => TResponse | Promise<TResponse>,
  options?: UseObjectOptions & { dependencies?: any[] }
): void {
  const nav = useContext(NavContext);
  const { dependencies = [], ...objectOptions } = options || {};
  const currentPageUid = useContext(CurrentPageContext);

  useEffect(() => {
    if (!nav || !nav.provideRequestHandler) return;

    // If no scoping options specified, default to page scope
    const finalOptions = { ...objectOptions };

    if (!finalOptions.stack && !finalOptions.scope && !finalOptions.global) {
      // Default to page scope using current page UID
      if (currentPageUid) {
        finalOptions.scope = currentPageUid;
      }
    }

    const cleanup = nav.provideRequestHandler<TRequest, TResponse>(key, handler, finalOptions);
    return cleanup;
  }, [nav, key, currentPageUid, ...dependencies]);
}

/**
 * Consumer hook: Send a request and wait for response
 * Returns [sendRequest, isHandlerAvailable] tuple
 * 
 * Example:
 * const [sendRequest, isAvailable] = useSendRequest('user-action')
 * 
 * // When ready to send:
 * const response = await sendRequest({action: 'delete'})
 */
export function useSendRequest<TRequest = any, TResponse = any>(
  key: string,
  options?: UseObjectOptions
): [(request: TRequest) => Promise<TResponse>, boolean] {
  const nav = useContext(NavContext);
  const [isHandlerAvailable, setIsHandlerAvailable] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);

  if (!nav) {
    throw new Error("useSendRequest must be used within a NavigationStack");
  }

  const finalOptions = useMemo(() => {
    const opts = { ...options };

    // If requesting stack-scoped without explicit scope, use current stack
    if (opts.stack && !opts.scope && !opts.global) {
      opts.scope = nav.id;
    }

    return opts;
  }, [options, nav.id]);

  // Check if handler is available and subscribe for registration
  useEffect(() => {
    isMountedRef.current = true;

    if (!nav.onRequestHandlerRegistered) {
      setIsHandlerAvailable(false);
      return;
    }

    // Subscribe to handler registration
    unsubscribeRef.current = nav.onRequestHandlerRegistered(key, () => {
      if (isMountedRef.current) {
        setIsHandlerAvailable(true);
      }
    }, finalOptions) || (() => {});

    return () => {
      isMountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [nav, key, finalOptions]);

  // The send function
  const sendRequest = useCallback(
    async (request: TRequest): Promise<TResponse> => {
      if (!nav.sendRequest) {
        throw new Error("sendRequest is not available");
      }
      return nav.sendRequest<TRequest, TResponse>(key, request, finalOptions);
    },
    [nav, key, finalOptions]
  );

  return [sendRequest, isHandlerAvailable];
}

/**
 * Hook to get an object with multiple fallback strategies
 * Returns [data, isProvided] tuple for better control
 * Optimized to prevent excessive re-renders
 */
export function useObjectWithFallback<T>(
  key: string,
  fallbackStrategies: UseObjectOptions[] = [
    {}, // Try page scope
    { stack: true }, // Try stack scope
    { global: true }, // Try global scope
  ]
): [T | undefined, boolean] {
  const nav = useContext(NavContext);
  const [data, setData] = useState<T | undefined>(undefined);
  const [isProvided, setIsProvided] = useState(false);
  const resolutionRef = useRef<{ key: string; strategies: string } | null>(null);

  if (!nav) {
    throw new Error("useObjectWithFallback must be used within a NavigationStack");
  }

  const strategiesKey = useMemo(() => JSON.stringify(fallbackStrategies), [fallbackStrategies]);

  useEffect(() => {
    if (!nav) return;

    // Skip if we're already resolving the same key with same strategies
    if (resolutionRef.current?.key === key && resolutionRef.current?.strategies === strategiesKey) {
      return;
    }

    resolutionRef.current = { key, strategies: strategiesKey };

    for (const strategy of fallbackStrategies) {
      const getter = nav.getObject<T>(key, strategy);
      
      if (getter !== undefined) {
        // Check if it's a promise
        if (getter && typeof getter === 'object' && 'then' in getter) {} else {
          setData(getter as T);
          setIsProvided(true);
        }
        return;
      }
    }

    setData(undefined);
    setIsProvided(false);
  }, [nav, key, fallbackStrategies, strategiesKey]);

  return [data, isProvided];
}

/**
 * Hook to check if object exists with specific scoping
 */
export function useObjectExists(
  key: string,
  options?: UseObjectOptions
): boolean {
  const nav = useContext(NavContext);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!nav) return;

    setExists(nav.hasObject(key, options));

    // Optional: Watch for changes
    const checkInterval = setInterval(() => {
      setExists(nav.hasObject(key, options));
    }, 100);

    return () => clearInterval(checkInterval);
  }, [nav, key, options]);

  return exists;
}

/**
 * Hook to get an object synchronously without promise handling
 * Useful when you know the object is sync and already provided
 * For promise support or async handling, use useObject instead
 */
export function useObjectSync<T>(
  key: string,
  options?: UseObjectOptions
): T | undefined {
  const nav = useContext(NavContext);

  if (!nav) {
    throw new Error("useObjectSync must be used within a NavigationStack");
  }

  const finalOptions = useMemo(() => {
    const opts = { ...options };

    if (opts.stack && !opts.scope && !opts.global) {
      opts.scope = nav.id;
    }

    return opts;
  }, [options, nav.id]);

  return nav.getObject<T>(key, finalOptions);
}

// ==================== Object Utilities ====================

/**
 * Create a memoized object getter with type safety
 */
export function createObjectGetter<T>(factory: () => T): () => T {
  let instance: T | undefined;

  return () => {
    if (!instance) {
      instance = factory();
    }
    return instance;
  };
}

/**
 * Create a reactive object getter that updates when dependencies change
 */
export function createReactiveObjectGetter<T>(
  factory: () => T,
  dependencies: any[]
): () => T {
  const ref = { current: factory() };

  useEffect(() => {
    ref.current = factory();
  }, dependencies);

  return () => ref.current;
}

/**
 * Type guard for object validation
 */
export function createObjectTypeGuard<T>(
  check: (obj: any) => obj is T
): (obj: any) => obj is T {
  return check;
}


// ==================== Group Navigation Stack ====================
type GroupNavigationStackProps = {
  id: string;
  navStack: Map<string, React.ReactElement>;
  current: string;
  onCurrentChange?: (id: string) => void;
  persist?: boolean;
  preloadAll?: boolean;
  defaultStack?: string;
};

const GROUP_STATE_STORAGE_KEY = 'navstack-group-state';

function readGroupState(groupId: string): { activeStack: string;} | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem(`${GROUP_STATE_STORAGE_KEY}:${groupId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeGroupState(groupId: string, activeStack: string) {
  try {
    if (typeof window === "undefined") return;
    const state = { activeStack, timestamp: Date.now() };
    sessionStorage.setItem(`${GROUP_STATE_STORAGE_KEY}:${groupId}`, JSON.stringify(state));
  } catch (e) {}
}

function clearGroupState(groupId: string) {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(`${GROUP_STATE_STORAGE_KEY}:${groupId}`);
  } catch (e) {}
}

export function GroupNavigationStack({
  id,
  navStack,
  current,
  onCurrentChange,
  persist = false,
  preloadAll = false,
  defaultStack
}: GroupNavigationStackProps) {

  const [hydrated, setHydrated] = useState(false);
  const previousActiveStackId = useRef<string | null>(null);

  // Group-specific CSS injection
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Check if styles already exist
    if (document.getElementById("navstack-group-styles")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "navstack-group-styles";
    styleEl.innerHTML = `
      .group-navigation-stack {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .group-stack-container {
        width: 100%;
        height: 100%;
      }

      .group-stack-hidden {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }

      .group-stack-active {
        display: block !important;
        visibility: visible !important;
        pointer-events: all !important;
        opacity: 1 !important;
      }

      /* Optional: Add transitions for smoother switching */
      .group-stack-container {
        transition: opacity 0.2s ease;
      }
    `;

    document.head.appendChild(styleEl);

    // Cleanup function
    return () => {
      // Only remove if this is the last GroupNavigationStack
      // You might want to keep it if you have multiple groups
      const styleElement = document.getElementById("navstack-group-styles");
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, []);

    // Get initial active stack from URL or persisted storage
    const getInitialActiveStackId = (): string => {
      if (typeof window === 'undefined') return current;

      try {
        // First priority: URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const urlGroup = urlParams.get('group');
        if (urlGroup && navStack.has(urlGroup)) {
          return urlGroup;
        }

        // Second priority: Persisted storage
        if (persist) {
          const savedState = readGroupState(id);
          if (savedState?.activeStack && navStack.has(savedState.activeStack)) {
            return savedState.activeStack;
          }
        }

        // Fallback: current prop
        return current;
      } catch (e) {
        console.warn('Failed to parse URL for group navigation:', e);
        return current;
      }
    };
    const [activeStackId, setActiveStackId] = useState<string>(getInitialActiveStackId);

    // Hydrate on mount
    useEffect(() => {
      const initialActiveStackId = getInitialActiveStackId();

      // Only update if different from current state
      if (initialActiveStackId !== activeStackId) {
        setActiveStackId(initialActiveStackId);
        onCurrentChange?.(initialActiveStackId);
      }else{
        onCurrentChange?.(initialActiveStackId);
      }

      // Mark as hydrated after a small delay to ensure all stacks are initialized
      const timer = setTimeout(() => {
        setHydrated(true);
      }, 50);

      return () => clearTimeout(timer);
    }, []); // Only run once on mount

  // Sync activeStackId with current prop when it changes from external
  useEffect(() => {
    if(current === activeStackId || !hydrated)return;
    restUrl();
    setActiveStackId(current);
  }, [current]);


  const restUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('group');
      url.searchParams.delete('nav');
      const newHref = url.toString();
      if (window.location.href !== newHref) {
            window.history.replaceState({ group: null }, "", newHref);
            window.history.replaceState({ navStack: null }, "", newHref);
      }
  }

  // Group context implementation
  const groupContext: GroupNavigationContextType = useMemo(() => ({
    getGroupId: () => id,

    getCurrent: () => activeStackId,

    goToGroupId: async (groupId: string) => {
      if (navStack.has(groupId)) {
        restUrl();
        setActiveStackId(groupId);
        onCurrentChange?.(groupId);
        return true;
      }
      return false;
    },

    isActiveStack: (stackId: string) => {
      return stackId === activeStackId;
    }
  }), [id, activeStackId, navStack, persist]);

  // Save group state to storage when it changes
  useEffect(() => {
    if (persist && typeof window !== 'undefined') {
      writeGroupState(id, activeStackId);
    }
  }, [id, activeStackId, persist]);


  // Handle back/forward browser buttons
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated) return;

    const handler = (e: PopStateEvent) => {
     // Small delay to ensure all stacks are ready
     setTimeout(() => {
       if (e.state && e.state.group && navStack.has(e.state.group)) {
         const newGroupId = e.state.group;
         restUrl();
         setActiveStackId(newGroupId);
         onCurrentChange?.(newGroupId);
       }
     }, 10);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [navStack, hydrated]);

    return (
      <GroupNavigationContext.Provider value={groupContext}>
        <div className="group-navigation-stack">
          {Array.from(navStack.entries()).map(([stackId, stackEl]) => {
            const isActive = (hydrated || (!hydrated && current === stackId)) && stackId === activeStackId;

            return (
              <div
                key={stackId}
                className={`group-stack-container ${isActive ? 'group-stack-active' : 'group-stack-hidden'}`}
                style={{
                  display: isActive ? "block" : "none",
                  visibility: isActive ? "visible" : "hidden"
                }}
                aria-hidden={!isActive}
                data-stack-id={stackId}
                data-active={isActive}
              >
                <GroupStackIdContext.Provider value={stackId}>
                  {stackEl}
                </GroupStackIdContext.Provider>
              </div>
            );
          })}
        </div>
      </GroupNavigationContext.Provider>
    );
}

// ==================== Component Aggregation Utilities ====================

/**
 * Aggregate multiple navigation maps into a single map
 * Later maps override earlier ones for duplicate keys
 */
export function aggregateNavigationMaps(...maps: NavigationMap[]): NavigationMap {
  const result: NavigationMap = {};
  
  for (const map of maps) {
    Object.assign(result, map);
  }
  
  return result;
}

/**
 * Extract components for a specific tag from a tag registry
 * Returns a navigation map containing only components tagged with the given tag
 */
export function getComponentsByTag(
  componentTags: Record<string, NavigationMap>,
  tag: string
): NavigationMap | undefined {
  return componentTags[tag];
}

/**
 * Get all available tags in a component tag registry
 */
export function getAvailableTags(componentTags: Record<string, NavigationMap>): string[] {
  return Object.keys(componentTags);
}

/**
 * Merge a component tag registry with a primary navigation map
 * Tags provide additional organization without affecting primary routing
 */
export function createTaggedNavigation(
  primary: NavigationMap,
  componentTags: Record<string, NavigationMap>,
  tagsToInclude?: string[]
): {
  primary: NavigationMap;
  tags: Record<string, NavigationMap>;
  merged: NavigationMap;
} {
  let merged = { ...primary };
  const filteredTags = tagsToInclude 
    ? Object.fromEntries(
        Object.entries(componentTags).filter(([tag]) => tagsToInclude.includes(tag))
      )
    : componentTags;

  // Merge all tagged components (primary takes precedence)
  for (const tagMap of Object.values(filteredTags)) {
    for (const [key, value] of Object.entries(tagMap)) {
      if (!(key in primary)) {
        merged[key] = value;
      }
    }
  }

  return { primary, tags: filteredTags, merged };
}

/**
 * Hook to retrieve components by a specific tag
 * Returns the navigation map for that tag and a function to navigate to a component in it
 */
export function useComponentsByTag(tag: string) {
  const nav = useContext(NavContext);
  
  if (!nav) {
    throw new Error("useComponentsByTag must be used within a NavigationStack");
  }

  // This would require storing component tags in the API
  // For now, return a placeholder that components can use
  return {
    tag,
    available: true,
    components: {},
  };
}

// ==================== Main NavigationStack Component ====================
export default function NavigationStack(props: {
  id: string;
  navLink: NavigationMap;
  entry: string;
  onExitStack?: () => void;
  transition?: BuiltinTransition;
  transitionDuration?: number;
  renderTransition?: TransitionRenderer;
  className?: string;
  style?: React.CSSProperties;
  maxStackSize?: number;
  autoDispose?: boolean;
  syncHistory?: boolean;
  lazyComponents?: Record<string, () => LazyComponent>;
  missingRouteConfig?: MissingRouteConfig;
  persist?: boolean;
  enableScrollRestoration?: boolean;
  /**
   * Additional navLinks to merge with the primary navLink
   * Useful for component aggregation from multiple sources
   * Lower priority than main navLink - will be overridden if keys conflict
   */
  additionalNavLinks?: NavigationMap[];
  /**
   * Tag-based component registry for organizing components
   * Maps tag names to collections of navigation links
   * Allows retrieving related components by tag
   */
  componentTags?: Record<string, NavigationMap>;
}) {
  const {
    id,
    navLink,
    entry,
    onExitStack,
    transition = "fade",
    transitionDuration = DEFAULT_TRANSITION_DURATION,
    renderTransition,
    className,
    style,
    maxStackSize,
    autoDispose = true,
    syncHistory = false,
    lazyComponents,
    missingRouteConfig,
    persist = false,
    enableScrollRestoration = true,
    additionalNavLinks = [],
    componentTags = {},
  } = props;

  // Memoize additional navlinks to prevent unnecessary recalculations
  const additionalNavLinksString = useMemo(() => JSON.stringify(additionalNavLinks), [additionalNavLinks]);
  const componentTagsString = useMemo(() => JSON.stringify(componentTags), [componentTags]);

  // Merge navLinks with additionalNavLinks and componentTags
  // Primary navLink takes precedence, then additionalNavLinks, then componentTags
  const mergedNavLink = useMemo(() => {
    const merged = { ...navLink };
    
    // Apply additional navLinks in order (later ones override earlier)
    for (const additionalMap of additionalNavLinks) {
      Object.entries(additionalMap).forEach(([key, value]) => {
        // Only add if not already in primary navLink
        if (!(key in navLink)) {
          merged[key] = value;
        }
      });
    }

    // Apply tagged components (only if not already defined)
    for (const tagMap of Object.values(componentTags)) {
      Object.entries(tagMap).forEach(([key, value]) => {
        // Only add if not already defined
        if (!(key in navLink) && !(key in merged)) {
          merged[key] = value;
        }
      });
    }

    return merged;
  }, [navLink, additionalNavLinksString, componentTagsString]);

  // Auto-detect parent navigation context
  const parentApi = findParentNavContext();
  const groupContext = useGroupNavigation();
  const groupStackId = useGroupStackId();

  const [isInitialized, setInitialized] = useState(false);
  const [stackSnapshot, setStackSnapshot] = useState<StackEntry[]>([]);
  const currentPathRef = useRef(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    currentPathRef.current = window.location.pathname;
  }, []);

  const api = useMemo(() => {
    const newApi = createApiFor(id, mergedNavLink, syncHistory || false, parentApi, currentPathRef.current, groupContext, groupStackId);

    if (parentApi) {
      const parentReg = globalRegistry.get(parentApi.id);
      if (parentReg) {
        parentReg.childIds.add(id);
      }
    }

    return newApi;
  }, [id, mergedNavLink, syncHistory, parentApi, groupContext]);

 // Trigger onCreate lifecycle when API is created
  useEffect(() => {
    const lifecycleManager = api._getLifecycleManager();
    lifecycleManager.trigger('onCreate', {
      stack: api.getStack(),
      current: api.peek()
    });
  }, [api]);

  // App state tracking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const regEntry = globalRegistry.get(id);
    if (!regEntry) return;

    const lifecycleManager = api._getLifecycleManager();

    // Enable app state tracking
    const getCurrentContext = () => ({
      stack: regEntry.stack.slice(),
      current: regEntry.stack[regEntry.stack.length - 1]
    });

    const cleanupAppState = lifecycleManager.enableAppStateTracking(getCurrentContext);

    return cleanupAppState;
  }, [api, id]);

  // Update the registry with the current path reference
  useEffect(() => {
    const regEntry = globalRegistry.get(id);
    if (regEntry) {
      regEntry.currentPath = currentPathRef.current;
    }
  }, [id]);

  useIsomorphicLayoutEffect(() => {
    let regEntry = globalRegistry.get(id);
    if (!regEntry) {
      regEntry = {
        stack: [],
        listeners: new Set(),
        guards: new Set(),
        middlewares: new Set(),
        maxStackSize: DEFAULT_MAX_STACK_SIZE,
        historySyncEnabled: false,
        snapshotBuffer: [],
        parentId: parentApi?.id || null,
        childIds: new Set(),
        navLink,
      };
      globalRegistry.set(id, regEntry);
    } else {
      regEntry.navLink = navLink;
      regEntry.parentId = parentApi?.id || null;
    }


    // First priority: Parse from URL
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const navPathCombined = searchParams.get('nav');

      if (navPathCombined) {
        const map = parseCombinedNavParam(navPathCombined);
        const ourPath = map[id];
        if (ourPath) {
          const tokenizedStacks = parseUrlPathIntoStacks(ourPath);

          const ourTokens = tokenizedStacks[0] || [];

          if (ourTokens.length > 0) {
            regEntry.stack = ourTokens.map(t => {
              const resolvedKey = decodeStackPath(navLink, t.code) || (t.code.startsWith('k:') ? (() => {
                try { return decodeURIComponent(t.code.slice(2)); } catch { return t.code.slice(2); }
              })() : t.code);
              return {
                uid: generateCompositeUid(id, groupContext, groupStackId, resolvedKey, t.params),
                key: resolvedKey,
                params: t.params
              } as StackEntry;
            });
            setStackSnapshot([...regEntry.stack]);
            setInitialized(true);
            return;
          }
        }
      }
    }

    // Second priority: Fall back to persisted storage
    if (persist ) {
      const persisted = readPersistedStack(id, groupContext, groupStackId);
      if (persisted && persisted.length > 0) {
        regEntry.stack = persisted;
        setStackSnapshot([...persisted]);
        setInitialized(true);
        return;
      }
    }

    // Final fallback: Use initial entry
    const { key, params } = parseRawKey(entry);
    if (!navLink[key]) {
      console.error(`Entry route "${key}" not found in navLink`);
      return;
    }
    regEntry.stack = [{
      uid: generateCompositeUid(id, groupContext, groupStackId, key, params),
      key,
      params
    }];
    setStackSnapshot([...regEntry.stack]);
    if (persist ) writePersistedStack(id, regEntry.stack);
    setInitialized(true);
  }, [id, entry, navLink, groupContext, groupStackId]);


  useEffect(() => {
      const currentRegEntry = globalRegistry.get(id);
      if (!currentRegEntry || !groupContext || !groupStackId) return;
      const active = groupContext.isActiveStack(groupStackId);
      if((syncHistory || currentRegEntry.historySyncEnabled) && active){
          const localPath = buildUrlPath([{ navLink, stack: currentRegEntry.stack }]);
          updateNavQueryParamForStack(id, localPath, groupContext, groupStackId);
      }else if(!(syncHistory || currentRegEntry.historySyncEnabled)){
           removeNavQueryParamForStack(id, groupContext, groupStackId)
      }
  }, [id, navLink, syncHistory, groupContext?.getCurrent]);

  useEffect(() => {
    const unsub = api.subscribe((stack) => {
      setStackSnapshot(stack);
      if (persist ) writePersistedStack(id, stack);
    });
    return unsub;
  }, [api, persist, id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (event: PopStateEvent) => {
      const currentRegEntry = globalRegistry.get(id);
      if (!currentRegEntry) return;

      if (!api.isActiveStack()) return;

      const searchParams = new URLSearchParams(window.location.search);
      const navPathCombined = searchParams.get('nav');
      if (!navPathCombined) return;

      const map = parseCombinedNavParam(navPathCombined);
      const ourPath = map[id];
      if (!ourPath) return;

      const tokenized = parseUrlPathIntoStacks(ourPath);
      const ourSlice = tokenized[0] || [];

      const newStack = ourSlice.map(t => {
        const resolvedKey = decodeStackPath(navLink, t.code) || (t.code.startsWith('k:') ? (() => {
          try { return decodeURIComponent(t.code.slice(2)); } catch { return t.code.slice(2); }
        })() : t.code);
        return {
          uid: generateCompositeUid(id, groupContext, groupStackId, resolvedKey, t.params),
          key: resolvedKey,
          params: t.params,
        };
      });

      if (!isEqual(currentRegEntry.stack, newStack)) {
        currentRegEntry.stack = newStack;
        setStackSnapshot([...newStack]);
        if (persist ) writePersistedStack(id, newStack);
      }
    };

    if (syncHistory ) {
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      if (syncHistory ) {
        window.removeEventListener('popstate', handlePopState);
      }
      if (autoDispose && !groupContext) api.dispose();
    };
  }, [id, navLink, syncHistory, autoDispose, api, persist, groupContext]);

  const lastLen = useRef(stackSnapshot.length);

  useEffect(() => {
    const handleStackEmpty = () => {
      if (onExitStack) {
        try {
          onExitStack();
          return;
        } catch (e) {
          console.warn('onExit error:', e);
        }
      }

      if (parentApi) {
        parentApi.pop().catch(() => {
          if (typeof window !== "undefined" && window.history.length > 0) {
            window.history.back();
          }
        });
        return;
      }

      if (typeof window !== "undefined" && window.history.length > 0) {
        window.history.back();
      }
    };

    const unsub = api.subscribe((stack) => {
      setStackSnapshot(stack);

      if (lastLen.current > 0 && stack.length === 0) {
        if(!groupContext)handleStackEmpty();
      }
      lastLen.current = stack.length;
    });

    return unsub;
  }, [api, onExitStack, parentApi]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("navstack-builtins")) return;

    const styleEl = document.createElement("style");
    styleEl.id = "navstack-builtins";
    styleEl.innerHTML = `
      .navstack-root {  display: block; width: 100%; height: auto; overflow: hidden;}
      .navstack-page {  display: block; width: 100%; height: auto; overflow: visible; }
      .navstack-page[inert] {  pointer-events: none; display: none !important;}
      .nav-fade-enter { opacity: 0; transform: translateY(6px); }
      .nav-fade-enter-active { opacity: 1; transform: translateY(0); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-fade-exit { opacity: 1; transform: translateY(0); }
      .nav-fade-exit-active { opacity: 0; transform: translateY(6px); transition: opacity ${transitionDuration}ms ease, transform ${transitionDuration}ms ease; }
      .nav-slide-enter { opacity: 0; transform: translateX(8%); }
      .nav-slide-enter-active { opacity: 1; transform: translateX(0); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .nav-slide-exit { opacity: 1; transform: translateX(0); }
      .nav-slide-exit-active { opacity: 0; transform: translateX(8%); transition: transform ${transitionDuration}ms ease, opacity ${transitionDuration}ms ease; }
      .navstack-missing-route { padding: 1rem; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 0.25rem; display: flex; flex-direction: column}
      .navstack-missing-route-button { margin-top: 0.5rem; padding: 0.375rem 0.75rem; background-color: #0d6efd; color: white; border: none; border-radius: 0.25rem; cursor: pointer; }
      .navstack-missing-route-button:hover { background-color: #0b5ed7; }
    `;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, [transitionDuration]);

  const [renders, setRenders] = useState<RenderRecord[]>(
    () => stackSnapshot.map((e) => ({ entry: e, state: "idle", createdAt: Date.now() }))
  );

  const transitionManager = useRef<TransitionManager>(new TransitionManager()).current;
  const memoryManager = useRef<PageMemoryManager>(new PageMemoryManager()).current;

  if (enableScrollRestoration) {
    useGroupScopedScrollRestoration(api, renders, stackSnapshot, groupContext, groupStackId);
  }


  useEffect(() => {
    const handleTransitionEnd = (uid: string) => {
      setRenders(prev => prev.filter(r => r.entry.uid !== uid));
      memoryManager.delete(uid);
    };

    const old = renders.map((r) => r.entry.uid);
    const cur = stackSnapshot.map((s) => s.uid);

    const added = stackSnapshot.filter((s) => !old.includes(s.uid));
    const removed = renders.filter((r) => !cur.includes(r.entry.uid)).map((r) => r.entry.uid);

    if (added.length === 0 && removed.length === 0) {
      if (stackSnapshot.length > 0 && renders.length > 0) {
        const topSnap = stackSnapshot[stackSnapshot.length - 1];
        const topRender = renders[renders.length - 1];
        if (topRender && topSnap.uid !== topRender.entry.uid) {
          const newRenders = renders.slice(0, -1)
            .concat([{ entry: topRender.entry, state: "exit", createdAt: Date.now() }, { entry: topSnap, state: "enter", createdAt: Date.now() }]);
          setRenders(newRenders);
          transitionManager.start(topRender.entry.uid, transitionDuration, () => {});
          transitionManager.start(topSnap.uid, transitionDuration, () => {});
        }
      }
      return;
    }

    if (added.length > 0) {
      const newRecords = added.map((a) => ({ entry: a, state: "enter" as const, createdAt: Date.now() }));
      setRenders((prev) => prev.concat(newRecords));
      added.forEach(a => transitionManager.start(a.uid, transitionDuration, () => {}));
    }

    if (removed.length > 0) {
      setRenders((prev) => prev.map((r) => removed.includes(r.entry.uid) ? { ...r, state: "exit", createdAt: Date.now() } : r));
      removed.forEach(uid => transitionManager.start(uid, transitionDuration, () => handleTransitionEnd(uid)));
    }
  }, [stackSnapshot, transitionDuration, transitionManager, memoryManager]);

  function renderEntry(rec: RenderRecord, idx: number) {
    const topEntry = stackSnapshot[stackSnapshot.length - 1];
    const isTop = topEntry ? rec.entry.uid === topEntry.uid : false;
    const pageOrComp = navLink[rec.entry.key];

    // 🔥 CRITICAL: Always get the FRESH entry from current stack
    const currentEntry = stackSnapshot.find(s => s.uid === rec.entry.uid) || rec.entry;
    const currentParams = currentEntry.params ?? {};

    // 🔥 Check if params changed since last render
    const cached = memoryManager.get(rec.entry.uid);
    const hasParamChanges = cached &&
      JSON.stringify(currentParams) !== JSON.stringify(rec.entry.params);

    let child: ReactNode = null;

    // 🔥 ONLY use cache if NO parameter changes
    if (cached && !hasParamChanges) {
      child = cached;
    } else {
      // 🔥 ALWAYS create fresh component when params changed or no cache
      if (!pageOrComp) {
        child = (
          <MissingRoute
            entry={currentEntry}
            isTop={isTop}
            api={api}
            config={missingRouteConfig}
          />
        );
      } else if (typeof pageOrComp === 'function') {
        if (currentEntry.metadata?.lazy) {
          child = <LazyRouteLoader lazyComponent={currentEntry.metadata.lazy} />;
        } else if (lazyComponents?.[currentEntry.key]) {
          child = <LazyRouteLoader lazyComponent={lazyComponents[currentEntry.key]} />;
        } else {
          const Component = pageOrComp as ComponentType<any>;
          // 🔥 ALWAYS use currentParams (fresh from stack)
          child = <Component {...currentParams} />;
        }
      }

      // 🔥 ONLY cache if no parameter changes
      if (child && !hasParamChanges) {
        memoryManager.set(rec.entry.uid, child);
      } else if (hasParamChanges) {
        // 🔥 Remove stale cache when params change
        memoryManager.delete(rec.entry.uid);
      }
    }

    const builtInRenderer: TransitionRenderer = ({ children, state: s, isTop: t, index }) => {
      const baseClass = "navstack-page";
      const uid = currentEntry.uid;

      if (transition === "slide" && index > 0) {
        return (
          <SlideTransitionRenderer state={s} isTop={t} uid={uid} baseClass={baseClass}>
            {children}
          </SlideTransitionRenderer>
        );
      }

      if (transition === "fade" && index > 0) {
        return (
          <FadeTransitionRenderer state={s} isTop={t} uid={uid} baseClass={baseClass}>
            {children}
          </FadeTransitionRenderer>
        );
      }

      return (
        <div
          key={uid}
          className={`${baseClass}`}
          inert={!t}
          data-nav-uid={uid}
        >
          {children}
        </div>
      );
    };

    const renderer = renderTransition ?? builtInRenderer;
    return (
      <CurrentPageContext.Provider value={currentEntry.uid}>
        {renderer({
          children: (
            <CurrentPageContext.Provider value={currentEntry.uid}>
              {child}
            </CurrentPageContext.Provider>
          ),
          state: rec.state,
          index: idx,
          isTop
        })}
      </CurrentPageContext.Provider>
    );
  }

  if (!isInitialized) {
    return null;
  }

  return (
    <NavContext.Provider value={api}>
      <div className={`navstack-root ${className ?? ""}`} style={{ position: "relative", width: "auto", height: "auto", ...style }}>
        {renders.map((r, idx) => (
          <React.Fragment key={r.entry.uid}>
            {renderEntry(r, idx)}
          </React.Fragment>
        ))}
      </div>
    </NavContext.Provider>
  );
}

if (typeof module !== 'undefined' && (module as any).hot) {
  (module as any).hot.dispose(() => {
    globalRegistry.forEach((_, id) => {
      const api = createApiFor(id, {}, false, null,'', null, null);
      api.dispose();
    });
  });
}