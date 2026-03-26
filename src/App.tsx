import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowDownToLine, Split, GripVertical, Calendar as CalendarIcon } from 'lucide-react';

type Priority = 'baja' | 'media' | 'alta';

interface Task {
  id: string;
  title: string;
  priority: Priority;
}

interface Block {
  id: string;
  day: string;
  startHour: number;
  endHour: number;
  taskIds: string[];
}

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const START_HOUR = 8;
const END_HOUR = 20;

const priorityColors = {
  alta: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
  media: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
  baja: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
};

const generateInitialBlocks = (): Block[] => {
  const blocks: Block[] = [];
  DAYS.forEach(day => {
    for (let h = START_HOUR; h < END_HOUR; h++) {
      blocks.push({
        id: `${day}-${h}`,
        day,
        startHour: h,
        endHour: h + 1,
        taskIds: [],
      });
    }
  });
  return blocks;
};

const initialTasks: Task[] = [
  { id: 't1', title: 'Revisar correos', priority: 'media' },
  { id: 't2', title: 'Reunión de proyecto', priority: 'alta' },
  { id: 't3', title: 'Organizar escritorio', priority: 'baja' },
];

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [blocks, setBlocks] = useState<Block[]>(generateInitialBlocks());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('media');

  // Derived state
  const assignedTaskIds = new Set(blocks.flatMap(b => b.taskIds));
  const unassignedTasks = tasks.filter(t => !assignedTaskIds.has(t.id));

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      priority: newTaskPriority,
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setBlocks(prev =>
      prev.map(b => ({
        ...b,
        taskIds: b.taskIds.filter(id => id !== taskId),
      }))
    );
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string, sourceBlockId?: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId, sourceBlockId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnBlock = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { taskId, sourceBlockId } = data;

      if (sourceBlockId === targetBlockId) return;

      setBlocks(prev =>
        prev.map(b => {
          // Remove from source
          if (b.id === sourceBlockId) {
            return { ...b, taskIds: b.taskIds.filter(id => id !== taskId) };
          }
          // Add to target
          if (b.id === targetBlockId) {
            if (!b.taskIds.includes(taskId)) {
              return { ...b, taskIds: [...b.taskIds, taskId] };
            }
          }
          return b;
        })
      );
    } catch (err) {
      console.error('Error dropping task:', err);
    }
  };

  const handleDropOnSidebar = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const { taskId, sourceBlockId } = data;

      if (sourceBlockId) {
        // Remove from the block it was in, making it unassigned
        setBlocks(prev =>
          prev.map(b => {
            if (b.id === sourceBlockId) {
              return { ...b, taskIds: b.taskIds.filter(id => id !== taskId) };
            }
            return b;
          })
        );
      }
    } catch (err) {
      console.error('Error dropping task to sidebar:', err);
    }
  };

  // Block Merging and Splitting
  const mergeDown = (blockId: string) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === blockId);
      if (!block) return prev;

      const blockBelow = prev.find(b => b.day === block.day && b.startHour === block.endHour);
      if (!blockBelow) return prev;

      return prev
        .map(b => {
          if (b.id === blockId) {
            return {
              ...b,
              endHour: blockBelow.endHour,
              taskIds: [...b.taskIds, ...blockBelow.taskIds],
            };
          }
          return b;
        })
        .filter(b => b.id !== blockBelow.id);
    });
  };

  const splitBlock = (blockId: string) => {
    setBlocks(prev => {
      const block = prev.find(b => b.id === blockId);
      if (!block || block.endHour - block.startHour <= 1) return prev;

      const newBlock: Block = {
        id: `${block.day}-${block.endHour - 1}-${Date.now()}`,
        day: block.day,
        startHour: block.endHour - 1,
        endHour: block.endHour,
        taskIds: [], // Tasks stay in the top block
      };

      return prev
        .map(b => {
          if (b.id === blockId) {
            return { ...b, endHour: block.endHour - 1 };
          }
          return b;
        })
        .concat(newBlock);
    });
  };

  // Components
  const TaskCard = ({ task, sourceBlockId }: { task: Task; sourceBlockId?: string }) => (
    <div
      draggable
      onDragStart={e => handleDragStart(e, task.id, sourceBlockId)}
      className={`p-2 rounded-md shadow-sm border text-sm flex gap-2 items-start cursor-grab active:cursor-grabbing transition-colors ${
        priorityColors[task.priority]
      }`}
    >
      <GripVertical size={14} className="mt-0.5 opacity-50 shrink-0" />
      <span className="flex-1 font-medium leading-tight">{task.title}</span>
      <button
        onClick={() => deleteTask(task.id)}
        className="text-current opacity-40 hover:opacity-100 transition-opacity shrink-0"
        title="Eliminar tarea"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  return (
    <div className="h-screen w-full flex bg-slate-50 font-sans text-slate-800 overflow-hidden">
      {/* Sidebar */}
      <div
        className="w-80 bg-white border-r border-slate-200 shadow-sm flex flex-col z-10"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDropOnSidebar}
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <CalendarIcon size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-800">TimeBlocker</h1>
          </div>

          <form onSubmit={handleAddTask} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nueva tarea..."
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <div className="flex gap-2">
              {(['baja', 'media', 'alta'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewTaskPriority(p)}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold border capitalize transition-colors ${
                    newTaskPriority === p
                      ? priorityColors[p].replace('hover:', '').replace('bg-', 'bg-opacity-100 bg-')
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="submit"
              disabled={!newTaskTitle.trim()}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Añadir Tarea
            </button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Tareas Pendientes ({unassignedTasks.length})
          </h2>
          {unassignedTasks.length === 0 ? (
            <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              No hay tareas pendientes. ¡Añade una arriba!
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {unassignedTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div
            className="min-w-[900px] bg-slate-200 grid gap-[1px] border border-slate-200 rounded-xl overflow-hidden shadow-sm"
            style={{
              gridTemplateColumns: `80px repeat(7, 1fr)`,
              gridTemplateRows: `50px repeat(12, minmax(100px, auto))`,
            }}
          >
            {/* Top-left empty corner */}
            <div className="bg-white"></div>

            {/* Day Headers */}
            {DAYS.map((day, i) => (
              <div
                key={day}
                className="bg-white flex items-center justify-center font-bold text-slate-600"
                style={{ gridColumn: i + 2, gridRow: 1 }}
              >
                {day}
              </div>
            ))}

            {/* Time Labels */}
            {Array.from({ length: 12 }).map((_, i) => {
              const hour = START_HOUR + i;
              return (
                <div
                  key={hour}
                  className="bg-white flex items-start justify-end p-3 text-sm text-slate-400 font-medium"
                  style={{ gridColumn: 1, gridRow: i + 2 }}
                >
                  {hour}:00
                </div>
              );
            })}

            {/* Blocks */}
            {blocks.map(block => {
              const blockTasks = block.taskIds
                .map(id => tasks.find(t => t.id === id))
                .filter((t): t is Task => t !== undefined);
              const canMerge = blocks.some(b => b.day === block.day && b.startHour === block.endHour);
              const canSplit = block.endHour - block.startHour > 1;

              return (
                <div
                  key={block.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropOnBlock(e, block.id)}
                  className="bg-white p-2 relative group hover:bg-slate-50 transition-colors flex flex-col gap-2"
                  style={{
                    gridColumn: DAYS.indexOf(block.day) + 2,
                    gridRow: `${block.startHour - START_HOUR + 2} / span ${block.endHour - block.startHour}`,
                  }}
                >
                  {/* Time indicator for merged blocks */}
                  {block.endHour - block.startHour > 1 && (
                    <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded absolute top-2 right-2">
                      {block.startHour}:00 - {block.endHour}:00
                    </span>
                  )}

                  {/* Tasks inside block */}
                  <div className={`flex-1 flex flex-col gap-1.5 ${block.endHour - block.startHour > 1 ? 'mt-6' : 'mt-1'}`}>
                    {blockTasks.map(task => (
                      <TaskCard key={task.id} task={task} sourceBlockId={block.id} />
                    ))}
                  </div>

                  {/* Block Actions (Merge / Split) */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 flex gap-1.5 transition-opacity">
                    {canSplit && (
                      <button
                        onClick={() => splitBlock(block.id)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        title="Dividir bloque"
                      >
                        <Split size={14} />
                      </button>
                    )}
                    {canMerge && (
                      <button
                        onClick={() => mergeDown(block.id)}
                        className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        title="Fusionar con el bloque de abajo"
                      >
                        <ArrowDownToLine size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
