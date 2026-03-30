import { useEffect, useState } from "react";
import { adminApi, type Mentor } from "@/lib/api";
import { Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Mentors() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const navigate = useNavigate();

  const loadMentors = () => {
    setLoading(true);
    adminApi
      .getMentors()
      .then(setMentors)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMentors();
  }, []);

  const onCreateMentor = async () => {
    if (!newName || !newEmail || !newPassword) return;
    setCreateLoading(true);
    try {
      await adminApi.createMentor({
        name: newName,
        email: newEmail,
        password: newPassword,
        department: newDepartment || null,
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewDepartment('');
      loadMentors();
    } catch (err) {
      console.error(err);
    } finally {
      setCreateLoading(false);
    }
  };

  const onApprove = async (id: number) => {
    setActionLoading(id);
    try {
      await adminApi.approveMentor(id);
      loadMentors();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const onReject = async (id: number) => {
    setActionLoading(id);
    try {
      await adminApi.rejectMentor(id);
      loadMentors();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin h-4 w-4" /> Loading...
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Mentors</h1>
        <p className="text-muted-foreground">Manage institution mentors</p>
      </div>
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="text-lg font-semibold">Create Mentor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Name"
          />
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Email"
            type="email"
          />
          <input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Password"
            type="password"
          />
          <input
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            className="input input-bordered w-full"
            placeholder="Department"
          />
        </div>
        <button
          onClick={onCreateMentor}
          className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
          disabled={createLoading || !newName || !newEmail || !newPassword}
        >
          {createLoading ? 'Creating...' : 'Create Mentor'}
        </button>
      </div>
      <div className="grid gap-4">
        {mentors.map((m) => (
          <div
            key={m.id}
            onClick={() => navigate(`/admin/mentor/${m.id}`)}
            className="rounded-xl border bg-card p-6 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">{m.name}</h3>
                  <p className="text-sm text-muted-foreground">{m.department}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                  <p className="text-xs font-medium mt-1">
                    Status: <span className={
                      m.status === 'Active'
                        ? 'text-success'
                        : m.status === 'Pending'
                        ? 'text-primary'
                        : 'text-destructive'
                    }>
                      {m.status ?? 'Active'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-display">
                  {m.student_ids?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">mentees</p>
              </div>
            </div>
            {m.status === 'Pending' && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onApprove(m.id); }}
                  disabled={actionLoading === m.id}
                  className="rounded-md bg-success px-3 py-1 text-xs font-semibold text-success-foreground hover:bg-success/90"
                >
                  {actionLoading === m.id ? '...' : 'Approve'}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onReject(m.id); }}
                  disabled={actionLoading === m.id}
                  className="rounded-md bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  {actionLoading === m.id ? '...' : 'Reject'}
                </button>
              </div>
            )}
          </div>
        ))}
        {mentors.length === 0 && (
          <p className="text-sm text-muted-foreground">No mentors found.</p>
        )}
      </div>
    </div>
  );
}