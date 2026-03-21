import { useEffect, useState } from "react";
import { menteeApi } from "@/lib/api";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

export default function Goals() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<any | null>(null);

  useEffect(() => {
    menteeApi.getGoals()
      .then(setGoals)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleTaskToggle = async (goalId: number, taskId: number, currentCompleted: boolean) => {
    try {
      const updated = await menteeApi.updateTask(goalId, taskId, !currentCompleted) as any;
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updated, tasks: g.tasks.map((t: any) => t.id === taskId ? { ...t, completed: !currentCompleted } : t) } : g));
      // Sync selectedGoal
      setSelectedGoal((prev: any) => {
        if (!prev || prev.id !== goalId) return prev;
        const updatedTasks = prev.tasks.map((t: any) => t.id === taskId ? { ...t, completed: !currentCompleted } : t);
        const progress = Math.round((updatedTasks.filter((t: any) => t.completed).length / updatedTasks.length) * 100);
        if (progress === 100) {
          toast({ title: "Goal Completed! 🎉", description: `"${prev.title}" is now complete.` });
          setTimeout(() => setSelectedGoal(null), 800);
        }
        return { ...prev, tasks: updatedTasks, progress, completed: progress === 100 };
      });
    } catch {
      toast({ title: "Error", description: "Failed to update task", variant: "destructive" });
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold font-display">Semester Goals</h1>
        <p className="text-muted-foreground">Goals set by your mentor</p>
      </div>

      <div className="grid gap-4">
        {goals.length === 0 && <p className="text-sm text-muted-foreground">No goals assigned yet.</p>}
        {goals.map(goal => (
          <div key={goal.id} onClick={() => setSelectedGoal(goal)}
            className="rounded-xl border bg-card p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.01] cursor-pointer">
            <div className="flex items-start gap-3">
              {goal.completed
                ? <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                : <Circle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />}
              <div className="flex-1">
                <h3 className={`font-medium ${goal.completed ? "line-through text-muted-foreground" : ""}`}>{goal.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Progress</span>
                    <span className="text-xs font-medium">{goal.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${goal.completed ? "bg-success" : "gradient-primary"}`}
                      style={{ width: `${goal.progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!selectedGoal} onOpenChange={open => !open && setSelectedGoal(null)}>
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
                    <span className="font-medium">{selectedGoal.deadline ? new Date(selectedGoal.deadline).toLocaleDateString() : "N/A"}</span>
                  </div>
                </div>
                {selectedGoal.mentor_note && (
                  <div className="p-3 rounded-lg bg-accent/50">
                    <span className="text-xs text-muted-foreground block mb-1">Mentor Note</span>
                    <p className="text-sm">{selectedGoal.mentor_note}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Task Checklist</h4>
                  <div className="space-y-2">
                    {selectedGoal.tasks?.filter(Boolean).map((task: any) => (
                      <label key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={() => handleTaskToggle(selectedGoal.id, task.id, task.completed)}
                        />
                        <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-500 ${selectedGoal.completed ? "bg-success" : "gradient-primary"}`}
                    style={{ width: `${selectedGoal.progress}%` }} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
