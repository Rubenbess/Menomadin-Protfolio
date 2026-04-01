'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import TaskForm from '@/components/forms/TaskForm'
import { deleteTask } from '@/actions/tasks'

interface Company {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string
  color: string
  role: string | null
}

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  company_id: string | null
  assignee_id: string | null
  team_members: TeamMember | null
  companies: Company | null
  task_participants?: Array<{ team_member_id: string; team_members: TeamMember | null }>
}

interface TasksClientProps {
  tasks: Task[]
  companies: Company[]
  teamMembers: TeamMember[]
}

const STATUSES = ['not-started', 'in-progress', 'waiting', 'done']
const STATUS_LABELS = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  waiting: 'Waiting',
  done: 'Done',
}

export default function TasksClient({ tasks, companies, teamMembers }: TasksClientProps) {
  const router = useRouter()
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  function openAddTask() {
    setEditingTask(null)
    setTaskModalOpen(true)
  }

  function closeTaskModal() {
    setTaskModalOpen(false)
    setEditingTask(null)
  }

  async function handleDeleteTask(id: string) {
    await deleteTask(id)
    setDeleteConfirmId(null)
    router.refresh()
  }

  function handleSuccess() {
    closeTaskModal()
    router.refresh()
  }

  const tasksByStatus: Record<string, Task[]> = {
    'not-started': [],
    'in-progress': [],
    waiting: [],
    done: [],
  }

  for (const task of tasks) {
    if (tasksByStatus[task.status]) {
      tasksByStatus[task.status].push(task)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-100 bg-white">
        <div className="page-header">
          <div>
            <h1 className="page-title">Tasks</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <Button size="sm" onClick={openAddTask}>
            <Plus size={14} />
            Add Task
          </Button>
        </div>
      </div>

      {/* Board view */}
      <div className="flex-1 overflow-auto px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUSES.map(status => (
            <div key={status} className="bg-slate-50 rounded-xl p-4 min-h-[300px]">
              <h3 className="font-semibold text-slate-700 mb-3">
                {STATUS_LABELS[status as keyof typeof STATUS_LABELS]} ({tasksByStatus[status].length})
              </h3>

              <div className="space-y-2 mb-3">
                {tasksByStatus[status].map(task => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg p-3 shadow-sm border border-slate-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm text-slate-800">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                        {task.companies && (
                          <p className="text-xs text-violet-600 mt-1">{task.companies.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteConfirmId(task.id)}
                        className="text-slate-400 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={openAddTask}
                className="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg transition"
              >
                + Add task
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        open={taskModalOpen}
        onClose={closeTaskModal}
        title={editingTask ? 'Edit Task' : 'New Task'}
      >
        <TaskForm
          task={editingTask}
          companies={companies}
          teamMembers={teamMembers}
          onClose={closeTaskModal}
          onSuccess={handleSuccess}
        />
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Task"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this task?
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={() =>
                deleteConfirmId && handleDeleteTask(deleteConfirmId)
              }
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setDeleteConfirmId(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
