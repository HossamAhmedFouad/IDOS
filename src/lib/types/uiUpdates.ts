/**
 * App-specific UI update types for the enhanced tool execution UI system.
 * Used by tools to describe contextual animations (typewriter, pop-in, etc.).
 */

export type BaseUIUpdate = {
  targetId: string;
  delay?: number;
  duration?: number;
};

// Notes App Updates
export type NotesUIUpdate =
  | {
      type: "notes_typewriter";
      targetId: string;
      content: string;
      speed?: number;
      cursor?: boolean;
    }
  | {
      type: "notes_append_scroll";
      targetId: string;
      content: string;
      highlight?: boolean;
    }
  | {
      type: "notes_file_create_animation";
      targetId: string;
      filename: string;
      position?: { x: number; y: number };
    }
  | {
      type: "notes_search_highlight";
      targetId: string;
      matches: Array<{ line: number; text: string }>;
      scrollToFirst?: boolean;
    };

// Todo App Updates
export type TodoUIUpdate =
  | {
      type: "todo_task_pop_in";
      targetId: string;
      taskData: {
        title: string;
        priority: "low" | "medium" | "high";
        position: number;
      };
    }
  | {
      type: "todo_check_animation";
      targetId: string;
      taskId: string;
      strikethrough?: boolean;
      confetti?: boolean;
    }
  | {
      type: "todo_priority_pulse";
      targetId: string;
      priority: "low" | "medium" | "high";
    }
  | {
      type: "todo_reorder_animation";
      targetId: string;
      taskIds: string[];
      duration?: number;
    };

// Calendar App Updates
export type CalendarUIUpdate =
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
export type TimerUIUpdate =
  | {
      type: "timer_start_ripple";
      targetId: string;
      duration: number;
    }
  | {
      type: "timer_countdown_pulse";
      targetId: string;
      remainingSeconds: number;
      urgent?: boolean;
    }
  | {
      type: "timer_complete_celebration";
      targetId: string;
      sound?: boolean;
      message?: string;
    };

// File Browser Updates
export type FileBrowserUIUpdate =
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
      breadcrumb?: boolean;
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
export type CodeEditorUIUpdate =
  | {
      type: "code_editor_type_code";
      targetId: string;
      code: string;
      startLine: number;
      speed?: number;
      syntaxHighlight?: boolean;
      /** File path this content is for; when set, code editor will open this file and apply content (fixes 2nd/3rd file blank). */
      path?: string;
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
export type WhiteboardUIUpdate =
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
      handwriting?: boolean;
    }
  | {
      type: "whiteboard_clear_animation";
      targetId: string;
      wipeDuration?: number;
    };

// Email Composer Updates
export type EmailUIUpdate =
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

export type AppSpecificUIUpdate =
  | NotesUIUpdate
  | TodoUIUpdate
  | CalendarUIUpdate
  | TimerUIUpdate
  | FileBrowserUIUpdate
  | CodeEditorUIUpdate
  | WhiteboardUIUpdate
  | EmailUIUpdate;
