/**
 * Executes app-specific UI updates (animations) from tool results.
 * Queues updates and runs them sequentially; resolves targetId via document.getElementById.
 */

import type { AppSpecificUIUpdate } from "@/lib/types/uiUpdates";
import { getCodeEditorBridge, type CodeEditorBridge } from "@/lib/code-editor-bridge";
import { AGENT_PLACEHOLDER_ID } from "@/lib/constants/agent-placeholder";

export type OnBeforeNextUpdateCallback = (nextUpdate: AppSpecificUIUpdate) => void | Promise<void>;

export class UIUpdateExecutor {
  private static instance: UIUpdateExecutor;
  private updateQueue: Array<{ update: AppSpecificUIUpdate; timestamp: number }> = [];
  private isProcessing = false;
  private onBeforeNextUpdate: OnBeforeNextUpdateCallback | null = null;

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

  setOnBeforeNextUpdate(callback: OnBeforeNextUpdateCallback | null): void {
    this.onBeforeNextUpdate = callback;
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;

    while (this.updateQueue.length > 0) {
      const { update } = this.updateQueue.shift()!;

      const delay = "delay" in update && typeof (update as { delay?: number }).delay === "number" ? (update as { delay: number }).delay : 0;
      if (delay > 0) await this.sleep(delay);

      await this.executeUpdate(update);

      if (this.updateQueue.length > 0 && this.onBeforeNextUpdate) {
        const nextUpdate = this.updateQueue[0].update;
        await Promise.resolve(this.onBeforeNextUpdate(nextUpdate));
        await this.sleep(0);
      }
    }

    this.isProcessing = false;
  }

  private async executeUpdate(update: AppSpecificUIUpdate): Promise<void> {
    const element = document.getElementById(update.targetId);
    if (!element) {
      console.warn(`[UIUpdateExecutor] Element not found: ${update.targetId}`);
      return;
    }

    switch (update.type) {
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
      case "calendar_event_slide_in":
        await this.calendarEventSlideIn(element, update);
        break;
      case "calendar_date_jump":
        await this.calendarDateJump(element, update);
        break;
      case "calendar_time_block_grow":
        await this.calendarTimeBlockGrow(element, update);
        break;
      case "timer_start_ripple":
        await this.timerStartRipple(element, update);
        break;
      case "timer_countdown_pulse":
        await this.timerCountdownPulse(element, update);
        break;
      case "timer_complete_celebration":
        await this.timerCompleteCelebration(element, update);
        break;
      case "file_browser_folder_expand":
        await this.fileBrowserFolderExpand(element, update);
        break;
      case "file_browser_file_highlight_path":
        await this.fileBrowserFileHighlightPath(element, update);
        break;
      case "file_browser_create_file":
        await this.fileBrowserCreateFile(element, update);
        break;
      case "file_browser_move_animation":
        await this.fileBrowserMoveAnimation(element, update);
        break;
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
      case "whiteboard_draw_shape":
        await this.whiteboardDrawShape(element, update);
        break;
      case "whiteboard_write_text":
        await this.whiteboardWriteText(element, update);
        break;
      case "whiteboard_clear_animation":
        await this.whiteboardClearAnimation(element, update);
        break;
      case "email_type_content":
        await this.emailTypeContent(element, update);
        break;
      case "email_send_animation":
        await this.emailSendAnimation(element, update);
        break;
      case "email_attachment_add":
        await this.emailAttachmentAdd(element, update);
        break;
        break;
    }
  }

  private stub(update: AppSpecificUIUpdate): void {
    console.warn("[UIUpdateExecutor] UI update not implemented:", (update as { type: string }).type);
  }

  // ----- Notes -----

