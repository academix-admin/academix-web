/**
 * Copy text to clipboard with fallback for browsers that don't support navigator.clipboard
 * @param text - The text to copy
 * @returns Promise that resolves when copy is successful
 */
export async function copyToClipboard(text: string): Promise<void> {
  // Try modern clipboard API first
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to execCommand:', err);
    }
  }

  // Fallback for older browsers or non-secure contexts
  const textArea = document.createElement('textarea');
  textArea.value = text;
  
  // Make the textarea invisible
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  textArea.setAttribute('readonly', '');
  
  document.body.appendChild(textArea);
  
  try {
    // Select the text
    textArea.focus();
    textArea.select();
    
    // For iOS
    const range = document.createRange();
    range.selectNodeContents(textArea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textArea.setSelectionRange(0, 999999);
    
    // Copy the text
    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('execCommand copy failed');
    }
  } finally {
    document.body.removeChild(textArea);
  }
}
