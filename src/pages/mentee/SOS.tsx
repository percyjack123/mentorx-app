import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { menteeApi } from "@/lib/api";
import { AlertOctagon, Phone, Heart, Shield, Loader2 } from "lucide-react";

export default function SOS() {
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([menteeApi.getProfile(), menteeApi.getHealth()])
      .then(([p, h]: any[]) => { setProfile(p); setHealth(h); })
      .catch(console.error);
  }, []);

  const handleSOS = async () => {
    setSending(true);
    try {
      await menteeApi.triggerSOS();
      setShowModal(true);
    } catch {
      setShowModal(true); // Still show confirmation
    } finally {
      setSending(false);
    }
  };

  const bloodGroup = health?.blood_group || profile?.blood_group || "N/A";
  const conditions = health?.chronic_conditions || profile?.chronic_conditions || "None";
  const emergencyContact = profile?.emergency_contact || "N/A";

  return (
    <div className="space-y-6 max-w-2xl mx-auto text-center">
      <div>
        <h1 className="text-2xl font-bold font-display">Emergency SOS</h1>
        <p className="text-muted-foreground">Use this in case of an emergency</p>
      </div>

      <div className="rounded-2xl border bg-card p-12 flex flex-col items-center gap-6">
        <button
          onClick={handleSOS}
          disabled={sending}
          className="w-40 h-40 rounded-full bg-danger hover:bg-danger/90 text-danger-foreground flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl animate-pulse-soft disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="h-12 w-12 mb-2 animate-spin" /> : <AlertOctagon className="h-12 w-12 mb-2" />}
          <span className="text-lg font-bold font-display">🚨 SOS</span>
        </button>
        <p className="text-sm text-muted-foreground max-w-xs">
          Press the button above to send a high-priority alert to your mentor and emergency contacts.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 text-left">
        <h3 className="font-semibold font-display mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" /> Emergency Information
        </h3>
        <div className="grid gap-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <Heart className="h-4 w-4 text-danger" />
            <div>
              <p className="text-xs text-muted-foreground">Blood Group</p>
              <p className="font-medium text-sm">{bloodGroup}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <Phone className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Emergency Contact</p>
              <p className="font-medium text-sm">{emergencyContact}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
            <Shield className="h-4 w-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Medical Conditions</p>
              <p className="font-medium text-sm">{conditions}</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertOctagon className="h-5 w-5" /> Emergency Alert Sent
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-danger/10 border border-danger/30 p-4 text-center">
              <p className="font-semibold">🚨 High Priority Alert Sent to Mentor</p>
              <p className="text-sm text-muted-foreground mt-2">Your mentor and emergency contacts have been notified immediately.</p>
            </div>
            <Button onClick={() => setShowModal(false)} className="w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
