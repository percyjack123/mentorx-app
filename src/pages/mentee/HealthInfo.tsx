import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { menteeApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Heart, Loader2 } from "lucide-react";

export default function HealthInfo() {
  const [bloodGroup, setBloodGroup] = useState("");
  const [conditions, setConditions] = useState("None");
  const [insurance, setInsurance] = useState("");
  const [hostelStatus, setHostelStatus] = useState("Day Scholar");
  const [emergencyParent, setEmergencyParent] = useState("");
  const [emergencyFriend, setEmergencyFriend] = useState("");
  const [emergencyRoommate, setEmergencyRoommate] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([menteeApi.getHealth(), menteeApi.getProfile()])
      .then(([health, profile]: any[]) => {
        if (health) {
          setBloodGroup(health.blood_group || "");
          setConditions(health.chronic_conditions || "None");
          setInsurance(health.insurance_info || "");
          const contacts = health.emergency_contacts || [];
          contacts.forEach((c: any) => {
            if (c.label === "Parent") setEmergencyParent(c.value);
            if (c.label === "Friend") setEmergencyFriend(c.value);
            if (c.label === "Roommate") setEmergencyRoommate(c.value);
          });
        }
        if (profile) setHostelStatus(profile.hostel_status || "Day Scholar");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const emergencyContacts: any[] = [
      { label: "Parent", value: emergencyParent },
      { label: "Friend", value: emergencyFriend },
    ];
    if (hostelStatus === "Hosteller") emergencyContacts.push({ label: "Roommate", value: emergencyRoommate });

    try {
      await menteeApi.updateHealth({ bloodGroup, chronicConditions: conditions, insuranceInfo: insurance, emergencyContacts });
      toast({ title: "Health info updated", description: "Your health information has been saved." });
    } catch {
      toast({ title: "Error", description: "Failed to update health info", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="animate-spin h-4 w-4" /> Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Heart className="h-6 w-6 text-danger" /> Health Information
        </h1>
        <p className="text-muted-foreground">Keep your health details updated</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Blood Group</Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger>
              <SelectContent>
                {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(bg => (
                  <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditions">Chronic Conditions</Label>
            <Input id="conditions" value={conditions} onChange={e => setConditions(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="insurance">Insurance Info</Label>
          <Input id="insurance" value={insurance} onChange={e => setInsurance(e.target.value)} />
        </div>

        <div className="rounded-lg bg-accent/50 p-4">
          <h3 className="font-medium text-sm mb-3">Emergency Contacts</h3>
          {hostelStatus === "Hosteller" && (
            <div className="space-y-2 mb-3">
              <Label htmlFor="roommate">Roommate</Label>
              <Input id="roommate" placeholder="Roommate name & phone" value={emergencyRoommate} onChange={e => setEmergencyRoommate(e.target.value)} />
            </div>
          )}
          <div className="space-y-2 mb-3">
            <Label htmlFor="parent">Parent</Label>
            <Input id="parent" placeholder="Parent name & phone" value={emergencyParent} onChange={e => setEmergencyParent(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="friend">Friend</Label>
            <Input id="friend" placeholder="Friend name & phone" value={emergencyFriend} onChange={e => setEmergencyFriend(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Status: {hostelStatus}</p>
        </div>

        <Button type="submit" className="gradient-primary text-primary-foreground" disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Health Info"}
        </Button>
      </form>
    </div>
  );
}
