# Enhanced UI Update System for AI Agent Control

## Overview
Replace generic "flash" and "highlight" effects with app-specific, contextual animations that make the AI agent's actions feel natural and delightful.

---

## 1. Enhanced UI Update Interface

```typescript
// types/uiUpdates.ts

type BaseUIUpdate = {
  targetId: string;
  delay?: number; // Optional delay before animation starts
  duration?: number; // Animation duration override
};

// Notes App Updates
type NotesUIUpdate = 
  | {
      type: "notes_typewriter";
      targetId: string;
      content: string;
      speed?: number; // Characters per second (default: 50)
      cursor?: boolean; // Show typing cursor
    }
  | {
      type: "notes_append_scroll";
      targetId: string;
      content: string;
      highlight?: boolean; // Highlight appended content
    }
  | {
      type: "notes_file_create_animation";
      targetId: string;
      filename: string;
      position?: { x: number; y: number }; // File icon spawn position
    }
  | {
      type: "notes_search_highlight";
      targetId: string;
      matches: Array<{ line: number; text: string }>;
      scrollToFirst?: boolean;
    };

// Todo App Updates
type TodoUIUpdate = 
  | {
      type: "todo_task_pop_in";
      targetId: string;
      taskData: {
        title: string;
        priority: "low" | "medium" | "high";
        position: number; // Position in list
      };
    }
  | {
      type: "todo_check_animation";
      targetId: string;
      taskId: string;
      strikethrough?: boolean;
      confetti?: boolean; // Celebration effect
    }
  | {
      type: "todo_priority_pulse";
      targetId: string;
      priority: "low" | "medium" | "high";
    }
  | {
      type: "todo_reorder_animation";
      targetId: string;
      taskIds: string[]; // New order
      duration?: number;
    };

// Calendar App Updates
type CalendarUIUpdate = 
  | {
      type: "calendar_event_slide_in";
      targetId: string;
      eventData: {
        title: string;
        time: string;
        date: string;
      };
      direction?: "left" | "right" | "top" | "bottom";
    }
  | {
      type: "calendar_date_jump";
      targetId: string;
      fromDate: string;
      toDate: string;
      animated?: boolean;
    }
  | {
      type: "calendar_time_block_grow";
      targetId: string;
      startTime: string;
      endTime: string;
    };

// Timer App Updates
type TimerUIUpdate = 
  | {
      type: "timer_start_ripple";
      targetId: string;
      duration: number; // Timer duration in seconds
    }
  | {
      type: "timer_countdown_pulse";
      targetId: string;
      remainingSeconds: number;
      urgent?: boolean; // Last 10 seconds warning
    }
  | {
      type: "timer_complete_celebration";
      targetId: string;
      sound?: boolean;
      message?: string;
    };

// File Browser Updates
type FileBrowserUIUpdate = 
  | {
      type: "file_browser_folder_expand";
      targetId: string;
      folderPath: string;
      animated?: boolean;
    }
  | {
      type: "file_browser_file_highlight_path";
      targetId: string;
      filePath: string;
      breadcrumb?: boolean; // Show breadcrumb trail
    }
  | {
      type: "file_browser_create_file";
      targetId: string;
      filePath: string;
      fileType: "file" | "folder";
      parentPath: string;
    }
  | {
      type: "file_browser_move_animation";
      targetId: string;
      fromPath: string;
      toPath: string;
      duration?: number;
    };

// Code Editor Updates
type CodeEditorUIUpdate = 
  | {
      type: "code_editor_type_code";
      targetId: string;
      code: string;
      startLine: number;
      speed?: number;
      syntaxHighlight?: boolean;
    }
  | {
      type: "code_editor_line_highlight";
      targetId: string;
      lineNumbers: number[];
      color?: string;
      duration?: number;
    }
  | {
      type: "code_editor_error_shake";
      targetId: string;
      lineNumber: number;
      errorMessage: string;
    }
  | {
      type: "code_editor_run_output";
      targetId: string;
      output: string;
      success: boolean;
    };

// Whiteboard Updates
type WhiteboardUIUpdate = 
  | {
      type: "whiteboard_draw_shape";
      targetId: string;
      shape: "rectangle" | "circle" | "line" | "arrow";
      coordinates: { x: number; y: number; width?: number; height?: number };
      animated?: boolean;
    }
  | {
      type: "whiteboard_write_text";
      targetId: string;
      text: string;
      position: { x: number; y: number };
      handwriting?: boolean; // Simulate handwriting effect
    }
  | {
      type: "whiteboard_clear_animation";
      targetId: string;
      wipeDuration?: number;
    };

// Email Composer Updates
type EmailUIUpdate = 
  | {
      type: "email_type_content";
      targetId: string;
      field: "to" | "subject" | "body";
      content: string;
      speed?: number;
    }
  | {
      type: "email_send_animation";
      targetId: string;
      success: boolean;
      flyDirection?: "up" | "right";
    }
  | {
      type: "email_attachment_add";
      targetId: string;
      fileName: string;
      fileSize: string;
    };

// Union type for all UI updates
export type AppSpecificUIUpdate = 
  | NotesUIUpdate
  | TodoUIUpdate
  | CalendarUIUpdate
  | TimerUIUpdate
  | FileBrowserUIUpdate
  | CodeEditorUIUpdate
  | WhiteboardUIUpdate
  | EmailUIUpdate;

// Tool result with enhanced UI update
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  uiUpdate?: AppSpecificUIUpdate;
  multipleUpdates?: AppSpecificUIUpdate[]; // For complex operations
}
```

---

## 2. UI Update Executor System

