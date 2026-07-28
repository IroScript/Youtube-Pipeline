/**
 * FlowCraft Media Uploader Module
 */
import { DOMQueryEngine } from './dom-query.js';
import { Logger } from '../utils/logger.js';

export class MediaUploader {
  static async uploadBase64Image(imageObj, index, selectors, isCancelled, isPaused) {
    const sel = selectors;
    const checkState = async () => {
      while (isPaused?.() && !isCancelled?.()) {
        await new Promise(r => setTimeout(r, 150));
      }
      return isCancelled?.();
    };

    try {
      if (await checkState()) return false;

      // Click add frame / add image button
      const uploadButtonSel = sel.addFrameButton || sel.addImageButton;
      await DOMQueryEngine.simulateClick(uploadButtonSel, `Upload button (image ${index + 1})`);

      // Sort by latest uploads
      await DOMQueryEngine.simulateClick(sel.sortOptionsButton, 'Sort options menu');
      await DOMQueryEngine.simulateClick(sel.sortLatestOption, 'Sort latest option');

      const fileName = imageObj?.name ?? '';
      if (await checkState()) return false;

      // Filter by image search name if available
      await DOMQueryEngine.simulateClick(sel.searchUploadedImage, 'Image search input');
      const searchInput = DOMQueryEngine.queryFirst(sel.searchUploadedImage);
      if (searchInput) {
        searchInput.value = fileName;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 500));
      }

      // Check if image already exists in uploaded asset list
      const itemSelector = `${sel.virtuosoItemList}:first-child:has(div)`;
      const existingItem = DOMQueryEngine.queryFirst(itemSelector);
      if (existingItem) {
        const img = existingItem.querySelector('img');
        if (img) {
          img.click();
          return true;
        }
      }

      if (await checkState()) return false;

      if (!imageObj?.base64) {
        Logger.warn(`No base64 data provided for image index ${index}`);
        return false;
      }

      // Convert Base64 -> Blob -> File
      let base64Data = imageObj.base64;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }

      const byteCharacters = atob(base64Data);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([byteNumbers], { type: 'image/jpeg' });
      const file = new File([blob], imageObj.name || `image-${Date.now()}.jpg`, { type: 'image/jpeg' });

      const fileInputEl = await DOMQueryEngine.waitForElement(sel.fileInput, 10000, 100, false);
      if (!fileInputEl) {
        Logger.warn('File input element not found in DOM');
        return false;
      }

      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputEl.files = dt.files;
      fileInputEl.dispatchEvent(new Event('change', { bubbles: true }));
      Logger.info(`✅ Image file injected into input: ${file.name}`);

      // Wait for image item to appear in DOM list
      for (let attempt = 0; attempt < 60; attempt++) {
        if (isCancelled?.()) return false;
        if (isPaused?.()) {
          await new Promise(r => setTimeout(r, 150));
          attempt--;
          continue;
        }

        await new Promise(r => setTimeout(r, 1000));
        const newlyUploadedItem = DOMQueryEngine.queryFirst(itemSelector);
        if (newlyUploadedItem) {
          const imgEl = newlyUploadedItem.querySelector('img');
          if (imgEl) {
            imgEl.click();
            return true;
          }
        }
      }

      return false;
    } catch (err) {
      Logger.error(`Error in uploadBase64Image (index ${index}):`, err);
      return false;
    }
  }
}
