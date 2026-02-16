import React from 'react';
import { useDialog, createAlertDialog, createConfirmDialog, createDestructiveDialog } from './DialogViewer';

// ==================== USAGE EXAMPLES ====================

// 1. BASIC ALERT DIALOG
export const BasicAlertExample = () => {
  const dialog = useDialog();

  const showAlert = () => {
    dialog.open();
  };

  return (
    <>
      <button onClick={showAlert}>Show Alert</button>
      <dialog.DialogViewer
        title="Success"
        message="Your changes have been saved successfully!"
        showCancel={false}
      />
    </>
  );
};

// 2. CONFIRM DIALOG (YES/NO)
export const ConfirmDialogExample = () => {
  const dialog = useDialog();

  const handleDelete = () => {
    console.log('Item deleted');
    dialog.close();
  };

  return (
    <>
      <button onClick={() => dialog.open()}>Delete Item</button>
      <dialog.DialogViewer
        title="Confirm Delete"
        message="Are you sure you want to delete this item?"
        buttons={[{ text: "Delete", variant: "danger", onClick: handleDelete }]}
        showCancel={true}
        cancelText="Cancel"
      />
    </>
  );
};

// 3. CUSTOM BUTTONS
export const CustomButtonsExample = () => {
  const dialog = useDialog();

  return (
    <>
      <button onClick={() => dialog.open()}>Show Options</button>
      <dialog.DialogViewer
        title="Choose Action"
        message="What would you like to do?"
        buttons={[
          { text: "Save", variant: "primary", onClick: () => console.log('Saved') },
          { text: "Discard", variant: "danger", onClick: () => console.log('Discarded') },
        ]}
        showCancel={true}
      />
    </>
  );
};

// 4. CUSTOM VIEW (No message, custom content)
export const CustomViewExample = () => {
  const dialog = useDialog();

  const customContent = (
    <div style={{ padding: '20px' }}>
      <input type="text" placeholder="Enter your name" style={{ width: '100%', padding: '8px' }} />
      <input type="email" placeholder="Enter your email" style={{ width: '100%', padding: '8px', marginTop: '10px' }} />
    </div>
  );

  return (
    <>
      <button onClick={() => dialog.open(customContent)}>Show Form</button>
      <dialog.DialogViewer
        title="User Information"
        buttons={[{ text: "Submit", variant: "primary" }]}
      />
    </>
  );
};

// 5. DYNAMIC CONTENT UPDATE
export const DynamicContentExample = () => {
  const dialog = useDialog();

  const showLoading = () => {
    dialog.open(<div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>);
    
    setTimeout(() => {
      dialog.updateContent(<div style={{ textAlign: 'center', padding: '20px', color: 'green' }}>✓ Complete!</div>);
    }, 2000);
  };

  return (
    <>
      <button onClick={showLoading}>Process</button>
      <dialog.DialogViewer
        title="Processing"
        showCancel={false}
        buttons={[{ text: "OK", variant: "primary" }]}
      />
    </>
  );
};

// 6. PRESET DIALOGS (Helper Functions)
export const PresetDialogsExample = () => {
  const alertDialog = useDialog();
  const confirmDialog = useDialog();
  const destructiveDialog = useDialog();

  return (
    <>
      <button onClick={() => alertDialog.open()}>Alert</button>
      <alertDialog.DialogViewer
        {...createAlertDialog(
          "Success",
          "Operation completed successfully!",
          () => console.log('OK clicked')
        )}
      />

      <button onClick={() => confirmDialog.open()}>Confirm</button>
      <confirmDialog.DialogViewer
        {...createConfirmDialog(
          "Confirm Action",
          "Do you want to proceed?",
          () => console.log('Confirmed'),
          () => console.log('Cancelled')
        )}
      />

      <button onClick={() => destructiveDialog.open()}>Delete</button>
      <destructiveDialog.DialogViewer
        {...createDestructiveDialog(
          "Delete Account",
          "This action cannot be undone.",
          "Delete Forever",
          () => console.log('Deleted')
        )}
      />
    </>
  );
};

// 7. CUSTOM STYLING
export const CustomStylingExample = () => {
  const dialog = useDialog();

  return (
    <>
      <button onClick={() => dialog.open()}>Custom Style</button>
      <dialog.DialogViewer
        title="Custom Dialog"
        message="This dialog has custom styling"
        layoutProp={{
          backgroundColor: "#f9fafb",
          maxWidth: "500px",
          borderRadius: "20px"
        }}
        buttons={[
          { 
            text: "Custom Button", 
            variant: "primary",
            style: { backgroundColor: '#10b981', borderRadius: '20px' }
          }
        ]}
      />
    </>
  );
};

// 8. NO BACKDROP CLOSE
export const NoBackdropCloseExample = () => {
  const dialog = useDialog();

  return (
    <>
      <button onClick={() => dialog.open()}>Force Action</button>
      <dialog.DialogViewer
        title="Important"
        message="You must choose an option"
        closeOnBackdrop={false}
        showCancel={false}
        buttons={[
          { text: "Option 1", variant: "primary" },
          { text: "Option 2", variant: "secondary" }
        ]}
      />
    </>
  );
};

// 9. COMPLETE EXAMPLE WITH ALL FEATURES
export const CompleteExample = () => {
  const dialog = useDialog();
  const [formData, setFormData] = React.useState({ name: '', email: '' });

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    dialog.close();
  };

  const formView = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <input
        type="text"
        placeholder="Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
      />
    </div>
  );

  return (
    <>
      <button onClick={() => dialog.open(formView)}>Open Form</button>
      <dialog.DialogViewer
        title="Contact Information"
        buttons={[{ text: "Submit", variant: "primary", onClick: handleSubmit }]}
        showCancel={true}
        cancelText="Cancel"
        layoutProp={{ maxWidth: "450px" }}
        closeOnBackdrop={true}
        zIndex={2000}
      />
    </>
  );
};

// ==================== API REFERENCE ====================

/*
HOOK: useDialog(initialContent?: React.ReactNode)

Returns:
{
  isOpen: boolean,
  open: (content?: React.ReactNode) => void,
  close: () => void,
  toggle: () => void,
  updateContent: (content: React.ReactNode) => void,
  clearContent: () => void,
  DialogViewer: React.Component,
  currentContent: React.ReactNode
}

PROPS: DialogViewer
{
  title?: string,                    // Dialog title
  message?: string,                  // Simple text message
  customView?: React.ReactNode,      // Custom content (overrides message)
  buttons?: DialogButton[],          // Action buttons
  showCancel?: boolean,              // Show cancel button (default: true)
  cancelText?: string,               // Cancel button text (default: "Cancel")
  layoutProp?: {
    backgroundColor?: string,
    maxWidth?: string,
    borderRadius?: string
  },
  unmountOnClose?: boolean,          // Unmount when closed (default: true)
  zIndex?: number,                   // Z-index (default: 1000)
  closeOnBackdrop?: boolean          // Close on backdrop click (default: true)
}

BUTTON VARIANTS:
- "primary" (blue)
- "secondary" (gray)
- "danger" (red)

PRESET FUNCTIONS:
- createAlertDialog(title, message, onOk)
- createConfirmDialog(title, message, onConfirm, onCancel)
- createDestructiveDialog(title, message, confirmText, onConfirm)
*/