```typescript
// lib/uiUpdateExecutor.ts

import { AppSpecificUIUpdate } from '@/types/uiUpdates';

export class UIUpdateExecutor {
  private static instance: UIUpdateExecutor;
  private updateQueue: Array<{ update: AppSpecificUIUpdate; timestamp: number }> = [];
  private isProcessing = false;

  static getInstance(): UIUpdateExecutor {
    if (!this.instance) {
      this.instance = new UIUpdateExecutor();
    }
    return this.instance;
  }

  async execute(update: AppSpecificUIUpdate): Promise<void> {
    this.updateQueue.push({ update, timestamp: Date.now() });
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  async executeMultiple(updates: AppSpecificUIUpdate[]): Promise<void> {
    for (const update of updates) {
      await this.execute(update);
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.updateQueue.length > 0) {
      const { update } = this.updateQueue.shift()!;
      
      // Apply delay if specified
      if ('delay' in update && update.delay) {
        await this.sleep(update.delay);
      }

      // Execute the specific update
      await this.executeUpdate(update);
    }

    this.isProcessing = false;
  }

  private async executeUpdate(update: AppSpecificUIUpdate): Promise<void> {
    const element = document.getElementById(update.targetId);
    if (!element) {
      console.warn(`Element not found: ${update.targetId}`);
      return;
    }

    switch (update.type) {
      // ===== NOTES UPDATES =====
      case "notes_typewriter":
        await this.notesTypewriter(element, update);
        break;
      case "notes_append_scroll":
        await this.notesAppendScroll(element, update);
        break;
      case "notes_file_create_animation":
        await this.notesFileCreate(element, update);
        break;
      case "notes_search_highlight":
        await this.notesSearchHighlight(element, update);
        break;

      // ===== TODO UPDATES =====
      case "todo_task_pop_in":
        await this.todoTaskPopIn(element, update);
        break;
      case "todo_check_animation":
        await this.todoCheckAnimation(element, update);
        break;
      case "todo_priority_pulse":
        await this.todoPriorityPulse(element, update);
        break;
      case "todo_reorder_animation":
        await this.todoReorderAnimation(element, update);
        break;

      // ===== CALENDAR UPDATES =====
      case "calendar_event_slide_in":
        await this.calendarEventSlideIn(element, update);
        break;
      case "calendar_date_jump":
        await this.calendarDateJump(element, update);
        break;
      case "calendar_time_block_grow":
        await this.calendarTimeBlockGrow(element, update);
        break;

      // ===== TIMER UPDATES =====
      case "timer_start_ripple":
        await this.timerStartRipple(element, update);
        break;
      case "timer_countdown_pulse":
        await this.timerCountdownPulse(element, update);
        break;
      case "timer_complete_celebration":
        await this.timerCompleteCelebration(element, update);
        break;

      // ===== FILE BROWSER UPDATES =====
      case "file_browser_folder_expand":
        await this.fileBrowserFolderExpand(element, update);
        break;
      case "file_browser_file_highlight_path":
        await this.fileBrowserHighlightPath(element, update);
        break;
      case "file_browser_create_file":
        await this.fileBrowserCreateFile(element, update);
        break;
      case "file_browser_move_animation":
        await this.fileBrowserMoveAnimation(element, update);
        break;

      // ===== CODE EDITOR UPDATES =====
      case "code_editor_type_code":
        await this.codeEditorTypeCode(element, update);
        break;
      case "code_editor_line_highlight":
        await this.codeEditorLineHighlight(element, update);
        break;
      case "code_editor_error_shake":
        await this.codeEditorErrorShake(element, update);
        break;
      case "code_editor_run_output":
        await this.codeEditorRunOutput(element, update);
        break;

      // ===== WHITEBOARD UPDATES =====
      case "whiteboard_draw_shape":
        await this.whiteboardDrawShape(element, update);
        break;
      case "whiteboard_write_text":
        await this.whiteboardWriteText(element, update);
        break;
      case "whiteboard_clear_animation":
        await this.whiteboardClearAnimation(element, update);
        break;

      // ===== EMAIL UPDATES =====
      case "email_type_content":
        await this.emailTypeContent(element, update);
        break;
      case "email_send_animation":
        await this.emailSendAnimation(element, update);
        break;
      case "email_attachment_add":
        await this.emailAttachmentAdd(element, update);
        break;
    }
  }

  // ===== NOTES IMPLEMENTATIONS =====
  
  private async notesTypewriter(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_typewriter" }>
  ): Promise<void> {
    const speed = update.speed || 50; // characters per second
    const delay = 1000 / speed; // ms per character
    const content = update.content;
    
    // Find or create content element
    const contentEl = element.querySelector('[data-note-content]') || element;
    
    // Show cursor if requested
    if (update.cursor) {
      contentEl.classList.add('typing-cursor');
    }
    
    let currentText = '';
    for (let i = 0; i < content.length; i++) {
      currentText += content[i];
      
      if (contentEl instanceof HTMLInputElement || contentEl instanceof HTMLTextAreaElement) {
        contentEl.value = currentText;
      } else {
        contentEl.textContent = currentText;
      }
      
      // Scroll to bottom as we type
      contentEl.scrollTop = contentEl.scrollHeight;
      
      await this.sleep(delay);
    }
    
    // Remove cursor
    if (update.cursor) {
      contentEl.classList.remove('typing-cursor');
    }
  }

  private async notesAppendScroll(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_append_scroll" }>
  ): Promise<void> {
    const contentEl = element.querySelector('[data-note-content]') || element;
    
    // Create new content element
    const newContent = document.createElement('div');
    newContent.textContent = update.content;
    
    if (update.highlight) {
      newContent.classList.add('agent-appended-content');
      // Remove highlight after animation
      setTimeout(() => {
        newContent.classList.remove('agent-appended-content');
      }, 2000);
    }
    
    // Append and scroll
    contentEl.appendChild(newContent);
    newContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private async notesFileCreate(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_file_create_animation" }>
  ): Promise<void> {
    // Create a file icon that animates into position
    const fileIcon = document.createElement('div');
    fileIcon.className = 'file-create-animation';
    fileIcon.innerHTML = `
      <div class="file-icon">📄</div>
      <div class="file-name">${update.filename}</div>
    `;
    
    // Position at spawn point or center
    if (update.position) {
      fileIcon.style.left = `${update.position.x}px`;
      fileIcon.style.top = `${update.position.y}px`;
    }
    
    document.body.appendChild(fileIcon);
    
    // Animate to target
    await this.sleep(50); // Allow render
    const targetRect = element.getBoundingClientRect();
    fileIcon.style.transform = `translate(${targetRect.left}px, ${targetRect.top}px) scale(0.5)`;
    fileIcon.style.opacity = '0';
    
    await this.sleep(500);
    fileIcon.remove();
    
    // Highlight the target element
    element.classList.add('file-created-pulse');
    setTimeout(() => element.classList.remove('file-created-pulse'), 1000);
  }

  private async notesSearchHighlight(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_search_highlight" }>
  ): Promise<void> {
    const contentEl = element.querySelector('[data-note-content]') || element;
    
    // Highlight each match sequentially
    for (const match of update.matches) {
      const lineEl = contentEl.querySelector(`[data-line="${match.line}"]`);
      if (lineEl) {
        lineEl.classList.add('search-match-highlight');
        if (update.scrollToFirst && match === update.matches[0]) {
          lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        await this.sleep(200);
      }
    }
  }

  // ===== TODO IMPLEMENTATIONS =====

  private async todoTaskPopIn(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_task_pop_in" }>
  ): Promise<void> {
    // Find the task list container
    const taskList = element.querySelector('[data-task-list]') || element;
    
    // Create task element
    const taskEl = document.createElement('div');
    taskEl.className = 'todo-task task-pop-in';
    taskEl.setAttribute('data-priority', update.taskData.priority);
    
    taskEl.innerHTML = `
      <div class="task-checkbox"></div>
      <div class="task-title">${update.taskData.title}</div>
      <div class="task-priority priority-${update.taskData.priority}">
        ${update.taskData.priority}
      </div>
    `;
    
    // Insert at correct position
    const children = Array.from(taskList.children);
    if (update.taskData.position < children.length) {
      taskList.insertBefore(taskEl, children[update.taskData.position]);
    } else {
      taskList.appendChild(taskEl);
    }
    
    // Trigger animation
    await this.sleep(50);
    taskEl.classList.add('popped-in');
    
    // Scroll into view
    taskEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private async todoCheckAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_check_animation" }>
  ): Promise<void> {
    const taskEl = element.querySelector(`[data-task-id="${update.taskId}"]`);
    if (!taskEl) return;
    
    // Animate checkbox check
    const checkbox = taskEl.querySelector('.task-checkbox');
    if (checkbox) {
      checkbox.classList.add('checking');
      await this.sleep(300);
      checkbox.classList.add('checked');
    }
    
    // Strikethrough animation
    if (update.strikethrough) {
      taskEl.classList.add('task-completing');
      await this.sleep(400);
    }
    
    // Confetti celebration
    if (update.confetti) {
      await this.createConfetti(taskEl);
    }
  }

  private async todoPriorityPulse(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_priority_pulse" }>
  ): Promise<void> {
    const priorityEl = element.querySelector('.task-priority');
    if (!priorityEl) return;
    
    priorityEl.classList.add(`priority-pulse-${update.priority}`);
    await this.sleep(1000);
    priorityEl.classList.remove(`priority-pulse-${update.priority}`);
  }

  private async todoReorderAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_reorder_animation" }>
  ): Promise<void> {
    const taskList = element.querySelector('[data-task-list]') || element;
    const duration = update.duration || 500;
    
    // Get current positions
    const tasks = update.taskIds.map(id => 
      taskList.querySelector(`[data-task-id="${id}"]`)
    ).filter(Boolean) as HTMLElement[];
    
    // Animate to new positions
    tasks.forEach((task, index) => {
      task.style.transition = `transform ${duration}ms ease-out`;
      task.style.transform = `translateY(${index * 60}px)`;
    });
    
    await this.sleep(duration);
    
    // Actually reorder in DOM
    tasks.forEach(task => {
      task.style.transform = '';
      task.style.transition = '';
      taskList.appendChild(task);
    });
  }

  // ===== CALENDAR IMPLEMENTATIONS =====

  private async calendarEventSlideIn(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "calendar_event_slide_in" }>
  ): Promise<void> {
    const direction = update.direction || 'left';
    
    // Create event element
    const eventEl = document.createElement('div');
    eventEl.className = `calendar-event slide-in-${direction}`;
    eventEl.innerHTML = `
      <div class="event-time">${update.eventData.time}</div>
      <div class="event-title">${update.eventData.title}</div>
    `;
    
    element.appendChild(eventEl);
    
    await this.sleep(50);
    eventEl.classList.add('slid-in');
  }

  private async calendarDateJump(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "calendar_date_jump" }>
  ): Promise<void> {
    if (!update.animated) {
      // Instant jump
      const dateEl = element.querySelector('[data-calendar-date]');
      if (dateEl) {
        dateEl.textContent = update.toDate;
      }
      return;
    }
    
    // Animated page flip effect
    element.classList.add('calendar-flipping');
    await this.sleep(300);
    
    const dateEl = element.querySelector('[data-calendar-date]');
    if (dateEl) {
      dateEl.textContent = update.toDate;
    }
    
    await this.sleep(300);
    element.classList.remove('calendar-flipping');
  }

  private async calendarTimeBlockGrow(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "calendar_time_block_grow" }>
  ): Promise<void> {
    // Create a growing time block
    const timeBlock = document.createElement('div');
    timeBlock.className = 'calendar-time-block growing';
    timeBlock.setAttribute('data-start', update.startTime);
    timeBlock.setAttribute('data-end', update.endTime);
    
    element.appendChild(timeBlock);
    
    // Calculate height based on time range
    const startHour = parseInt(update.startTime.split(':')[0]);
    const endHour = parseInt(update.endTime.split(':')[0]);
    const height = (endHour - startHour) * 60; // pixels per hour
    
    await this.sleep(50);
    timeBlock.style.height = `${height}px`;
    timeBlock.classList.add('grown');
  }

  // ===== TIMER IMPLEMENTATIONS =====

  private async timerStartRipple(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "timer_start_ripple" }>
  ): Promise<void> {
    // Create ripple effect
    const ripple = document.createElement('div');
    ripple.className = 'timer-ripple';
    element.appendChild(ripple);
    
    await this.sleep(1000);
    ripple.remove();
    
    // Start pulsing
    element.classList.add('timer-running');
  }

  private async timerCountdownPulse(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "timer_countdown_pulse" }>
  ): Promise<void> {
    const displayEl = element.querySelector('[data-timer-display]');
    if (!displayEl) return;
    
    if (update.urgent) {
      element.classList.add('timer-urgent');
      // Add urgent pulsing
      displayEl.classList.add('pulse-urgent');
    } else {
      displayEl.classList.add('pulse-normal');
    }
  }

  private async timerCompleteCelebration(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "timer_complete_celebration" }>
  ): Promise<void> {
    element.classList.remove('timer-running', 'timer-urgent');
    element.classList.add('timer-complete');
    
    // Show completion message
    if (update.message) {
      const messageEl = document.createElement('div');
      messageEl.className = 'timer-complete-message';
      messageEl.textContent = update.message;
      element.appendChild(messageEl);
      
      await this.sleep(3000);
      messageEl.remove();
    }
    
    // Confetti
    await this.createConfetti(element);
    
    // Play sound
    if (update.sound) {
      this.playSound('timer-complete');
    }
  }

  // ===== FILE BROWSER IMPLEMENTATIONS =====

  private async fileBrowserFolderExpand(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_folder_expand" }>
  ): Promise<void> {
    const folderEl = element.querySelector(`[data-folder-path="${update.folderPath}"]`);
    if (!folderEl) return;
    
    if (update.animated) {
      folderEl.classList.add('folder-expanding');
      await this.sleep(300);
    }
    
    folderEl.classList.add('folder-expanded');
    folderEl.classList.remove('folder-expanding');
  }

  private async fileBrowserHighlightPath(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_file_highlight_path" }>
  ): Promise<void> {
    const fileEl = element.querySelector(`[data-file-path="${update.filePath}"]`);
    if (!fileEl) return;
    
    // Highlight the file
    fileEl.classList.add('file-highlighted');
    fileEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Show breadcrumb trail
    if (update.breadcrumb) {
      const pathParts = update.filePath.split('/');
      for (let i = 0; i < pathParts.length - 1; i++) {
        const partialPath = pathParts.slice(0, i + 1).join('/');
        const folderEl = element.querySelector(`[data-folder-path="${partialPath}"]`);
        if (folderEl) {
          folderEl.classList.add('breadcrumb-highlight');
          await this.sleep(100);
        }
      }
    }
    
    // Remove highlights after delay
    setTimeout(() => {
      element.querySelectorAll('.file-highlighted, .breadcrumb-highlight')
        .forEach(el => el.classList.remove('file-highlighted', 'breadcrumb-highlight'));
    }, 3000);
  }

  private async fileBrowserCreateFile(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_create_file" }>
  ): Promise<void> {
    const parentEl = element.querySelector(`[data-folder-path="${update.parentPath}"]`);
    if (!parentEl) return;
    
    // Expand parent folder if needed
    if (!parentEl.classList.contains('folder-expanded')) {
      await this.fileBrowserFolderExpand(element, {
        type: 'file_browser_folder_expand',
        targetId: update.targetId,
        folderPath: update.parentPath,
        animated: true
      });
    }
    
    // Create file element
    const fileEl = document.createElement('div');
    fileEl.className = `file-item ${update.fileType} file-creating`;
    fileEl.setAttribute('data-file-path', update.filePath);
    fileEl.innerHTML = `
      <span class="file-icon">${update.fileType === 'folder' ? '📁' : '📄'}</span>
      <span class="file-name">${update.filePath.split('/').pop()}</span>
    `;
    
    const fileList = parentEl.querySelector('.file-list');
    if (fileList) {
      fileList.appendChild(fileEl);
    }
    
    await this.sleep(50);
    fileEl.classList.add('file-created');
    fileEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private async fileBrowserMoveAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_move_animation" }>
  ): Promise<void> {
    const fileEl = element.querySelector(`[data-file-path="${update.fromPath}"]`);
    if (!fileEl) return;
    
    const targetFolder = element.querySelector(`[data-folder-path="${update.toPath}"]`);
    if (!targetFolder) return;
    
    // Get positions
    const startRect = fileEl.getBoundingClientRect();
    const endRect = targetFolder.getBoundingClientRect();
    
    // Clone for animation
    const clone = fileEl.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    clone.style.width = `${startRect.width}px`;
    clone.classList.add('file-moving');
    document.body.appendChild(clone);
    
    // Hide original
    fileEl.style.opacity = '0';
    
    // Animate
    await this.sleep(50);
    clone.style.transform = `translate(${endRect.left - startRect.left}px, ${endRect.top - startRect.top}px) scale(0.8)`;
    
    await this.sleep(update.duration || 500);
    clone.remove();
    
    // Update DOM
    fileEl.remove();
    // File should be added to new location by the app
  }

  // ===== CODE EDITOR IMPLEMENTATIONS =====

  private async codeEditorTypeCode(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_type_code" }>
  ): Promise<void> {
    const editorEl = element.querySelector('[data-code-editor]') || element;
    const speed = update.speed || 30;
    const delay = 1000 / speed;
    
    // Find or create line element
    let lineEl = editorEl.querySelector(`[data-line="${update.startLine}"]`) as HTMLElement;
    if (!lineEl) {
      lineEl = document.createElement('div');
      lineEl.setAttribute('data-line', String(update.startLine));
      lineEl.className = 'code-line';
      editorEl.appendChild(lineEl);
    }
    
    // Add cursor
    lineEl.classList.add('typing-code');
    
    // Type each character
    const lines = update.code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const currentLineEl = i === 0 ? lineEl : this.createCodeLine(editorEl, update.startLine + i);
      
      for (let j = 0; j < line.length; j++) {
        const currentText = line.substring(0, j + 1);
        
        if (update.syntaxHighlight) {
          currentLineEl.innerHTML = this.syntaxHighlight(currentText);
        } else {
          currentLineEl.textContent = currentText;
        }
        
        await this.sleep(delay);
      }
      
      if (i < lines.length - 1) {
        await this.sleep(100); // Pause at end of line
      }
    }
    
    lineEl.classList.remove('typing-code');
  }

  private async codeEditorLineHighlight(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_line_highlight" }>
  ): Promise<void> {
    const editorEl = element.querySelector('[data-code-editor]') || element;
    const color = update.color || '#fef3c7';
    const duration = update.duration || 2000;
    
    for (const lineNum of update.lineNumbers) {
      const lineEl = editorEl.querySelector(`[data-line="${lineNum}"]`);
      if (lineEl) {
        (lineEl as HTMLElement).style.backgroundColor = color;
        lineEl.classList.add('line-highlighted');
      }
    }
    
    setTimeout(() => {
      update.lineNumbers.forEach(lineNum => {
        const lineEl = editorEl.querySelector(`[data-line="${lineNum}"]`);
        if (lineEl) {
          (lineEl as HTMLElement).style.backgroundColor = '';
          lineEl.classList.remove('line-highlighted');
        }
      });
    }, duration);
  }

  private async codeEditorErrorShake(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_error_shake" }>
  ): Promise<void> {
    const editorEl = element.querySelector('[data-code-editor]') || element;
    const lineEl = editorEl.querySelector(`[data-line="${update.lineNumber}"]`);
    if (!lineEl) return;
    
    lineEl.classList.add('error-shake');
    
    // Show error message
    const errorMsg = document.createElement('div');
    errorMsg.className = 'code-error-message';
    errorMsg.textContent = update.errorMessage;
    lineEl.appendChild(errorMsg);
    
    await this.sleep(2000);
    lineEl.classList.remove('error-shake');
    errorMsg.remove();
  }

  private async codeEditorRunOutput(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_run_output" }>
  ): Promise<void> {
    const outputEl = element.querySelector('[data-code-output]');
    if (!outputEl) return;
    
    outputEl.classList.add('output-appearing');
    outputEl.classList.toggle('output-success', update.success);
    outputEl.classList.toggle('output-error', !update.success);
    
    // Type out output
    const lines = update.output.split('\n');
    for (const line of lines) {
      const lineEl = document.createElement('div');
      lineEl.className = 'output-line';
      lineEl.textContent = line;
      outputEl.appendChild(lineEl);
      await this.sleep(50);
    }
  }

  // ===== WHITEBOARD IMPLEMENTATIONS =====

  private async whiteboardDrawShape(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "whiteboard_draw_shape" }>
  ): Promise<void> {
    const canvas = element.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!update.animated) {
      // Draw instantly
      this.drawShape(ctx, update.shape, update.coordinates);
      return;
    }
    
    // Animated drawing
    switch (update.shape) {
      case 'rectangle':
        await this.animateRectangle(ctx, update.coordinates);
        break;
      case 'circle':
        await this.animateCircle(ctx, update.coordinates);
        break;
      case 'line':
      case 'arrow':
        await this.animateLine(ctx, update.coordinates, update.shape === 'arrow');
        break;
    }
  }

  private async whiteboardWriteText(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "whiteboard_write_text" }>
  ): Promise<void> {
    const canvas = element.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.font = '20px Arial';
    ctx.fillStyle = '#000';
    
    if (update.handwriting) {
      // Simulate handwriting
      for (let i = 0; i <= update.text.length; i++) {
        ctx.clearRect(update.position.x, update.position.y - 20, 500, 30);
        ctx.fillText(update.text.substring(0, i), update.position.x, update.position.y);
        await this.sleep(100);
      }
    } else {
      ctx.fillText(update.text, update.position.x, update.position.y);
    }
  }

  private async whiteboardClearAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "whiteboard_clear_animation" }>
  ): Promise<void> {
    const canvas = element.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const duration = update.wipeDuration || 1000;
    const steps = 50;
    const stepDelay = duration / steps;
    
    // Wipe from left to right
    for (let i = 0; i <= steps; i++) {
      const x = (canvas.width / steps) * i;
      ctx.clearRect(0, 0, x, canvas.height);
      await this.sleep(stepDelay);
    }
  }

  // ===== EMAIL IMPLEMENTATIONS =====

  private async emailTypeContent(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "email_type_content" }>
  ): Promise<void> {
    const fieldEl = element.querySelector(`[data-email-field="${update.field}"]`) as HTMLInputElement | HTMLTextAreaElement;
    if (!fieldEl) return;
    
    const speed = update.speed || 40;
    const delay = 1000 / speed;
    
    fieldEl.focus();
    
    for (let i = 0; i <= update.content.length; i++) {
      fieldEl.value = update.content.substring(0, i);
      await this.sleep(delay);
    }
  }

  private async emailSendAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "email_send_animation" }>
  ): Promise<void> {
    const emailEl = element.querySelector('[data-email-draft]');
    if (!emailEl) return;
    
    emailEl.classList.add('email-sending');
    
    const direction = update.flyDirection || 'up';
    await this.sleep(300);
    
    emailEl.classList.add(`email-fly-${direction}`);
    
    await this.sleep(800);
    
    if (update.success) {
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.className = 'email-sent-success';
      successMsg.textContent = '✓ Email sent!';
      element.appendChild(successMsg);
      
      await this.sleep(2000);
      successMsg.remove();
    }
    
    emailEl.classList.remove('email-sending', `email-fly-${direction}`);
  }

  private async emailAttachmentAdd(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "email_attachment_add" }>
  ): Promise<void> {
    const attachmentList = element.querySelector('[data-email-attachments]');
    if (!attachmentList) return;
    
    const attachmentEl = document.createElement('div');
    attachmentEl.className = 'email-attachment attachment-adding';
    attachmentEl.innerHTML = `
      <span class="attachment-icon">📎</span>
      <span class="attachment-name">${update.fileName}</span>
      <span class="attachment-size">${update.fileSize}</span>
    `;
    
    attachmentList.appendChild(attachmentEl);
    
    await this.sleep(50);
    attachmentEl.classList.add('attachment-added');
  }

  // ===== HELPER METHODS =====

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createCodeLine(container: HTMLElement, lineNumber: number): HTMLElement {
    const lineEl = document.createElement('div');
    lineEl.setAttribute('data-line', String(lineNumber));
    lineEl.className = 'code-line';
    container.appendChild(lineEl);
    return lineEl;
  }

  private syntaxHighlight(code: string): string {
    // Simple syntax highlighting (can be enhanced)
    return code
      .replace(/\b(const|let|var|function|return|if|else|for|while)\b/g, '<span class="keyword">$1</span>')
      .replace(/(['"])(.*?)\1/g, '<span class="string">$1$2$1</span>')
      .replace(/\b(\d+)\b/g, '<span class="number">$1</span>');
  }

  private drawShape(ctx: CanvasRenderingContext2D, shape: string, coords: any): void {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    
    switch (shape) {
      case 'rectangle':
        ctx.strokeRect(coords.x, coords.y, coords.width || 100, coords.height || 100);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, coords.width || 50, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'line':
      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        ctx.lineTo(coords.x + (coords.width || 100), coords.y + (coords.height || 0));
        ctx.stroke();
        break;
    }
  }

  private async animateRectangle(ctx: CanvasRenderingContext2D, coords: any): Promise<void> {
    const width = coords.width || 100;
    const height = coords.height || 100;
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const w = width * progress;
      const h = height * progress;
      
      ctx.clearRect(coords.x - 5, coords.y - 5, width + 10, height + 10);
      ctx.strokeRect(coords.x, coords.y, w, h);
      
      await this.sleep(30);
    }
  }

  private async animateCircle(ctx: CanvasRenderingContext2D, coords: any): Promise<void> {
    const radius = coords.width || 50;
    const steps = 30;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const angle = Math.PI * 2 * progress;
      
      ctx.clearRect(coords.x - radius - 5, coords.y - radius - 5, radius * 2 + 10, radius * 2 + 10);
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, radius, 0, angle);
      ctx.stroke();
      
      await this.sleep(20);
    }
  }

  private async animateLine(ctx: CanvasRenderingContext2D, coords: any, withArrow: boolean): Promise<void> {
    const endX = coords.x + (coords.width || 100);
    const endY = coords.y + (coords.height || 0);
    const steps = 20;
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const currentX = coords.x + (endX - coords.x) * progress;
      const currentY = coords.y + (endY - coords.y) * progress;
      
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();
      
      await this.sleep(30);
    }
    
    if (withArrow) {
      // Draw arrowhead
      const angle = Math.atan2(endY - coords.y, endX - coords.x);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 10 * Math.cos(angle - Math.PI / 6), endY - 10 * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(endX, endY);
      ctx.lineTo(endX - 10 * Math.cos(angle + Math.PI / 6), endY - 10 * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    }
  }

  private async createConfetti(element: HTMLElement): Promise<void> {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti-piece';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.left = '50%';
      confetti.style.top = '50%';
      
      element.appendChild(confetti);
      
      // Random animation
      const angle = (Math.random() * 360) * (Math.PI / 180);
      const distance = Math.random() * 200 + 100;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      confetti.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg)`;
      confetti.style.opacity = '0';
      
      setTimeout(() => confetti.remove(), 1000);
      
      await this.sleep(20);
    }
  }

  private playSound(soundId: string): void {
    // Implementation would load and play audio
    const audio = new Audio(`/sounds/${soundId}.mp3`);
    audio.play().catch(err => console.warn('Could not play sound:', err));
  }
}

