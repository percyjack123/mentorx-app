import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { students } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Heart } from "lucide-react";

const student = students[0];

export default function HealthInfo() {
  const [bloodGroup, setBloodGroup] = useState(student.bloodGroup);
  const [conditions, setConditions] = useState(student.chronicConditions);
  const [insurance, setInsurance] = useState(student.insuranceInfo);
  const [hostelStatus] = useState(student.hostelStatus);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Health info updated", description: "Your health information has been saved." });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold font-display flex items-center gap-2"><Heart className="h-6 w-6 text-danger" /> Health Information</h1>
        <p className="text-muted-foreground">Keep your health details updated</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Blood Group</Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map(bg => (
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
          {hostelStatus === "Hosteller" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="roommate">Roommate</Label>
                <Input id="roommate" placeholder="Roommate name & phone" defaultValue="Arjun Kumar - 9876543211" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Parent</Label>
                <Input id="parent" placeholder="Parent name & phone" defaultValue={student.emergencyContact} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friend">Friend</Label>
                <Input id="friend" placeholder="Friend name & phone" defaultValue="Vikram Singh - 9876543212" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="parent">Parent</Label>
                <Input id="parent" placeholder="Parent name & phone" defaultValue={student.emergencyContact} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="friend">Friend</Label>
                <Input id="friend" placeholder="Friend name & phone" defaultValue="Vikram Singh - 9876543212" />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">Status: {hostelStatus}</p>
        </div>

        <Button type="submit" className="gradient-primary text-primary-foreground">Save Health Info</Button>
      </form>
    </div>
  );
}