  private async notesTypewriter(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_typewriter" }>
  ): Promise<void> {
    // In Agent view, content is synced via agentNoteContent; skip DOM update to avoid overwriting the placeholder.
    if (element.id === AGENT_PLACEHOLDER_ID) return;

    const content = update.content;
    const contentEl = (element.querySelector("[data-note-content]") || element) as HTMLElement;
    const editable =
      contentEl instanceof HTMLInputElement || contentEl instanceof HTMLTextAreaElement
        ? contentEl
        : (contentEl.querySelector("textarea, input") as HTMLTextAreaElement | HTMLInputElement | null) ?? contentEl;

    if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
      editable.value = content;
    } else {
      editable.textContent = content;
    }
    editable.scrollTop = editable.scrollHeight;
  }

  private async notesAppendScroll(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_append_scroll" }>
  ): Promise<void> {
    if (element.id === AGENT_PLACEHOLDER_ID) return;

    const contentEl = element.querySelector("[data-note-content]") || element;
    const newContent = document.createElement("div");
    newContent.textContent = update.content;

    if (update.highlight) {
      newContent.classList.add("agent-appended-content");
      setTimeout(() => newContent.classList.remove("agent-appended-content"), 2000);
    }

    contentEl.appendChild(newContent);
    newContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  private async notesFileCreate(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_file_create_animation" }>
  ): Promise<void> {
    if (element.id === AGENT_PLACEHOLDER_ID) return;

    const fileIcon = document.createElement("div");
    fileIcon.className = "file-create-animation";
    fileIcon.innerHTML = `
      <div class="file-icon">📄</div>
      <div class="file-name">${update.filename}</div>
    `;

    if (update.position) {
      fileIcon.style.left = `${update.position.x}px`;
      fileIcon.style.top = `${update.position.y}px`;
    }

    document.body.appendChild(fileIcon);
    await this.sleep(50);
    const targetRect = element.getBoundingClientRect();
    fileIcon.style.transform = `translate(${targetRect.left}px, ${targetRect.top}px) scale(0.5)`;
    fileIcon.style.opacity = "0";

    await this.sleep(500);
    fileIcon.remove();

    element.classList.add("file-created-pulse");
    setTimeout(() => element.classList.remove("file-created-pulse"), 1000);
  }

  private async notesSearchHighlight(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_search_highlight" }>
  ): Promise<void> {
    if (element.id === AGENT_PLACEHOLDER_ID) return;

    const contentEl = element.querySelector("[data-note-content]") || element;
    for (const match of update.matches) {
      const lineEl = contentEl.querySelector(`[data-line="${match.line}"]`);
      if (lineEl) {
        lineEl.classList.add("search-match-highlight");
        if (update.scrollToFirst && match === update.matches[0]) {
          lineEl.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        await this.sleep(200);
      }
    }
  }

  // ----- Todo -----

  private async todoTaskPopIn(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_task_pop_in" }>
  ): Promise<void> {
    const taskList = element.querySelector("[data-task-list]") || element;
    const taskEl = document.createElement("li");
    taskEl.className = "todo-task task-pop-in";
    taskEl.setAttribute("data-priority", update.taskData.priority);
    taskEl.setAttribute("data-task-id", `pop-in-${Date.now()}`);
    taskEl.innerHTML = `
      <div class="task-checkbox"></div>
      <div class="task-title">${update.taskData.title}</div>
      <div class="task-priority priority-${update.taskData.priority}">${update.taskData.priority}</div>
    `;

    const children = Array.from(taskList.children);
    const insertBeforeIndex = Math.min(update.taskData.position, children.length);
    const ref = children[insertBeforeIndex];
    if (ref) {
      taskList.insertBefore(taskEl, ref);
    } else {
      taskList.appendChild(taskEl);
    }

    await this.sleep(50);
    taskEl.classList.add("popped-in");
    taskEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  private async todoCheckAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_check_animation" }>
  ): Promise<void> {
    const taskEl = element.querySelector(`[data-task-id="${update.taskId}"]`);
    if (!taskEl) return;

    const checkbox = taskEl.querySelector(".task-checkbox");
    if (checkbox) {
      checkbox.classList.add("checking");
      await this.sleep(300);
      checkbox.classList.add("checked");
      const input = taskEl.querySelector('input[type="checkbox"]');
      if (input instanceof HTMLInputElement) input.checked = true;
    }

    if (update.strikethrough) {
      taskEl.classList.add("task-completing");
      await this.sleep(400);
    }

    if (update.confetti) {
      await this.createConfetti(taskEl as HTMLElement);
    }
  }

  private async todoPriorityPulse(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_priority_pulse" }>
  ): Promise<void> {
    const priorityEl = element.querySelector(".task-priority");
    if (!priorityEl) return;
    priorityEl.classList.add(`priority-pulse-${update.priority}`);
    await this.sleep(1000);
    priorityEl.classList.remove(`priority-pulse-${update.priority}`);
  }

  // ----- Calendar -----

  private async calendarEventSlideIn(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "calendar_event_slide_in" }>
  ): Promise<void> {
    const direction = update.direction ?? "left";
    const eventEl = document.createElement("div");
    eventEl.className = `calendar-event slide-in-${direction}`;
    eventEl.setAttribute("data-event-id", `slide-${Date.now()}`);
    eventEl.innerHTML = `
      <div class="event-time">${update.eventData.time ?? ""}</div>
      <div class="event-title">${update.eventData.title}</div>
    `;

    element.appendChild(eventEl);
    await this.sleep(50);
    eventEl.classList.add("slid-in");
    eventEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  private async calendarDateJump(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "calendar_date_jump" }>
  ): Promise<void> {
    const dateEl = element.querySelector("[data-calendar-date]");
    if (!dateEl) return;

    const formattedDate = (() => {
      try {
        const d = new Date(update.toDate + "T12:00:00");
        return d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
      } catch {
        return update.toDate;
      }
    })();

    if (!update.animated) {
      dateEl.textContent = formattedDate;
      dateEl.setAttribute("data-calendar-date", update.toDate);
      return;
    }

    element.classList.add("calendar-flipping");
    await this.sleep(300);
    dateEl.textContent = formattedDate;
    dateEl.setAttribute("data-calendar-date", update.toDate);
    await this.sleep(300);
    element.classList.remove("calendar-flipping");
  }

  private async calendarTimeBlockGrow(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "calendar_time_block_grow" }>
  ): Promise<void> {
    const timeBlock = document.createElement("div");
    timeBlock.className = "calendar-time-block growing";
    timeBlock.setAttribute("data-start", update.startTime);
    timeBlock.setAttribute("data-end", update.endTime);

    element.appendChild(timeBlock);
    const startHour = parseInt(update.startTime.split(":")[0], 10) || 0;
    const endHour = parseInt(update.endTime.split(":")[0], 10) || startHour + 1;
    const height = Math.max((endHour - startHour) * 60, 60);

    await this.sleep(50);
    timeBlock.style.height = `${height}px`;
    timeBlock.classList.add("grown");
  }

  // ----- Whiteboard -----

  private async whiteboardDrawShape(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "whiteboard_draw_shape" }>
  ): Promise<void> {
    const { shape, coordinates } = update;
    const shapeEl = document.createElement("div");
    shapeEl.className = `whiteboard-shape whiteboard-${shape} whiteboard-shape-entering`;
    const { x, y, width = 80, height = 60 } = coordinates;
    shapeEl.style.left = `${x}px`;
    shapeEl.style.top = `${y}px`;
    shapeEl.style.width = `${width}px`;
    shapeEl.style.height = `${height}px`;
    if (shape === "line" || shape === "arrow") {
      shapeEl.style.width = `${Math.max(width, 60)}px`;
      shapeEl.style.height = "4px";
    }
    element.appendChild(shapeEl);
    await this.sleep(50);
    shapeEl.classList.add("whiteboard-shape-entered");
  }

  private async whiteboardWriteText(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "whiteboard_write_text" }>
  ): Promise<void> {
    const textEl = document.createElement("div");
    textEl.className = "whiteboard-text whiteboard-text-entering";
    textEl.textContent = update.text;
    textEl.style.left = `${update.position.x}px`;
    textEl.style.top = `${update.position.y}px`;
    element.appendChild(textEl);
    await this.sleep(50);
    textEl.classList.add("whiteboard-text-entered");
  }

  private async whiteboardClearAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "whiteboard_clear_animation" }>
  ): Promise<void> {
    const duration = update.wipeDuration ?? 500;
    element.classList.add("whiteboard-clearing");
    await this.sleep(duration);
    element.classList.remove("whiteboard-clearing");
  }

  // ----- Email -----

  private async emailTypeContent(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "email_type_content" }>
  ): Promise<void> {
    const fieldEl = element.querySelector(`[data-email-${update.field}]`);
    if (!fieldEl) return;
    const input = fieldEl instanceof HTMLInputElement || fieldEl instanceof HTMLTextAreaElement
      ? fieldEl
      : (fieldEl.querySelector("input, textarea") as HTMLInputElement | HTMLTextAreaElement | null);
    if (!input) return;
    const speed = update.speed ?? 40;
    const delay = 1000 / speed;
    const content = update.content;
    input.classList.add("typing-cursor");
    let currentText = "";
    for (let i = 0; i < content.length; i++) {
      currentText += content[i];
      input.value = currentText;
      if (input instanceof HTMLTextAreaElement) input.scrollTop = input.scrollHeight;
      await this.sleep(delay);
    }
    input.classList.remove("typing-cursor");
  }

  private async emailSendAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "email_send_animation" }>
  ): Promise<void> {
    element.classList.add(update.success ? "email-sent-success" : "email-sent-error");
    await this.sleep(1500);
    element.classList.remove("email-sent-success", "email-sent-error");
  }

  private async emailAttachmentAdd(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "email_attachment_add" }>
  ): Promise<void> {
    const container = element.querySelector("[data-email-attachments]");
    if (!container) return;
    const chip = document.createElement("div");
    chip.className = "email-attachment-chip";
    chip.setAttribute("data-attachment", update.fileName);
    chip.textContent = `${update.fileName} (${update.fileSize})`;
    container.appendChild(chip);
    chip.classList.add("attachment-added");
  }

  // ----- Code Editor -----

  /** Wait for the code editor bridge to register (e.g. Agent view app mounting). Polls up to ~2s. */
  private async waitForCodeEditorBridge(targetId: string): Promise<CodeEditorBridge | undefined> {
    const pollMs = 50;
    const maxWaitMs = 2000;
    const maxAttempts = Math.ceil(maxWaitMs / pollMs);
    for (let i = 0; i < maxAttempts; i++) {
      const bridge = getCodeEditorBridge(targetId);
      if (bridge) return bridge;
      await this.sleep(pollMs);
    }
    return undefined;
  }

  private async codeEditorTypeCode(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_type_code" }>
  ): Promise<void> {
    let bridge = getCodeEditorBridge(element.id);
    if (!bridge && element.id === AGENT_PLACEHOLDER_ID) {
      bridge = await this.waitForCodeEditorBridge(element.id);
    }
    if (bridge) {
      bridge.setContent(update.code);
      return;
    }

    // Only use DOM fallback when we have a real workspace code editor (not agent placeholder).
    // Otherwise skip so we don't overwrite the CodeMirror area with plain text.
    if (element.id === AGENT_PLACEHOLDER_ID) return;

    const editorEl = element.querySelector("[data-code-editor]") || element;
    const textarea = editorEl.querySelector("textarea");
    const target = textarea ?? (editorEl.querySelector("[data-code-content]") as HTMLElement) ?? element;
    const speed = update.speed ?? 35;
    const delay = 1000 / speed;
    const content = update.code;

    if (textarea) {
      textarea.classList.add("typing-cursor");
      let currentText = "";
      for (let i = 0; i < content.length; i++) {
        currentText += content[i];
        textarea.value = currentText;
        textarea.scrollTop = textarea.scrollHeight;
        await this.sleep(delay);
      }
      textarea.classList.remove("typing-cursor");
    } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      let currentText = "";
      for (let i = 0; i < content.length; i++) {
        currentText += content[i];
        target.value = currentText;
        target.scrollTop = target.scrollHeight;
        await this.sleep(delay);
      }
    } else {
      target.textContent = update.code;
    }
  }

  private async codeEditorLineHighlight(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_line_highlight" }>
  ): Promise<void> {
    let bridge = getCodeEditorBridge(element.id);
    if (!bridge && element.id === AGENT_PLACEHOLDER_ID) {
      bridge = await this.waitForCodeEditorBridge(element.id);
    }
    const color = update.color ?? "oklch(0.75 0.15 85 / 0.4)";
    const duration = update.duration ?? 2000;

    if (bridge) {
      bridge.setLineHighlight(update.lineNumbers, color, duration);
      return;
    }

    // Skip DOM fallback for agent placeholder so we don't touch the CodeMirror area.
    if (element.id === AGENT_PLACEHOLDER_ID) return;

    const editorEl = element.querySelector("[data-code-editor]") || element;

    for (const lineNum of update.lineNumbers) {
      const lineEl = editorEl.querySelector(`[data-line="${lineNum}"]`);
      if (lineEl) {
        (lineEl as HTMLElement).style.backgroundColor = color;
        (lineEl as HTMLElement).classList.add("line-highlighted");
      }
    }

    const hasMatches = update.lineNumbers.some((n) => editorEl.querySelector(`[data-line="${n}"]`));
    if (!hasMatches) {
      editorEl.classList.add("code-editor-flash");
      await this.sleep(300);
      editorEl.classList.remove("code-editor-flash");
    }

    setTimeout(() => {
      update.lineNumbers.forEach((n) => {
        const el = editorEl.querySelector(`[data-line="${n}"]`);
        if (el) {
          (el as HTMLElement).style.backgroundColor = "";
          (el as HTMLElement).classList.remove("line-highlighted");
        }
      });
    }, duration);
  }

  private async codeEditorErrorShake(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_error_shake" }>
  ): Promise<void> {
    const editorEl = element.querySelector("[data-code-editor]") || element;
    editorEl.classList.add("code-editor-error-shake");
    await this.sleep(500);
    editorEl.classList.remove("code-editor-error-shake");
  }

  private async codeEditorRunOutput(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "code_editor_run_output" }>
  ): Promise<void> {
    const outputEl = element.querySelector("[data-code-output]");
    if (outputEl) {
      outputEl.textContent = update.output;
      outputEl.classList.toggle("code-output-success", update.success);
      outputEl.classList.toggle("code-output-error", !update.success);
      outputEl.classList.add("code-output-visible");
    }
  }

  // ----- Timer -----

  private async timerStartRipple(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "timer_start_ripple" }>
  ): Promise<void> {
    const ripple = document.createElement("div");
    ripple.className = "timer-ripple";
    element.appendChild(ripple);
    await this.sleep(1000);
    ripple.remove();
    element.classList.add("timer-running");
  }

  private async timerCountdownPulse(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "timer_countdown_pulse" }>
  ): Promise<void> {
    const displayEl = element.querySelector("[data-timer-display]");
    if (!displayEl) return;
    if (update.urgent) {
      element.classList.add("timer-urgent");
      displayEl.classList.add("pulse-urgent");
    } else {
      displayEl.classList.add("pulse-normal");
    }
    await this.sleep(500);
  }

  private async timerCompleteCelebration(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "timer_complete_celebration" }>
  ): Promise<void> {
    element.classList.remove("timer-running", "timer-urgent");
    element.classList.add("timer-complete");
    if (update.message) {
      const messageEl = document.createElement("div");
      messageEl.className = "timer-complete-message";
      messageEl.textContent = update.message;
      element.appendChild(messageEl);
      await this.sleep(3000);
      messageEl.remove();
    }
    await this.createConfetti(element);
  }

  // ----- File Browser -----

  private async fileBrowserFolderExpand(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_folder_expand" }>
  ): Promise<void> {
    const folderEl = element.querySelector(`[data-folder-path="${update.folderPath}"]`);
    if (!folderEl) return;

    if (update.animated) {
      folderEl.classList.add("folder-expanding");
      await this.sleep(300);
    }
    folderEl.classList.add("folder-expanded");
    folderEl.classList.remove("folder-expanding");
    (folderEl as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  private async fileBrowserFileHighlightPath(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_file_highlight_path" }>
  ): Promise<void> {
    const fileEl = element.querySelector(`[data-file-path="${update.filePath}"]`);
    if (!fileEl) return;

    (fileEl as HTMLElement).classList.add("file-highlighted");
    (fileEl as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });

    if (update.breadcrumb) {
      const pathParts = update.filePath.split("/").filter(Boolean);
      for (let i = 0; i < pathParts.length - 1; i++) {
        const partialPath = "/" + pathParts.slice(0, i + 1).join("/");
        const folderEl = element.querySelector(`[data-folder-path="${partialPath}"]`);
        if (folderEl) {
          (folderEl as HTMLElement).classList.add("breadcrumb-highlight");
          await this.sleep(100);
        }
      }
    }

    setTimeout(() => {
      element
        .querySelectorAll(".file-highlighted, .breadcrumb-highlight")
        .forEach((el) => el.classList.remove("file-highlighted", "breadcrumb-highlight"));
    }, 3000);
  }

  private async fileBrowserCreateFile(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_create_file" }>
  ): Promise<void> {
    const fileList = element.querySelector("[data-file-list]");
    if (!fileList) return;

    const fileName = update.filePath.split("/").pop() ?? update.filePath;
    const fileEl = document.createElement("li");
    fileEl.className = "flex items-center justify-between gap-2 px-3 py-2 file-creating hover:bg-muted";
    fileEl.setAttribute("data-file-path", update.filePath);
    fileEl.innerHTML = `
      <span class="flex min-w-0 flex-1 items-center gap-2 text-left text-sm text-foreground">
        <span class="size-4 shrink-0 text-muted-foreground">📄</span>
        <span class="truncate">${fileName}</span>
      </span>
    `;

    fileList.appendChild(fileEl);
    await this.sleep(50);
    fileEl.classList.add("file-created");
    fileEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  private async fileBrowserMoveAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "file_browser_move_animation" }>
  ): Promise<void> {
    const fileEl = element.querySelector(`[data-file-path="${update.fromPath}"]`);
    const targetFolder = element.querySelector(`[data-folder-path="${update.toPath}"]`);
    if (!fileEl || !targetFolder) return;

    const startRect = (fileEl as HTMLElement).getBoundingClientRect();
    const endRect = (targetFolder as HTMLElement).getBoundingClientRect();

    const clone = fileEl.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.left = `${startRect.left}px`;
    clone.style.top = `${startRect.top}px`;
    clone.style.width = `${startRect.width}px`;
    clone.classList.add("file-moving");
    document.body.appendChild(clone);

    (fileEl as HTMLElement).style.opacity = "0";

    await this.sleep(50);
    clone.style.transition = `transform ${update.duration ?? 500}ms ease-out`;
    clone.style.transform = `translate(${endRect.left - startRect.left}px, ${endRect.top - startRect.top}px) scale(0.8)`;

    await this.sleep(update.duration ?? 500);
    clone.remove();
    (fileEl as HTMLElement).style.opacity = "";
    (fileEl as HTMLElement).remove();
  }

  private async todoReorderAnimation(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "todo_reorder_animation" }>
  ): Promise<void> {
    const taskList = element.querySelector("[data-task-list]") || element;
    const duration = update.duration ?? 500;
    const tasks = update.taskIds
      .map((id) => taskList.querySelector(`[data-task-id="${id}"]`))
      .filter(Boolean) as HTMLElement[];

    tasks.forEach((task, index) => {
      task.style.transition = `transform ${duration}ms ease-out`;
      task.style.transform = `translateY(${index * 60}px)`;
    });
    await this.sleep(duration);
    tasks.forEach((task) => {
      task.style.transform = "";
      task.style.transition = "";
      taskList.appendChild(task);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async createConfetti(element: HTMLElement): Promise<void> {
    const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
    const confettiCount = 50;
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div");
      confetti.className = "confetti-piece";
      confetti.style.position = "fixed";
      confetti.style.left = `${centerX}px`;
      confetti.style.top = `${centerY}px`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      document.body.appendChild(confetti);

      const angle = (Math.random() * 360) * (Math.PI / 180);
      const distance = Math.random() * 200 + 100;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      confetti.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 360}deg)`;
      confetti.style.opacity = "0";
      setTimeout(() => confetti.remove(), 1000);
      await this.sleep(20);
    }
  }
}

export const uiUpdateExecutor = UIUpdateExecutor.getInstance();