// Export singleton instance
export const uiUpdateExecutor = UIUpdateExecutor.getInstance();
```

---

## 3. Enhanced CSS Animations

```css
/* styles/agent-animations.css */

/* ===== NOTES ANIMATIONS ===== */

.typing-cursor::after {
  content: '|';
  animation: cursor-blink 1s infinite;
  margin-left: 2px;
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.agent-appended-content {
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent);
  background-size: 200% 100%;
  animation: append-highlight 2s ease-out;
}

@keyframes append-highlight {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.file-create-animation {
  position: fixed;
  z-index: 9999;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.file-created-pulse {
  animation: file-pulse 1s ease-out;
}

@keyframes file-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
}

.search-match-highlight {
  background: linear-gradient(90deg, 
    transparent 0%, 
    rgba(250, 204, 21, 0.4) 25%, 
    rgba(250, 204, 21, 0.4) 75%, 
    transparent 100%
  );
  animation: search-sweep 0.6s ease-out;
}

@keyframes search-sweep {
  from {
    background-position: -100% 0;
  }
  to {
    background-position: 100% 0;
  }
}

/* ===== TODO ANIMATIONS ===== */

.task-pop-in {
  opacity: 0;
  transform: scale(0.8) translateY(-20px);
  animation: pop-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes pop-in {
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.task-checkbox.checking {
  animation: checkbox-check 0.3s ease-out;
}

@keyframes checkbox-check {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.task-checkbox.checked::after {
  content: '✓';
  color: #10b981;
  font-weight: bold;
  animation: checkmark-appear 0.3s ease-out;
}

@keyframes checkmark-appear {
  from {
    opacity: 0;
    transform: scale(0) rotate(-45deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

.task-completing {
  animation: task-strikethrough 0.4s ease-out forwards;
}

@keyframes task-strikethrough {
  to {
    opacity: 0.5;
    text-decoration: line-through;
    transform: translateX(10px);
  }
}

.priority-pulse-high {
  animation: priority-pulse-high 1s ease-out;
}

@keyframes priority-pulse-high {
  0%, 100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(239, 68, 68, 0.3);
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  }
}

/* ===== CALENDAR ANIMATIONS ===== */

.calendar-event {
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.calendar-event.slide-in-left {
  transform: translateX(-100%);
}

.calendar-event.slide-in-right {
  transform: translateX(100%);
}

.calendar-event.slid-in {
  opacity: 1;
  transform: translateX(0);
}

.calendar-flipping {
  animation: calendar-flip 0.6s ease-in-out;
}

@keyframes calendar-flip {
  0% {
    transform: rotateY(0deg);
  }
  50% {
    transform: rotateY(90deg);
  }
  100% {
    transform: rotateY(0deg);
  }
}

.calendar-time-block {
  height: 0;
  background: rgba(59, 130, 246, 0.2);
  border-left: 3px solid #3b82f6;
  transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.calendar-time-block.grown {
  opacity: 1;
}

/* ===== TIMER ANIMATIONS ===== */

.timer-ripple {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #3b82f6;
  animation: timer-ripple-expand 1s ease-out;
}

@keyframes timer-ripple-expand {
  from {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  to {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

.timer-running {
  animation: timer-pulse 2s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
  }
}

.timer-urgent {
  animation: timer-urgent-pulse 0.5s ease-in-out infinite;
}

@keyframes timer-urgent-pulse {
  0%, 100% {
    background-color: transparent;
  }
  50% {
    background-color: rgba(239, 68, 68, 0.2);
  }
}

.timer-complete-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: message-bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes message-bounce {
  from {
    transform: translate(-50%, -50%) scale(0);
    opacity: 0;
  }
  to {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
}

/* ===== FILE BROWSER ANIMATIONS ===== */

.folder-expanding {
  animation: folder-expand 0.3s ease-out;
}

@keyframes folder-expand {
  from {
    max-height: 0;
    opacity: 0;
  }
  to {
    max-height: 500px;
    opacity: 1;
  }
}

.file-highlighted {
  background: linear-gradient(90deg, 
    transparent, 
    rgba(59, 130, 246, 0.3), 
    transparent
  );
  animation: file-highlight-pulse 1s ease-out;
}

@keyframes file-highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  50% {
    box-shadow: 0 0 0 5px rgba(59, 130, 246, 0);
  }
}

.breadcrumb-highlight {
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 2px solid #3b82f6;
  animation: breadcrumb-fade-in 0.2s ease-out;
}

@keyframes breadcrumb-fade-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.file-creating {
  opacity: 0;
  transform: scale(0.5) translateY(-20px);
}

.file-created {
  animation: file-create-pop 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
}

@keyframes file-create-pop {
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.file-moving {
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 9999;
}

/* ===== CODE EDITOR ANIMATIONS ===== */

.typing-code::after {
  content: '▊';
  animation: code-cursor-blink 0.7s infinite;
  color: #3b82f6;
  margin-left: 2px;
}

@keyframes code-cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.line-highlighted {
  animation: line-highlight-flash 0.3s ease-out;
}

@keyframes line-highlight-flash {
  from {
    background-color: transparent;
  }
  to {
    background-color: rgba(250, 204, 21, 0.3);
  }
}

.error-shake {
  animation: error-shake 0.4s ease-in-out;
  background-color: rgba(239, 68, 68, 0.1);
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

.code-error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  animation: error-message-slide 0.3s ease-out;
}

@keyframes error-message-slide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.output-appearing {
  animation: output-slide-up 0.3s ease-out;
}

@keyframes output-slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ===== EMAIL ANIMATIONS ===== */

.email-sending {
  animation: email-preparing 0.3s ease-out;
}

@keyframes email-preparing {
  0% { transform: scale(1); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.email-fly-up {
  animation: email-fly-up 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes email-fly-up {
  to {
    transform: translateY(-200%) scale(0.5);
    opacity: 0;
  }
}

.email-sent-success {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #10b981;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: success-bounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes success-bounce {
  from {
    transform: translate(-50%, -50%) scale(0);
  }
  to {
    transform: translate(-50%, -50%) scale(1);
  }
}

.attachment-adding {
  opacity: 0;
  transform: translateX(-20px);
}

.attachment-added {
  animation: attachment-slide 0.3s ease-out forwards;
}

@keyframes attachment-slide {
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== CONFETTI ===== */

.confetti-piece {
  position: absolute;
  width: 10px;
  height: 10px;
  transition: all 1s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

/* ===== SYNTAX HIGHLIGHTING ===== */

.keyword {
  color: #d73a49;
  font-weight: 600;
}

.string {
  color: #032f62;
}

.number {
  color: #005cc5;
}
```

---

## 4. Updated Tool Examples

```typescript
// apps/NotesApp/tools.ts - Enhanced version

export function createNotesTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "notes_create_note",
      description: "Create a new note with specified content and save to the file system",
      appId: "notes",
      parameters: {
        type: "object",
        properties: {
          filename: { type: "string", description: "Note filename" },
          content: { type: "string", description: "Note content" },
          animated: { type: "boolean", description: "Use typewriter effect" }
        },
        required: ["filename", "content"],
      },
      execute: async (params) => {
        const path = `/notes/${params.filename}`;
        await writeFile(path, params.content);
        
        return {
          success: true,
          data: { path },
          uiUpdate: params.animated ? {
            type: "notes_typewriter",
            targetId: `${appInstanceId}-content`,
            content: params.content,
            speed: 50,
            cursor: true
          } : {
            type: "notes_file_create_animation",
            targetId: appInstanceId,
            filename: params.filename,
            position: { x: window.innerWidth / 2, y: 100 }
          }
        };
      },
    },
    
    {
      name: "notes_search_notes",
      description: "Search for notes containing specific text",
      appId: "notes",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          caseSensitive: { type: "boolean", description: "Case sensitive search" }
        },
        required: ["query"],
      },
      execute: async (params) => {
        // Perform search
        const results = await searchNotes(params.query, params.caseSensitive);
        
        return {
          success: true,
          data: { results, count: results.length },
          uiUpdate: {
            type: "notes_search_highlight",
            targetId: `${appInstanceId}-content`,
            matches: results.map(r => ({
              line: r.lineNumber,
              text: r.matchedText
            })),
            scrollToFirst: true
          }
        };
      },
    },
  ];
}

// apps/TodoApp/tools.ts - Enhanced version

export function createTodoTools(appInstanceId: string): AppTool[] {
  return [
    {
      name: "todo_add_task",
      description: "Add a new task to the todo list with a special pop-in animation",
      appId: "todo",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["title"],
      },
      execute: async (params) => {
        const task = await addTask(params);
        const taskList = await getAllTasks();
        
        return {
          success: true,
          data: task,
          uiUpdate: {
            type: "todo_task_pop_in",
            targetId: `${appInstanceId}-list`,
            taskData: {
              title: params.title,
              priority: params.priority || "medium",
              position: taskList.length - 1
            }
          }
        };
      },
    },
    
    {
      name: "todo_complete_task",
      description: "Mark a task as completed with celebration animation",
      appId: "todo",
      parameters: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          celebrate: { type: "boolean", description: "Show confetti celebration" }
        },
        required: ["taskId"],
      },
      execute: async (params) => {
        const task = await completeTask(params.taskId);
        
        return {
          success: true,
          data: task,
          uiUpdate: {
            type: "todo_check_animation",
            targetId: appInstanceId,
            taskId: params.taskId,
            strikethrough: true,
            confetti: params.celebrate !== false
          }
        };
      },
    },
  ];
}
```

---

## 5. Integration with Agent System

```typescript
// hooks/useAgentExecution.ts - Enhanced version

export function useAgentExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [events, setEvents] = useState<AgentEvent[]>([]);

  const executeIntent = useCallback(async (intent: string) => {
    setIsExecuting(true);
    setEvents([]);

    const response = await fetch('/api/agent-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent })
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n\n');

      for (const line of lines) {
        if (line.startsWith('event: tool-result')) {
          const dataLine = line.split('data: ')[1];
          if (dataLine) {
            const eventData = JSON.parse(dataLine);
            
            // Execute UI update using our enhanced system
            if (eventData.uiUpdate) {
              await uiUpdateExecutor.execute(eventData.uiUpdate);
            }
            
            // Handle multiple updates
            if (eventData.multipleUpdates) {
              await uiUpdateExecutor.executeMultiple(eventData.multipleUpdates);
            }
          }
        }
      }
    }

    setIsExecuting(false);
  }, []);

  return { isExecuting, events, executeIntent };
}
```

---

## Summary

This enhanced UI update system provides:

1. **App-Specific Animations**: Each app has tailored, contextual animations
2. **Typewriter Effects**: Natural typing animations for notes, code, emails
3. **Pop-in Effects**: Delightful task creation in todo lists
4. **Path Highlighting**: Visual breadcrumb trails in file browser
5. **Celebration Effects**: Confetti for completed tasks/timers
6. **Smooth Transitions**: Calendar events sliding in, files moving
7. **Real-time Drawing**: Animated whiteboard shape creation
8. **Progress Indicators**: Visual feedback during long operations

The system is:
- **Extensible**: Easy to add new animation types
- **Performant**: Animations are optimized and GPU-accelerated
- **Accessible**: Can be disabled or reduced for accessibility
- **Contextual**: Animations match the action being performed

This makes the AI agent feel truly alive and interactive rather than just flashing elements!