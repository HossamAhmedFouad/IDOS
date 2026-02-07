/**
 * Executes app-specific UI updates (animations) from tool results.
 * Queues updates and runs them sequentially; resolves targetId via document.getElementById.
 */

import type { AppSpecificUIUpdate } from "@/lib/types/uiUpdates";

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
      case "calendar_date_jump":
      case "calendar_time_block_grow":
      case "timer_start_ripple":
      case "timer_countdown_pulse":
      case "timer_complete_celebration":
      case "file_browser_folder_expand":
      case "file_browser_file_highlight_path":
      case "file_browser_create_file":
      case "file_browser_move_animation":
      case "code_editor_type_code":
      case "code_editor_line_highlight":
      case "code_editor_error_shake":
      case "code_editor_run_output":
      case "whiteboard_draw_shape":
      case "whiteboard_write_text":
      case "whiteboard_clear_animation":
      case "email_type_content":
      case "email_send_animation":
      case "email_attachment_add":
        this.stub(update);
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
    const speed = update.speed ?? 50;
    const delay = 1000 / speed;
    const content = update.content;
    const contentEl = (element.querySelector("[data-note-content]") || element) as HTMLElement;
    const editable =
      contentEl instanceof HTMLInputElement || contentEl instanceof HTMLTextAreaElement
        ? contentEl
        : (contentEl.querySelector("textarea, input") as HTMLTextAreaElement | HTMLInputElement | null) ?? contentEl;

    if (update.cursor) {
      editable.classList.add("typing-cursor");
    }

    let currentText = "";
    for (let i = 0; i < content.length; i++) {
      currentText += content[i];
      if (editable instanceof HTMLInputElement || editable instanceof HTMLTextAreaElement) {
        editable.value = currentText;
      } else {
        editable.textContent = currentText;
      }
      editable.scrollTop = editable.scrollHeight;
      await this.sleep(delay);
    }

    if (update.cursor) {
      editable.classList.remove("typing-cursor");
    }
  }

  private async notesAppendScroll(
    element: HTMLElement,
    update: Extract<AppSpecificUIUpdate, { type: "notes_append_scroll" }>
  ): Promise<void> {
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
