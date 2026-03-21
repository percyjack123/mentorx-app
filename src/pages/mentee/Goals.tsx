import { useState } from "react";
import { menteeGoals } from "@/data/mockData";
import type { Goal, GoalTask } from "@/data/mockData";
import { CheckCircle, Circle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(menteeGoals);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const handleTaskToggle = (goalId: number, taskId: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const updatedTasks = g.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      const completed = progress === 100;
      if (completed && !g.completed) {
        toast({ title: "Goal Completed! 🎉", description: `"${g.title}" is now complete.` });
        setTimeout(() => setSelectedGoal(null), 800);
      }
      return { ...g, tasks: updatedTasks, progress, completed };
    }));
    // Sync selectedGoal
    setSelectedGoal(prev => {
      if (!prev || prev.id !== goalId) return prev;
      const updatedTasks = prev.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t);
      const completedCount = updatedTasks.filter(t => t.completed).length;
      const progress = Math.round((completedCount / updatedTasks.length) * 100);
      return { ...prev, tasks: updatedTasks, progress, completed: progress === 100 };
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Semester Goals</h1>
        <p className="text-muted-foreground">Goals set by your mentor</p>
      </div>

      <div className="grid gap-4">
        {goals.map(goal => (
          <div
            key={goal.id}
            onClick={() => setSelectedGoal(goal)}
            className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer"
          >
            <div className="flex items-start gap-3">
              {goal.completed ? (
                <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium ${goal.completed ? "line-through text-muted-foreground" : ""}`}>{goal.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${goal.completed ? "bg-success" : "gradient-primary"}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedGoal} onOpenChange={(open) => !open && setSelectedGoal(null)}>
        <DialogContent className="max-w-md">
          {selectedGoal && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selectedGoal.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedGoal.description}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground block">Progress</span>
                    <span className="font-medium">{selectedGoal.progress}%</span>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <span className="text-xs text-muted-foreground block">Deadline</span>
                    <span className="font-medium">{selectedGoal.deadline}</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-accent/50">
                  <span className="text-xs text-muted-foreground block mb-1">Mentor Note</span>
                  <p className="text-sm">{selectedGoal.mentorNote}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Task Checklist</h4>
                  <div className="space-y-2">
                    {selectedGoal.tasks.map(task => (
                      <label key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleTaskToggle(selectedGoal.id, task.id)}
                        />
                        <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${selectedGoal.completed ? "bg-success" : "gradient-primary"}`}
                    style={{ width: `${selectedGoal.progress}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
