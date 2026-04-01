'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { Plus, GripVertical, Trash2, Pencil } from 'lucide-react'
import TaskPriorityBadge from '@/components/ui/TaskPriorityBadge'
import TaskAssigneesStack from '@/components/ui/TaskAssigneesStack'
import { updateTask, deleteTask } from '@/actions/tasks'
import type { Task, TaskStatus, TaskWithRelations } from '@/lib/types'
import { isTaskOverdue, formatDueDate } from '@/lib/task-utils'

const STATUS_COLORS: Record<TaskStatus, { header: string; dot: string }> = {
  'To do': { header: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
  'In progress': { header: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  'Waiting': { header: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  'Done': { header: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Cancelled': { header: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
}

const STATUSES: TaskStatus[] = ['To do', 'In progress', 'Waiting', 'Done', 'Cancelled']

interface TaskCardProps {
  task: TaskWithRelations
  isDragging?: boolean
  onView: (task: TaskWithRelations) => void
  onEdit: (task: TaskWithRelations) => void
  onDelete: (id: string, title: string) => void
}

function TaskCard({ task, isDragging, onView, onEdit, onDelete }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id })
  const overdue = isTaskOverdue(task)

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onView(task)}
      className={`bg-white rounded-xl border border-slate-200 p-3 shadow-card group cursor-pointer transition-shadow ${
        isDragging ? 'opacity-40' : 'hover:shadow-card-hover hover:border-violet-200'
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...listeners}
          {...attributes}
          onClick={e => e.stopPropagation()}
          className="mt-0.5 text-slate-300 hover:text-slate-500 flex-shrink-0 cursor-grab active:cursor-grabbing transition-colors"
        >
          <GripVertical size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <TaskPriorityBadge priority={task.priority} size="sm" />
            {task.due_date && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                overdue
                  ? 'bg-red-100 text-red-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {formatDueDate(task)}
              </span>
            )}
          </div>

          {task.assignees && task.assignees.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              <TaskAssigneesStack assignees={task.assignees} />
            </div>
          )}
        </div>

        <div
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onEdit(task)}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={() => onDelete(task.id, task.title)}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface ColumnProps {
  status: TaskStatus
  tasks: TaskWithRelations[]
  activeId: string | null
  onAddTask: (status: TaskStatus) => void
  onViewTask: (task: TaskWithRelations) => void
  onEditTask: (task: TaskWithRelations) => void
  onDeleteTask: (id: string, title: string) => void
}

function Column({
  status,
  tasks,
  activeId,
  onAddTask,
  onViewTask,
  onEditTask,
  onDeleteTask,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const colors = STATUS_COLORS[status]

  return (
    <div className="flex-shrink-0 w-72 flex flex-col">
      <div className={`rounded-xl border px-3 py-2.5 mb-2 flex items-center justify-between ${colors.header}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors.dot}`} />
          <span className="text-sm font-semibold truncate">{status}</span>
          <span className="text-xs opacity-50 font-normal">{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 rounded-lg hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
          title={`Add task to ${status}`}
        >
          <Plus size={14} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-24 rounded-xl p-1.5 transition-colors ${
          isOver ? 'bg-violet-50 ring-2 ring-violet-200 ring-dashed' : ''
        }`}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            isDragging={activeId === task.id}
            onView={onViewTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}

        {tasks.length === 0 && !isOver && (
          <button
            onClick={() => onAddTask(status)}
            className="flex items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors"
          >
            <Plus size={12} /> Add task
          </button>
        )}
      </div>
    </div>
  )
}

interface Props {
  groupedTasks: Record<TaskStatus, TaskWithRelations[]>
  onTaskClick: (task: TaskWithRelations) => void
  onTaskCreate: (status: TaskStatus) => void
  onTaskEdit: (task: TaskWithRelations) => void
}

export default function TasksBoard({ groupedTasks, onTaskClick, onTaskCreate, onTaskEdit }: Props) {
  const router = useRouter()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localTasks, setLocalTasks] = useState<Record<TaskStatus, TaskWithRelations[]>>(groupedTasks)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const activeTask = activeId
    ? Object.values(localTasks).flat().find(t => t.id === activeId)
    : null

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const taskId = String(active.id)
    const newStatus = String(over.id) as TaskStatus

    // Find the task
    let task: TaskWithRelations | undefined
    for (const status of STATUSES) {
      task = localTasks[status].find(t => t.id === taskId)
      if (task) break
    }

    if (!task) return

    // Update local state
    setLocalTasks(prev => {
      const current = Object.values(prev).flat().find(t => t.id === taskId)
      if (!current) return prev

      return {
        ...prev,
        [task.status]: prev[task.status].filter(t => t.id !== taskId),
        [newStatus]: [...prev[newStatus], { ...current, status: newStatus }],
      }
    })

    // Update in database
    await updateTask(taskId, { status: newStatus })
    router.refresh()
  }

  async function handleDeleteTask(id: string, title: string) {
    if (!confirm(`Delete task "${title}"?`)) return
    setLocalTasks(prev => ({
      ...prev,
      ...Object.fromEntries(
        STATUSES.map(status => [status, prev[status].filter(t => t.id !== id)])
      ),
    }))
    await deleteTask(id)
    router.refresh()
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 px-1 -mx-1">
        {STATUSES.map(status => (
          <Column
            key={status}
            status={status}
            tasks={localTasks[status]}
            activeId={activeId}
            onAddTask={onTaskCreate}
            onViewTask={onTaskClick}
            onEditTask={onTaskEdit}
            onDeleteTask={handleDeleteTask}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="bg-white rounded-xl border border-violet-300 shadow-xl p-3 w-72 rotate-2 opacity-95">
            <p className="text-sm font-semibold text-slate-900">{activeTask.title}</p>
            {activeTask.priority && (
              <p className="text-xs text-slate-400 mt-0.5">Priority: {activeTask.priority}</p>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
