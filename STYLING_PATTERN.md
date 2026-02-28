# ID-Scoped Styling Pattern for UI Components

## Pattern Applied to SelectionViewer (Reference Implementation)

### Changes Made:

1. **Convert styles function to accept ID parameter:**
```typescript
// Before:
const styles = `.class { ... }`;

// After:
const getStyles = (id: string) => `#${id} .class { ... }`;
```

2. **Update style injection hook:**
```typescript
// Before:
const useInjectStyles = () => {
  useEffect(() => {
    const styleId = "component-styles";
    // ... inject once globally
  }, []);
};

// After:
const useInjectStyles = (id: string) => {
  useEffect(() => {
    const styleId = `component-styles-${id}`;
    styleTag.innerHTML = getStyles(id);
    // ... inject per instance
  }, [id]);
};
```

3. **Wrap component with ID div:**
```typescript
// Before:
return <Component {...props} />;

// After:
return (
  <div id={id}>
    <Component {...props} />
  </div>
);
```

4. **Update hook call:**
```typescript
// Before:
useInjectStyles();

// After:
useInjectStyles(id);
```

## Apply This Pattern To:

### 1. DialogViewer.tsx
- Change: `const createStyles = () =>` to `const getStyles = (id: string) =>`
- Prefix all `.dialog-*` selectors with `#${id}`
- Update: `useInjectStyles()` to `useInjectStyles(id)`
- Wrap return JSX with `<div id={id}>...</div>`

### 2. BottomViewer.tsx
- Change: Style function to accept `id` parameter
- Prefix all `.bottom-*` selectors with `#${id}`
- Update injection hook
- Wrap component with ID div

### 3. NavigationBar.tsx
- Change: Style function to accept `id` parameter
- Prefix all `.nav-*` selectors with `#${id}`
- Update injection hook
- Wrap component with ID div

### 4. SideBar.tsx
- Change: Style function to accept `id` parameter
- Prefix all `.sidebar-*` selectors with `#${id}`
- Update injection hook
- Wrap component with ID div

### 5. SideDrawer.tsx
- Change: Style function to accept `id` parameter
- Prefix all `.drawer-*` selectors with `#${id}`
- Update injection hook
- Wrap component with ID div

### 6. CustomScrollDatePicker.tsx
- Change: Style function to accept `id` parameter
- Prefix all `.picker-*` selectors with `#${id}`
- Update injection hook
- Wrap component with ID div

## Benefits:

✅ Each instance has isolated styles
✅ Multiple instances can coexist with different styling
✅ No style conflicts between instances
✅ Backward compatible - existing code works unchanged
✅ Automatic cleanup on unmount

## Example Usage:

```typescript
// Two instances with independent styles
const [id1, controller1] = useController();
const [id2, controller2] = useController();

// Both render without style conflicts
<Component id={id1} {...props1} />
<Component id={id2} {...props2} />
```
