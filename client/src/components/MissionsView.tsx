import React, { useEffect, useState } from "react";
import { Search, Plus, Trash2, Calendar, Edit3, CheckCircle, ChevronDown, Repeat, Clock } from "lucide-react";
import { Task, TaskPriority } from "../types";
import {
  DndContext,
  DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MissionsViewProps {
  tasks: Task[];
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenCreateModal: () => void;
  onRescheduleTaskSubmit: (taskId: string, date: string) => void;
  selectedTaskId?: string | null;
  onFocusTask?: (id: string, title: string) => void;
}

const SortableTask = ({ task, children }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: task.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

type FilterTab = "all" | "pending" | "completed" | "rescheduled" | "recurring";

export const MissionsView: React.FC<MissionsViewProps> = ({
  tasks,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onOpenCreateModal,
  onRescheduleTaskSubmit,
  selectedTaskId,
  onFocusTask
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [rescheduleInputMap, setRescheduleInputMap] = useState<Record<string, string>>({});
  const [showRescheduleFormMap, setShowRescheduleFormMap] = useState<Record<string, boolean>>({});
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localTasks.findIndex((task) => task.id === active.id);
    const newIndex = localTasks.findIndex((task) => task.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    setLocalTasks((prevTasks) => arrayMove(prevTasks, oldIndex, newIndex));
  };

  // Filter tasks
  const filteredTasks = localTasks.filter((t) => {
    const titleMatch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
    if (!titleMatch) return false;

    if (activeTab === "pending") return t.status === "pending";
    if (activeTab === "completed") return t.status === "completed";
    if (activeTab === "rescheduled") return (t.rescheduledCount || 0) > 0;
    if (activeTab === "recurring") return t.recurType && t.recurType !== "none";

    return true; 
  });

  const toggleRescheduleForm = (taskId: string, defaultDate: string) => {
    setShowRescheduleFormMap((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
    if (!rescheduleInputMap[taskId]) {
      setRescheduleInputMap((prev) => ({ ...prev, [taskId]: defaultDate }));
    }
  };

  const handleRescheduleSubmitLocal = (taskId: string) => {
    const targetDate = rescheduleInputMap[taskId];
    if (targetDate) {
      onRescheduleTaskSubmit(taskId, targetDate);
      setShowRescheduleFormMap((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  // FULL HELPER FUNCTION WITH ALL BUTTONS
  const renderTaskCard = (task: Task, isMission: boolean) => {
    const isCompleted = task.status === "completed";
    const isCritical = task.category === "urgent-important";
    const isImportant = task.category === "important-not-urgent";
    const isUrgentMinor = task.category === "urgent-not-important";

    let priorityLabel = "Low (Not Urgent)";
    let priorityBadgeColor = "bg-emerald-50 text-emerald-700 border-emerald-150";

    if (isCritical) {
      priorityLabel = "Urgent + Important";
      priorityBadgeColor = "bg-rose-50 text-rose-700 border-rose-150";
    } else if (isImportant) {
      priorityLabel = "Important (Not Urgent)";
      priorityBadgeColor = "bg-amber-50 text-amber-700 border-amber-150";
    } else if (isUrgentMinor) {
      priorityLabel = "Urgent (Not Important)";
      priorityBadgeColor = "bg-purple-50 text-purple-700 border-purple-150";
    }

    const isSelected = selectedTaskId === task.id;

    return (
      <SortableTask task={task} key={task.id}>
        <div
          onClick={() => onFocusTask?.(task.id, task.title)}
          className={`bg-white rounded-2xl border transition-all p-5 shadow-xs cursor-pointer ${
            isSelected
              ? "border-l-4 border-l-amber-500 border-slate-200/50 bg-amber-500/[0.015] shadow-[0_4px_16px_rgba(245,166,35,0.06)]"
              : "border-slate-100 hover:shadow-md"
          } ${isCompleted ? "opacity-75 bg-slate-50/20" : ""}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0">
              {/* Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTask(task.id);
                }}
                className="mt-1 shrink-0 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {isCompleted ? (
                  <CheckCircle className="w-5.5 h-5.5 text-emerald-500 fill-emerald-50" />
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full border-2 border-slate-300 hover:border-amber-500 hover:scale-105 transition-all" />
                )}
              </button>

              <div className="min-w-0">
                <h4
                  className={`font-display font-bold text-sm text-slate-800 leading-snug flex items-center gap-2 flex-wrap ${
                    isCompleted ? "line-through text-slate-400" : ""
                  }`}
                >
                  {task.title}
                  {isSelected && (
                    <span className="font-mono text-[8px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded-xs border border-amber-200 uppercase tracking-widest animate-pulse">
                      &bull; FOCUSED
                    </span>
                  )}
                </h4>
                
                {/* Meta information indicators */}
                <div className="flex flex-wrap items-center gap-3 mt-2.5 font-mono text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {task.time}
                  </span>

                  <span className="text-slate-400 font-sans">|</span>

                  <span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${priorityBadgeColor}`}>
                    {priorityLabel}
                  </span>

                  {task.recurType !== "none" && (
                    <>
                      <span className="text-slate-400 font-sans">|</span>
                      <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                        <Repeat className="w-3 h-3" />
                        {task.recurType}
                      </span>
                    </>
                  )}

                  {task.rescheduledCount > 0 && (
                    <>
                      <span className="text-slate-400 font-sans">|</span>
                      <span className="bg-amber-50 border border-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider">
                        deferred x{task.rescheduledCount}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions buttons container */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Edit Goal Title"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRescheduleForm(task.id, task.date);
                }}
                className="p-1.5 hover:bg-amber-50 text-amber-600 hover:text-amber-800 rounded-lg transition-colors text-xs font-mono font-bold cursor-pointer"
                title="Force Reschedule deferral"
              >
                Defer
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTask(task.id);
                }}
                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="Decommission Mission"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inline Deferral Form Modal-like widget */}
          {showRescheduleFormMap[task.id] && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 max-w-sm flex items-end gap-3 animated-in fade-in duration-200">
              <div className="flex-1">
                <label className="block text-[9px] font-mono font-bold text-slate-400 uppercase mb-1">
                  Select new date
                </label>
                <input
                  type="date"
                  value={rescheduleInputMap[task.id] || task.date}
                  onChange={(e) =>
                    setRescheduleInputMap((prev) => ({
                      ...prev,
                      [task.id]: e.target.value
                    }))
                  }
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRescheduleSubmitLocal(task.id);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </SortableTask>
    );
  };

  return (
    <div className="relative pb-24 space-y-6">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl text-slate-900 tracking-tight">Tactical Operations</h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">Define, review, and execute strategic objectives.</p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-semibold text-slate-400 bg-slate-100 rounded-lg px-2.5 py-1">
            2026-06-21 SUNDAY
          </span>
        </div>
      </div>

      {/* Pill Search Input */}
      <div className="relative font-sans">
        <input
          type="text"
          placeholder="Filter tactical data modules by keyword..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-700 text-sm shadow-xs transition-shadow"
        />
        <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
      </div>

      {/* Filter Chips row */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none font-display">
        {(["all", "pending", "completed", "rescheduled", "recurring"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              activeTab === tab
                ? "bg-amber-500 border-amber-500 text-white shadow-xs"
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab === "rescheduled" ? "Rescheduled" : tab}
          </button>
        ))}
      </div>

      {/* Tasks Cards Grid/Stack */}
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext
          items={filteredTasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-8">
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
                No concurrent mission metrics found under candidate variables.
              </div>
            ) : (
              <>
                {/* Mission Critical Section */}
                {filteredTasks.filter((t) => t.category === "urgent-important").length > 0 && (
                  <div>
                    <h3 className="font-mono text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-4 px-2">
                      // Mission Critical
                    </h3>
                    <div className="space-y-4">
                      {filteredTasks
                        .filter((t) => t.category === "urgent-important")
                        .map((task) => renderTaskCard(task, true))}
                    </div>
                  </div>
                )}

                {/* Routine Operations Section */}
                <div>
                  <h3 className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
                    // Routine Operations
                  </h3>
                  <div className="space-y-4">
                    {filteredTasks.filter((t) => t.category !== "urgent-important").length > 0 ? (
                      filteredTasks
                        .filter((t) => t.category !== "urgent-important")
                        .map((task) => renderTaskCard(task, false))
                    ) : (
                      <p className="text-[10px] text-slate-300 italic px-2">
                        Operational baseline stable.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* Floating Action Button */}
      <button
        onClick={onOpenCreateModal}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center p-0 cursor-pointer shadow-lg hover:shadow-xl active:scale-[0.98] transition-all z-29"
        title="Formulate New Task Module"
      >
        <Plus className="w-6 h-6 stroke-3" />
      </button>
    </div>
  );
};