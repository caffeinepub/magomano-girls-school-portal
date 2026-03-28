import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Principal } from "@icp-sdk/core/principal";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type {
  Announcement,
  CBCGrade,
  CBCSubject,
  FeePayment,
  FeeStructure,
  ParentLinkRequest,
  RegistrationRequest,
  SchoolEvent,
  Student,
  UserProfile,
} from "./backend.d";
import { SchoolRole } from "./backend.d";
import { useActor } from "./hooks/useActor";
import { useInternetIdentity } from "./hooks/useInternetIdentity";

type Tab =
  | "dashboard"
  | "grades"
  | "fees"
  | "events"
  | "announcements"
  | "students"
  | "subjects"
  | "admin-grades"
  | "admin-fees"
  | "admin-events"
  | "admin-announcements"
  | "users"
  | "registration-requests"
  | "parent-link-requests";

function cbcLevelColor(level: string) {
  const l = level.toLowerCase();
  if (l.includes("exceeding"))
    return "bg-green-100 text-green-800 border-green-300";
  if (l.includes("meeting")) return "bg-blue-100 text-blue-800 border-blue-300";
  if (l.includes("approaching"))
    return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function formatKES(amount: bigint) {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function App() {
  const { identity, login, clear, isInitializing, isLoggingIn } =
    useInternetIdentity();
  const { actor } = useActor();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");

  // Setup form state
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupRole, setSetupRole] = useState<SchoolRole>(SchoolRole.parent);
  const [savingProfile, setSavingProfile] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!actor || !identity) return;
    setLoadingProfile(true);
    try {
      const profile = await actor.getCallerUserProfile();
      if (profile) {
        setUserProfile(profile);
        // Seed sample data once
        if (!localStorage.getItem("mghs_seeded")) {
          try {
            await actor.seedSampleData();
            localStorage.setItem("mghs_seeded", "1");
          } catch {
            // already seeded or error, ignore
          }
        }
      } else {
        setShowSetup(true);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  }, [actor, identity]);

  useEffect(() => {
    if (identity && actor) {
      loadProfile();
    }
  }, [identity, actor, loadProfile]);

  async function handleSaveProfile() {
    if (!actor || !setupName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    setSavingProfile(true);
    try {
      await actor.saveCallerUserProfile({
        name: setupName,
        email: setupEmail,
        phone: setupPhone,
        schoolRole: setupRole,
      });
      if (!localStorage.getItem("mghs_seeded")) {
        try {
          await actor.seedSampleData();
          localStorage.setItem("mghs_seeded", "1");
        } catch {
          // ignore
        }
      }
      setShowSetup(false);
      await loadProfile();
      toast.success("Profile saved!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  }

  const isAdmin =
    userProfile?.schoolRole === SchoolRole.admin ||
    userProfile?.schoolRole === SchoolRole.teacher;

  if (isInitializing) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.22 0.08 145)" }}
      >
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!identity) {
    return <LandingPage onLogin={login} isLoggingIn={isLoggingIn} />;
  }

  if (loadingProfile) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.22 0.08 145)" }}
      >
        <div className="text-white text-lg">Loading your profile...</div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-right" />

      {/* Profile Setup Dialog */}
      <Dialog open={showSetup} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex justify-center mb-3">
              <img
                src="/assets/generated/magomano-crest-transparent.dim_400x400.png"
                alt="School Crest"
                className="w-16 h-16 object-contain"
              />
            </div>
            <DialogTitle className="text-center font-display">
              Welcome to Magomano Girls Portal
            </DialogTitle>
            <p className="text-center text-sm text-muted-foreground">
              Please complete your profile to continue
            </p>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setup-name">Full Name *</Label>
              <Input
                id="setup-name"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="setup-email">Email</Label>
              <Input
                id="setup-email"
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label htmlFor="setup-phone">Phone</Label>
              <Input
                id="setup-phone"
                value={setupPhone}
                onChange={(e) => setSetupPhone(e.target.value)}
                placeholder="+254 7XX XXX XXX"
              />
            </div>
            <div>
              <Label htmlFor="setup-role">I am a...</Label>
              <Select
                value={setupRole}
                onValueChange={(v) => setSetupRole(v as SchoolRole)}
              >
                <SelectTrigger id="setup-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SchoolRole.parent}>
                    Parent / Guardian
                  </SelectItem>
                  <SelectItem value={SchoolRole.student}>Student</SelectItem>
                  <SelectItem value={SchoolRole.teacher}>Teacher</SelectItem>
                  <SelectItem value={SchoolRole.admin}>
                    Administrator
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full"
            >
              {savingProfile ? "Saving..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {userProfile && (
        <div className="min-h-screen flex flex-col">
          {/* Top Nav */}
          <header
            className="flex items-center gap-3 px-4 py-2 shadow-md"
            style={{ background: "oklch(0.22 0.08 145)" }}
          >
            <img
              src="/assets/generated/magomano-crest-transparent.dim_400x400.png"
              alt="Crest"
              className="w-12 h-12 object-contain flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-display text-white text-base font-bold leading-tight truncate">
                Magomano Girls High School
              </div>
              <div
                className="text-xs"
                style={{ color: "oklch(0.75 0.08 120)" }}
              >
                Parent & Student Portal
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block">
                <div className="text-white text-sm font-medium">
                  {userProfile.name}
                </div>
                <div
                  className="text-xs capitalize"
                  style={{ color: "oklch(0.75 0.08 120)" }}
                >
                  {userProfile.schoolRole}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clear}
                className="text-white border-white/30 hover:bg-white/10 hover:text-white"
              >
                Logout
              </Button>
            </div>
          </header>

          <div className="flex flex-1">
            {/* Sidebar */}
            <aside
              className="w-56 flex-shrink-0 hidden md:flex flex-col"
              style={{ background: "oklch(0.26 0.09 145)" }}
            >
              {isAdmin ? (
                <AdminNav tab={tab} setTab={setTab} />
              ) : (
                <UserNav
                  tab={tab}
                  setTab={setTab}
                  role={userProfile.schoolRole}
                />
              )}
            </aside>

            {/* Mobile nav */}
            <div
              className="md:hidden w-full"
              style={{ background: "oklch(0.26 0.09 145)" }}
            >
              <MobileNav
                tab={tab}
                setTab={setTab}
                isAdmin={isAdmin}
                role={userProfile.schoolRole}
              />
            </div>

            {/* Main content */}
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              {isAdmin ? (
                <AdminContent tab={tab} actor={actor! as any} />
              ) : (
                <UserContent
                  tab={tab}
                  actor={actor! as any}
                  profile={userProfile}
                />
              )}
            </main>
          </div>
        </div>
      )}
    </>
  );
}

// ===================== LANDING PAGE =====================
function LandingPage({
  onLogin,
  isLoggingIn,
}: { onLogin: () => void; isLoggingIn: boolean }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.18 0.09 145) 0%, oklch(0.28 0.08 145) 60%, oklch(0.22 0.07 145) 100%)",
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="rounded-full p-4 mb-6"
          style={{ background: "oklch(1 0 0 / 0.12)" }}
        >
          <img
            src="/assets/generated/magomano-crest-transparent.dim_400x400.png"
            alt="Magomano Girls High School Crest"
            className="w-44 h-44 md:w-56 md:h-56 object-contain drop-shadow-2xl"
          />
        </div>

        <h1 className="font-display text-white text-2xl md:text-4xl font-bold text-center leading-tight mb-2">
          Magomano Girls
          <br />
          High School
        </h1>
        <p className="text-lg mb-1" style={{ color: "oklch(0.82 0.1 120)" }}>
          Parent & Student Portal
        </p>
        <p className="text-sm italic" style={{ color: "oklch(0.7 0.05 120)" }}>
          &ldquo;Our Success Depends on Me&rdquo;
        </p>
      </div>

      {/* CBC Badges */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          "Grades & Reports",
          "CBC System",
          "Fee Statements",
          "School Events",
        ].map((f) => (
          <span
            key={f}
            className="text-xs px-3 py-1 rounded-full border"
            style={{
              color: "oklch(0.88 0.06 120)",
              borderColor: "oklch(0.45 0.08 145)",
              background: "oklch(0.28 0.07 145)",
            }}
          >
            {f}
          </span>
        ))}
      </div>

      <Button
        onClick={onLogin}
        disabled={isLoggingIn}
        size="lg"
        className="px-10 py-3 text-base font-semibold shadow-lg"
        style={{ background: "oklch(0.55 0.18 27)", color: "white" }}
      >
        {isLoggingIn ? "Connecting..." : "Login with Internet Identity"}
      </Button>

      <p
        className="mt-4 text-xs text-center"
        style={{ color: "oklch(0.55 0.04 145)" }}
      >
        Secure login powered by Internet Computer &bull; No passwords needed
      </p>
    </div>
  );
}

// ===================== NAV COMPONENTS =====================
const userNavItems = [
  { id: "dashboard" as Tab, label: "Dashboard" },
  { id: "grades" as Tab, label: "Grades & Reports" },
  { id: "fees" as Tab, label: "Fee Statement" },
  { id: "events" as Tab, label: "Events" },
  { id: "announcements" as Tab, label: "Announcements" },
];

const adminNavItems = [
  { id: "dashboard" as Tab, label: "Dashboard" },
  { id: "students" as Tab, label: "Students" },
  { id: "admin-grades" as Tab, label: "Grades" },
  { id: "subjects" as Tab, label: "Subjects" },
  { id: "admin-fees" as Tab, label: "Fees" },
  { id: "admin-events" as Tab, label: "Events" },
  { id: "admin-announcements" as Tab, label: "Announcements" },
  { id: "registration-requests" as Tab, label: "Reg. Requests" },
  { id: "parent-link-requests" as Tab, label: "Parent Links" },
  { id: "users" as Tab, label: "Admin Access" },
];

function NavItem({
  id: _id,
  label,
  active,
  onClick,
}: { id: Tab; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
        active ? "text-white font-semibold" : "hover:bg-white/10"
      }`}
      style={
        active
          ? { background: "oklch(0.32 0.1 145)", color: "white" }
          : { color: "oklch(0.78 0.05 120)" }
      }
    >
      {label}
    </button>
  );
}

function AdminNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav className="py-4">
      <div
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "oklch(0.55 0.05 145)" }}
      >
        Admin Panel
      </div>
      {adminNavItems.map((item) => (
        <NavItem
          key={item.id}
          {...item}
          active={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
    </nav>
  );
}

function UserNav({
  tab,
  setTab,
  role,
}: { tab: Tab; setTab: (t: Tab) => void; role: SchoolRole }) {
  return (
    <nav className="py-4">
      <div
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "oklch(0.55 0.05 145)" }}
      >
        {role === SchoolRole.parent ? "Parent Portal" : "Student Portal"}
      </div>
      {userNavItems.map((item) => (
        <NavItem
          key={item.id}
          {...item}
          active={tab === item.id}
          onClick={() => setTab(item.id)}
        />
      ))}
    </nav>
  );
}

function MobileNav({
  tab,
  setTab,
  isAdmin,
  role: _role,
}: { tab: Tab; setTab: (t: Tab) => void; isAdmin: boolean; role: SchoolRole }) {
  const items = isAdmin ? adminNavItems : userNavItems;
  return (
    <div className="flex overflow-x-auto">
      {items.map((item) => (
        <button
          type="button"
          key={item.id}
          onClick={() => setTab(item.id)}
          className={`flex-shrink-0 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
            tab === item.id
              ? "border-green-400 text-white"
              : "border-transparent"
          }`}
          style={
            tab === item.id
              ? { color: "white" }
              : { color: "oklch(0.65 0.05 120)" }
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ===================== USER CONTENT =====================
function UserContent({
  tab,
  actor,
  profile,
}: {
  tab: Tab;
  actor: import("./backend.d").backendInterface;
  profile: UserProfile;
}) {
  const { identity: userIdentity } = useInternetIdentity();
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<CBCGrade[]>([]);
  const [subjects, setSubjects] = useState<CBCSubject[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Student enrollment form state
  const [enrollName, setEnrollName] = useState("");
  const [enrollAdmission, setEnrollAdmission] = useState("");
  const [enrollClass, setEnrollClass] = useState("");
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);
  const [enrollDone, setEnrollDone] = useState(false);
  // Parent link request form state
  const [linkAdmission, setLinkAdmission] = useState("");
  const [linkStudentName, setLinkStudentName] = useState("");
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkDone, setLinkDone] = useState(false);

  useEffect(() => {
    if (!actor) return;
    async function loadAll() {
      try {
        if (profile.schoolRole === "parent") {
          // Parents only see their own linked students
          const [s, ev, ann, fs] = await Promise.all([
            actor!.getStudentsByParent(),
            actor!.getAllEvents(),
            actor!.getAllAnnouncements(),
            actor!.getAllFeeStructures(),
          ]);
          setStudents(s);
          setEvents(ev);
          setAnnouncements(ann);
          setFeeStructures(fs);
          if (s.length > 0) {
            const [allGrades, allPayments] = await Promise.all([
              Promise.all(s.map((st) => actor!.getGradesByStudent(st.id))).then(
                (r) => r.flat(),
              ),
              Promise.all(
                s.map((st) => actor!.getFeePaymentsByStudent(st.id)),
              ).then((r) => r.flat()),
            ]);
            setGrades(allGrades);
            setFeePayments(allPayments);
          }
        } else if (profile.schoolRole === "student") {
          const [myRecord, ev, ann, sub] = await Promise.all([
            actor!.getMyStudentRecord(),
            actor!.getAllEvents(),
            actor!.getAllAnnouncements(),
            actor!.getAllSubjects(),
          ]);
          setEvents(ev);
          setAnnouncements(ann);
          setSubjects(sub);
          if (myRecord) {
            setStudents([myRecord]);
            const [stGrades, stFees, stFs] = await Promise.all([
              actor!.getGradesByStudent(myRecord.id),
              actor!.getFeePaymentsByStudent(myRecord.id),
              actor!.getAllFeeStructures(),
            ]);
            setGrades(stGrades);
            setFeePayments(stFees);
            setFeeStructures(stFs);
          }
        } else {
          const [s, sub, fs, fp, ev, ann] = await Promise.all([
            actor!.getAllStudents(),
            actor!.getAllSubjects(),
            actor!.getAllFeeStructures(),
            actor!.getAllFeePayments(),
            actor!.getAllEvents(),
            actor!.getAllAnnouncements(),
          ]);
          setStudents(s);
          setSubjects(sub);
          setFeeStructures(fs);
          setFeePayments(fp);
          setEvents(ev);
          setAnnouncements(ann);
          if (s.length > 0) {
            const allGrades = (
              await Promise.all(s.map((st) => actor!.getGradesByStudent(st.id)))
            ).flat();
            setGrades(allGrades);
          }
        }
        setLoaded(true);
      } catch (e) {
        console.error(e);
      }
    }
    loadAll();
  }, [actor, profile.schoolRole]);

  const myStudents = students;
  const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date());
  const myAnnouncements = announcements.filter(
    (a) => a.targetRole === "all" || a.targetRole === profile.schoolRole,
  );

  if (!loaded)
    return <div className="text-muted-foreground">Loading data...</div>;

  switch (tab) {
    case "dashboard":
      return (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold text-foreground">
            Welcome, {profile.name}
          </h2>
          {profile.schoolRole === "parent" && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-xs border">
              <span className="font-semibold shrink-0 text-muted-foreground">
                Your Principal ID:
              </span>
              <span className="font-mono text-foreground break-all">
                {userIdentity?.getPrincipal().toString() ?? "—"}
              </span>
              <button
                type="button"
                data-ocid="parent.copy_principal.button"
                className="ml-auto shrink-0 text-xs text-primary hover:underline font-medium"
                onClick={() => {
                  const pid = userIdentity?.getPrincipal().toString();
                  if (pid) {
                    navigator.clipboard.writeText(pid);
                  }
                }}
              >
                Copy
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Students"
              value={myStudents.length.toString()}
              sub="Linked to your account"
            />
            <StatCard
              title="Upcoming Events"
              value={upcomingEvents.length.toString()}
              sub="This term"
            />
            <StatCard
              title="Announcements"
              value={myAnnouncements.length.toString()}
              sub="For you"
            />
            <StatCard
              title="Subjects"
              value={subjects.length.toString()}
              sub="CBC subjects"
            />
          </div>

          {myStudents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display">
                  Students Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myStudents.map((st) => {
                    const stGrades = grades.filter(
                      (g) => g.studentId === st.id,
                    );
                    return (
                      <div
                        key={st.id.toString()}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary"
                      >
                        <div>
                          <div className="font-semibold">{st.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {st.studentClass} &bull; {st.admissionNumber}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {stGrades.length} grades recorded
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {upcomingEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id.toString()}
                      className="flex items-start gap-3"
                    >
                      <div className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded min-w-[80px] text-center">
                        {formatDate(ev.date)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{ev.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {ev.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );

    case "grades":
      return (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">
            Grades & Academic Reports
          </h2>
          <div className="flex flex-wrap gap-2 mb-2">
            <CBCLegend />
          </div>
          {myStudents.map((st) => {
            const stGrades = grades.filter((g) => g.studentId === st.id);
            return (
              <Card key={st.id.toString()}>
                <CardHeader>
                  <CardTitle className="font-display">{st.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {st.studentClass} &bull; Admission: {st.admissionNumber}
                  </p>
                </CardHeader>
                <CardContent>
                  {stGrades.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No grades recorded yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>CBC Level</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Term</TableHead>
                            <TableHead>Year</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stGrades.map((g) => {
                            const sub = subjects.find(
                              (s) => s.id === g.subjectId,
                            );
                            return (
                              <TableRow key={g.id.toString()}>
                                <TableCell className="font-medium">
                                  {sub?.name ?? "Unknown"}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full border font-medium ${cbcLevelColor(g.level)}`}
                                  >
                                    {g.level}
                                  </span>
                                </TableCell>
                                <TableCell>{Number(g.score)}%</TableCell>
                                <TableCell>Term {Number(g.term)}</TableCell>
                                <TableCell>{Number(g.year)}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {g.remarks}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {myStudents.length === 0 && profile.schoolRole === "parent" && (
            <Card className="border-[#1a4d2e]/30 bg-[#1a4d2e]/5">
              <CardHeader>
                <CardTitle className="font-display text-lg text-[#1a4d2e] dark:text-green-300">
                  Link Your Child to This Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {linkDone ? (
                  <div
                    className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg text-green-800 dark:text-green-200 text-sm"
                    data-ocid="parent.link_request.success_state"
                  >
                    ✅ Your request has been submitted. Admin will link your
                    account once verified.
                  </div>
                ) : (
                  <form
                    data-ocid="parent.link_request.panel"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!linkAdmission || !linkStudentName) return;
                      setLinkSubmitting(true);
                      try {
                        await actor!.submitParentLinkRequest(
                          linkAdmission,
                          linkStudentName,
                          new Date().toISOString().split("T")[0],
                        );
                        setLinkDone(true);
                        toast.success("Link request submitted!");
                      } catch {
                        toast.error("Failed to submit request.");
                      } finally {
                        setLinkSubmitting(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      Enter your child&apos;s details below. The admin will
                      verify and link your account.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="link-admission">
                        Child&apos;s Admission Number
                      </Label>
                      <Input
                        id="link-admission"
                        data-ocid="parent.link_request.input"
                        value={linkAdmission}
                        onChange={(e) => setLinkAdmission(e.target.value)}
                        placeholder="e.g. MGH/2024/001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link-name">Child&apos;s Full Name</Label>
                      <Input
                        id="link-name"
                        value={linkStudentName}
                        onChange={(e) => setLinkStudentName(e.target.value)}
                        placeholder="Full name as enrolled"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      data-ocid="parent.link_request.submit_button"
                      disabled={linkSubmitting}
                      className="w-full bg-[#1a4d2e] hover:bg-[#1a4d2e]/90 text-white"
                    >
                      {linkSubmitting ? "Submitting..." : "Submit Link Request"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
          {myStudents.length === 0 && profile.schoolRole === "student" && (
            <Card className="border-[#1a4d2e]/30 bg-[#1a4d2e]/5">
              <CardHeader>
                <CardTitle className="font-display text-lg text-[#1a4d2e] dark:text-green-300">
                  Request Enrollment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrollDone ? (
                  <div
                    className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 rounded-lg text-green-800 dark:text-green-200 text-sm"
                    data-ocid="student.enrollment.success_state"
                  >
                    ✅ Your enrollment request has been submitted. Please wait
                    for admin approval.
                  </div>
                ) : (
                  <form
                    data-ocid="student.enrollment.panel"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!enrollName || !enrollAdmission || !enrollClass)
                        return;
                      setEnrollSubmitting(true);
                      try {
                        await actor!.submitStudentRegistration(
                          enrollName,
                          enrollAdmission,
                          enrollClass,
                          new Date().toISOString().split("T")[0],
                        );
                        setEnrollDone(true);
                        toast.success("Enrollment request submitted!");
                      } catch {
                        toast.error("Failed to submit enrollment.");
                      } finally {
                        setEnrollSubmitting(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <p className="text-sm text-muted-foreground">
                      Submit your enrollment details. The admin will verify and
                      activate your account.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="enroll-name">Full Name</Label>
                      <Input
                        id="enroll-name"
                        data-ocid="student.enrollment.input"
                        value={enrollName}
                        onChange={(e) => setEnrollName(e.target.value)}
                        placeholder="Your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="enroll-admission">Admission Number</Label>
                      <Input
                        id="enroll-admission"
                        value={enrollAdmission}
                        onChange={(e) => setEnrollAdmission(e.target.value)}
                        placeholder="e.g. MGH/2024/001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="enroll-class">Class / Form</Label>
                      <Input
                        id="enroll-class"
                        value={enrollClass}
                        onChange={(e) => setEnrollClass(e.target.value)}
                        placeholder="e.g. Form 2 North"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      data-ocid="student.enrollment.submit_button"
                      disabled={enrollSubmitting}
                      className="w-full bg-[#1a4d2e] hover:bg-[#1a4d2e]/90 text-white"
                    >
                      {enrollSubmitting
                        ? "Submitting..."
                        : "Request Enrollment"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
          {myStudents.length === 0 &&
            profile.schoolRole !== "parent" &&
            profile.schoolRole !== "student" && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">No students found.</p>
                </CardContent>
              </Card>
            )}
        </div>
      );

    case "fees":
      return (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Fee Statement</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Fee Structure</CardTitle>
              </CardHeader>
              <CardContent>
                {feeStructures.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No fee structure defined.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeStructures.map((f) => (
                        <TableRow key={f.id.toString()}>
                          <TableCell>{f.item}</TableCell>
                          <TableCell>Term {Number(f.term)}</TableCell>
                          <TableCell>{formatKES(f.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {feeStructures.length > 0 && (
                  <div className="mt-3 pt-3 border-t font-semibold flex justify-between">
                    <span>Total</span>
                    <span>
                      {formatKES(
                        feeStructures.reduce((s, f) => s + f.amount, BigInt(0)),
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                {feePayments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No payments recorded.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feePayments.map((p) => (
                        <TableRow key={p.id.toString()}>
                          <TableCell className="text-sm">
                            {formatDate(p.date)}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {p.receiptNumber}
                          </TableCell>
                          <TableCell>{formatKES(p.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {feePayments.length > 0 && (
                  <div className="mt-3 pt-3 border-t font-semibold flex justify-between">
                    <span>Total Paid</span>
                    <span className="text-green-700">
                      {formatKES(
                        feePayments.reduce((s, p) => s + p.amount, BigInt(0)),
                      )}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case "events":
      return (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">School Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.length === 0 ? (
              <p className="text-muted-foreground">No events scheduled.</p>
            ) : (
              events
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((ev) => <EventCard key={ev.id.toString()} event={ev} />)
            )}
          </div>
        </div>
      );

    case "announcements":
      return (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Announcements</h2>
          {myAnnouncements.length === 0 ? (
            <p className="text-muted-foreground">No announcements.</p>
          ) : (
            myAnnouncements
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((ann) => (
                <Card key={ann.id.toString()}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-display text-lg">
                        {ann.title}
                      </CardTitle>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDate(ann.date)}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{ann.content}</p>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      );

    default:
      return null;
  }
}

// ===================== ADMIN CONTENT =====================
function AdminContent({
  tab,
  actor,
}: { tab: Tab; actor: import("./backend.d").backendInterface }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<CBCGrade[]>([]);
  const [subjects, setSubjects] = useState<CBCSubject[]>([]);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feePayments, setFeePayments] = useState<FeePayment[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!actor) return;
    try {
      const [s, sub, g, fs, fp, ev, ann] = await Promise.all([
        actor.getAllStudents(),
        actor.getAllSubjects(),
        actor.getAllGrades(),
        actor.getAllFeeStructures(),
        actor.getAllFeePayments(),
        actor.getAllEvents(),
        actor.getAllAnnouncements(),
      ]);
      setStudents(s);
      setSubjects(sub);
      setGrades(g);
      setFeeStructures(fs);
      setFeePayments(fp);
      setEvents(ev);
      setAnnouncements(ann);
      setLoaded(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load data");
    }
  }, [actor]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!loaded)
    return <div className="text-muted-foreground">Loading data...</div>;

  switch (tab) {
    case "dashboard":
      return (
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Admin Dashboard</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard
              title="Students"
              value={students.length.toString()}
              sub="Enrolled"
            />
            <StatCard
              title="Subjects"
              value={subjects.length.toString()}
              sub="CBC subjects"
            />
            <StatCard
              title="Grades"
              value={grades.length.toString()}
              sub="Recorded"
            />
            <StatCard
              title="Events"
              value={events.length.toString()}
              sub="Scheduled"
            />
            <StatCard
              title="Announcements"
              value={announcements.length.toString()}
              sub="Posted"
            />
            <StatCard
              title="Payments"
              value={feePayments.length.toString()}
              sub="Recorded"
            />
          </div>
        </div>
      );

    case "students":
      return (
        <StudentsPanel students={students} actor={actor!} onReload={reload} />
      );

    case "subjects":
      return (
        <SubjectsPanel subjects={subjects} actor={actor!} onReload={reload} />
      );

    case "admin-grades":
      return (
        <AdminGradesPanel
          grades={grades}
          students={students}
          subjects={subjects}
          actor={actor!}
          onReload={reload}
        />
      );

    case "admin-fees":
      return (
        <AdminFeesPanel
          feeStructures={feeStructures}
          feePayments={feePayments}
          students={students}
          actor={actor!}
          onReload={reload}
        />
      );

    case "admin-events":
      return (
        <AdminEventsPanel events={events} actor={actor!} onReload={reload} />
      );

    case "admin-announcements":
      return (
        <AdminAnnouncementsPanel
          announcements={announcements}
          actor={actor!}
          onReload={reload}
        />
      );

    case "users":
      return <AdminAccessPanel actor={actor!} />;

    case "registration-requests":
      return <RegistrationRequestsPanel actor={actor!} />;

    case "parent-link-requests":
      return <ParentLinkRequestsPanel actor={actor!} />;

    default:
      return null;
  }
}

function AdminAccessPanel({
  actor,
}: { actor: import("./backend.d").backendInterface }) {
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [principalInput, setPrincipalInput] = useState("");
  const [granting, setGranting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  useEffect(() => {
    actor.getAdminCount().then((n) => setAdminCount(Number(n)));
  }, [actor]);

  async function handleGrant() {
    if (!principalInput.trim()) return;
    setGranting(true);
    setFeedback(null);
    try {
      const { Principal } = await import("@icp-sdk/core/principal");
      const target = Principal.fromText(principalInput.trim());
      await actor.grantAdminRole(target);
      setFeedback({ ok: true, msg: "Admin role granted successfully." });
      setPrincipalInput("");
      const n = await actor.getAdminCount();
      setAdminCount(Number(n));
    } catch (e: any) {
      setFeedback({
        ok: false,
        msg: e?.message ?? "Failed to grant admin role.",
      });
    } finally {
      setGranting(false);
    }
  }

  const atMax = adminCount !== null && adminCount >= 3;

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Admin Access</h2>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Admin Slots</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-bold text-primary">
              {adminCount ?? "…"}
            </div>
            <div className="text-muted-foreground">/ 3 admins used</div>
          </div>
          <div className="flex gap-2 h-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`flex-1 rounded-full ${i < (adminCount ?? 0) ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          {atMax && (
            <p
              className="text-sm text-destructive font-medium"
              data-ocid="admin.max_reached.error_state"
            >
              Maximum 3 admins reached. Remove an admin before adding a new one.
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Grant Admin Role</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Principal ID of new admin</Label>
            <Input
              value={principalInput}
              onChange={(e) => setPrincipalInput(e.target.value)}
              placeholder="e.g. xxxxx-xxxxx-xxxxx-xxxxx-xxx"
              disabled={atMax}
              data-ocid="admin.grant_principal.input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The person must give you their Principal ID from their dashboard.
            </p>
          </div>
          <Button
            onClick={handleGrant}
            disabled={granting || atMax || !principalInput.trim()}
            data-ocid="admin.grant_admin.button"
          >
            {granting
              ? "Granting..."
              : atMax
                ? "Maximum 3 admins reached"
                : "Grant Admin Role"}
          </Button>
          {feedback && (
            <p
              className={`text-sm font-medium ${feedback.ok ? "text-green-600" : "text-destructive"}`}
              data-ocid={
                feedback.ok
                  ? "admin.grant.success_state"
                  : "admin.grant.error_state"
              }
            >
              {feedback.msg}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== ADMIN PANELS =====================
function StudentsPanel({
  students,
  actor,
  onReload,
}: {
  students: Student[];
  actor: import("./backend.d").backendInterface;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [name, setName] = useState("");
  const [admission, setAdmission] = useState("");
  const [cls, setCls] = useState("");
  const [parentPrincipal, setParentPrincipal] = useState("");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setName("");
    setAdmission("");
    setCls("");
    setParentPrincipal("");
    setOpen(true);
  }
  function openEdit(s: Student) {
    setEditing(s);
    setName(s.name);
    setAdmission(s.admissionNumber);
    setCls(s.studentClass);
    setParentPrincipal(s.parentId?.toText?.() ?? "");
    setOpen(true);
  }

  async function handleSave() {
    if (!actor || !name.trim()) return;
    setSaving(true);
    try {
      let parentPrincipalObj: any;
      if (parentPrincipal.trim()) {
        try {
          const { Principal } = await import("@icp-sdk/core/principal");
          parentPrincipalObj = Principal.fromText(parentPrincipal.trim());
        } catch {
          toast.error("Invalid Principal ID for parent");
          setSaving(false);
          return;
        }
      } else {
        parentPrincipalObj = {
          _isPrincipal: true,
          toText: () => "2vxsx-fae",
          toUint8Array: () => new Uint8Array(),
        } as any;
      }
      if (editing) {
        await actor.updateStudent(
          editing.id,
          name,
          admission,
          cls,
          parentPrincipalObj,
        );
        toast.success("Student updated");
      } else {
        await actor.createStudent(name, admission, cls, parentPrincipalObj);
        toast.success("Student added");
      }
      setOpen(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error saving student");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!actor || !confirm("Delete this student?")) return;
    try {
      await actor.deleteStudent(id);
      toast.success("Deleted");
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error deleting");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Students</h2>
        <Button onClick={openAdd} size="sm">
          + Add Student
        </Button>
      </div>
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Class/Form</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id.toString()}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.admissionNumber}</TableCell>
                  <TableCell>{s.studentClass}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Student</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-ocid="student.name.input"
              />
            </div>
            <div>
              <Label>Admission Number</Label>
              <Input
                value={admission}
                onChange={(e) => setAdmission(e.target.value)}
                data-ocid="student.admission.input"
              />
            </div>
            <div>
              <Label>Class / Form</Label>
              <Input
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                placeholder="e.g. Form 3A"
                data-ocid="student.class.input"
              />
            </div>
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-1">
              <Label className="text-primary font-semibold flex items-center gap-1">
                ⭐ Parent Principal ID
              </Label>
              <Input
                value={parentPrincipal}
                onChange={(e) => setParentPrincipal(e.target.value)}
                placeholder="e.g. xxxxx-xxxxx-xxxxx-xxxxx-xxx"
                data-ocid="student.parent_principal.input"
              />
              <p className="text-xs text-muted-foreground">
                This is the parent's Internet Identity Principal. The parent can
                find and copy this from their dashboard.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubjectsPanel({
  subjects,
  actor,
  onReload,
}: {
  subjects: CBCSubject[];
  actor: import("./backend.d").backendInterface;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CBCSubject | null>(null);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setName("");
    setTeacher("");
    setOpen(true);
  }
  function openEdit(s: CBCSubject) {
    setEditing(s);
    setName(s.name);
    setTeacher(s.teacher);
    setOpen(true);
  }

  async function handleSave() {
    if (!actor || !name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await actor.updateSubject(editing.id, name, teacher);
        toast.success("Updated");
      } else {
        await actor.createSubject(name, teacher);
        toast.success("Added");
      }
      setOpen(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!actor || !confirm("Delete subject?")) return;
    try {
      await actor.deleteSubject(id);
      toast.success("Deleted");
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Subjects</h2>
        <Button onClick={openAdd} size="sm">
          + Add Subject
        </Button>
      </div>
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((s) => (
                <TableRow key={s.id.toString()}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.teacher}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(s.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Teacher</Label>
              <Input
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CBC_LEVELS = [
  "Exceeding Expectations",
  "Meeting Expectations",
  "Approaching Expectations",
  "Below Expectations",
];

function AdminGradesPanel({
  grades,
  students,
  subjects,
  actor,
  onReload,
}: {
  grades: CBCGrade[];
  students: Student[];
  subjects: CBCSubject[];
  actor: import("./backend.d").backendInterface;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CBCGrade | null>(null);
  const [studentId, setStudentId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState("2025");
  const [level, setLevel] = useState(CBC_LEVELS[1]);
  const [score, setScore] = useState("70");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setStudentId(students[0]?.id.toString() ?? "");
    setSubjectId(subjects[0]?.id.toString() ?? "");
    setTerm("1");
    setYear("2025");
    setLevel(CBC_LEVELS[1]);
    setScore("70");
    setRemarks("");
    setOpen(true);
  }

  function openEdit(g: CBCGrade) {
    setEditing(g);
    setStudentId(g.studentId.toString());
    setSubjectId(g.subjectId.toString());
    setTerm(g.term.toString());
    setYear(g.year.toString());
    setLevel(g.level);
    setScore(g.score.toString());
    setRemarks(g.remarks);
    setOpen(true);
  }

  async function handleSave() {
    if (!actor) return;
    setSaving(true);
    try {
      const sid = BigInt(studentId);
      const subId = BigInt(subjectId);
      const t = BigInt(term);
      const y = BigInt(year);
      const sc = BigInt(score);
      if (editing) {
        await actor.updateGrade(
          editing.id,
          sid,
          subId,
          t,
          y,
          level,
          sc,
          remarks,
          editing.teacherId,
        );
        toast.success("Grade updated");
      } else {
        await actor.createGrade(
          sid,
          subId,
          t,
          y,
          level,
          sc,
          remarks,
          BigInt(1),
        );
        toast.success("Grade added");
      }
      setOpen(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error saving grade");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!actor || !confirm("Delete grade?")) return;
    try {
      await actor.deleteGrade(id);
      toast.success("Deleted");
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Grades (CBC)</h2>
        <Button
          onClick={openAdd}
          size="sm"
          disabled={students.length === 0 || subjects.length === 0}
        >
          + Add Grade
        </Button>
      </div>
      {(students.length === 0 || subjects.length === 0) && (
        <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-3">
          Please add students and subjects first.
        </p>
      )}
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.map((g) => {
                const st = students.find((s) => s.id === g.studentId);
                const sub = subjects.find((s) => s.id === g.subjectId);
                return (
                  <TableRow key={g.id.toString()}>
                    <TableCell>{st?.name ?? "?"}</TableCell>
                    <TableCell>{sub?.name ?? "?"}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${cbcLevelColor(g.level)}`}
                      >
                        {g.level}
                      </span>
                    </TableCell>
                    <TableCell>{Number(g.score)}%</TableCell>
                    <TableCell>T{Number(g.term)}</TableCell>
                    <TableCell>{Number(g.year)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(g)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(g.id)}
                        >
                          Del
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Grade</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id.toString()} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id.toString()} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Term 1</SelectItem>
                  <SelectItem value="2">Term 2</SelectItem>
                  <SelectItem value="3">Term 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Year</Label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                type="number"
              />
            </div>
            <div className="col-span-2">
              <Label>CBC Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CBC_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Score (%)</Label>
              <Input
                value={score}
                onChange={(e) => setScore(e.target.value)}
                type="number"
                min="0"
                max="100"
              />
            </div>
            <div className="col-span-2">
              <Label>Remarks</Label>
              <Input
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminFeesPanel({
  feeStructures,
  feePayments,
  students,
  actor,
  onReload,
}: {
  feeStructures: FeeStructure[];
  feePayments: FeePayment[];
  students: Student[];
  actor: import("./backend.d").backendInterface;
  onReload: () => void;
}) {
  const [openStruct, setOpenStruct] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("1");
  const [year, setYear] = useState("2025");
  const [payStudentId, setPayStudentId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [payReceipt, setPayReceipt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAddStructure() {
    if (!actor || !item.trim() || !amount) return;
    setSaving(true);
    try {
      await actor.createFeeStructure(
        item,
        BigInt(amount),
        BigInt(term),
        BigInt(year),
      );
      toast.success("Fee item added");
      setOpenStruct(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPayment() {
    if (!actor || !payStudentId || !payAmount) return;
    setSaving(true);
    try {
      await actor.createFeePayment(
        BigInt(payStudentId),
        BigInt(payAmount),
        payDate,
        payReceipt,
        BigInt(term),
        BigInt(year),
      );
      toast.success("Payment recorded");
      setOpenPayment(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStructure(id: bigint) {
    if (!actor || !confirm("Delete fee item?")) return;
    try {
      await actor.deleteFeeStructure(id);
      toast.success("Deleted");
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl font-bold">Fee Management</h2>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Fee Structure</h3>
          <Button
            size="sm"
            onClick={() => {
              setItem("");
              setAmount("");
              setTerm("1");
              setYear("2025");
              setOpenStruct(true);
            }}
          >
            + Add Item
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStructures.map((f) => (
                  <TableRow key={f.id.toString()}>
                    <TableCell>{f.item}</TableCell>
                    <TableCell>T{Number(f.term)}</TableCell>
                    <TableCell>{Number(f.year)}</TableCell>
                    <TableCell>{formatKES(f.amount)}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteStructure(f.id)}
                      >
                        Del
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Payment Records</h3>
          <Button
            size="sm"
            onClick={() => {
              setPayStudentId(students[0]?.id.toString() ?? "");
              setPayAmount("");
              setPayDate(new Date().toISOString().split("T")[0]);
              setPayReceipt("");
              setTerm("1");
              setYear("2025");
              setOpenPayment(true);
            }}
            disabled={students.length === 0}
          >
            + Record Payment
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feePayments.map((p) => {
                  const st = students.find((s) => s.id === p.studentId);
                  return (
                    <TableRow key={p.id.toString()}>
                      <TableCell>{st?.name ?? "?"}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(p.date)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {p.receiptNumber}
                      </TableCell>
                      <TableCell>T{Number(p.term)}</TableCell>
                      <TableCell>{formatKES(p.amount)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={openStruct} onOpenChange={setOpenStruct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Fee Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item Name</Label>
              <Input
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Tuition Fee"
              />
            </div>
            <div>
              <Label>Amount (KES)</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  type="number"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenStruct(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStructure} disabled={saving}>
              {saving ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openPayment} onOpenChange={setOpenPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Student</Label>
              <Select value={payStudentId} onValueChange={setPayStudentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id.toString()} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (KES)</Label>
              <Input
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                type="number"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                type="date"
              />
            </div>
            <div>
              <Label>Receipt Number</Label>
              <Input
                value={payReceipt}
                onChange={(e) => setPayReceipt(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Term</Label>
                <Select value={term} onValueChange={setTerm}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  type="number"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenPayment(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={saving}>
              {saving ? "Saving..." : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminEventsPanel({
  events,
  actor,
  onReload,
}: {
  events: SchoolEvent[];
  actor: import("./backend.d").backendInterface;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("academic");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setTitle("");
    setDesc("");
    setDate(new Date().toISOString().split("T")[0]);
    setCategory("academic");
    setOpen(true);
  }
  function openEdit(e: SchoolEvent) {
    setEditing(e);
    setTitle(e.title);
    setDesc(e.description);
    setDate(e.date);
    setCategory(e.category);
    setOpen(true);
  }

  async function handleSave() {
    if (!actor || !title.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await actor.updateEvent(editing.id, title, desc, date, category);
        toast.success("Updated");
      } else {
        await actor.createEvent(title, desc, date, category);
        toast.success("Event added");
      }
      setOpen(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!actor || !confirm("Delete event?")) return;
    try {
      await actor.deleteEvent(id);
      toast.success("Deleted");
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Events</h2>
        <Button onClick={openAdd} size="sm">
          + Add Event
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((ev) => (
          <Card key={ev.id.toString()}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="font-display text-base">
                  {ev.title}
                </CardTitle>
                <EventCategoryBadge category={ev.category} />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(ev.date)}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {ev.description}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(ev)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDelete(ev.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Add"} Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic">Academic</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="cultural">Cultural</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminAnnouncementsPanel({
  announcements,
  actor,
  onReload,
}: {
  announcements: Announcement[];
  actor: import("./backend.d").backendInterface;
  onReload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState("all");
  const [saving, setSaving] = useState(false);

  function openAdd() {
    setEditing(null);
    setTitle("");
    setContent("");
    setTargetRole("all");
    setOpen(true);
  }
  function openEdit(a: Announcement) {
    setEditing(a);
    setTitle(a.title);
    setContent(a.content);
    setTargetRole(a.targetRole);
    setOpen(true);
  }

  async function handleSave() {
    if (!actor || !title.trim()) return;
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];
    try {
      if (editing) {
        await actor.updateAnnouncement(
          editing.id,
          title,
          content,
          editing.date,
          targetRole,
        );
        toast.success("Updated");
      } else {
        await actor.createAnnouncement(title, content, today, targetRole);
        toast.success("Posted");
      }
      setOpen(false);
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: bigint) {
    if (!actor || !confirm("Delete announcement?")) return;
    try {
      await actor.deleteAnnouncement(id);
      toast.success("Deleted");
      onReload();
    } catch (e) {
      console.error(e);
      toast.error("Error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Announcements</h2>
        <Button onClick={openAdd} size="sm">
          + Post Announcement
        </Button>
      </div>
      <div className="space-y-3">
        {announcements
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((ann) => (
            <Card key={ann.id.toString()}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="font-display text-base">
                    {ann.title}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {ann.targetRole}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(ann.date)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {ann.content}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(ann)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(ann.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Target Audience</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="parent">Parents Only</SelectItem>
                  <SelectItem value="student">Students Only</SelectItem>
                  <SelectItem value="teacher">Teachers Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===================== SHARED COMPONENTS =====================
function StatCard({
  title,
  value,
  sub,
}: { title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="text-2xl font-bold text-primary">{value}</div>
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function EventCategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    academic: "bg-blue-100 text-blue-800",
    sports: "bg-orange-100 text-orange-800",
    cultural: "bg-purple-100 text-purple-800",
    holiday: "bg-green-100 text-green-800",
  };
  const cls = colors[category.toLowerCase()] ?? "bg-gray-100 text-gray-800";
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}
    >
      {category}
    </span>
  );
}

function EventCard({ event }: { event: SchoolEvent }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="font-display text-base">
            {event.title}
          </CardTitle>
          <EventCategoryBadge category={event.category} />
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(event.date)}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{event.description}</p>
      </CardContent>
    </Card>
  );
}

function RegistrationRequestsPanel({
  actor,
}: { actor: import("./backend.d").backendInterface }) {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<bigint | null>(null);
  const [rejectingId, setRejectingId] = useState<bigint | null>(null);
  const [parentIdInput, setParentIdInput] = useState<Record<string, string>>(
    {},
  );

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await actor.getAllRegistrationRequests();
      setRequests(data);
    } catch {
      toast.error("Failed to load registration requests");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleApprove(req: RegistrationRequest) {
    const pidStr = parentIdInput[req.id.toString()] ?? "";
    if (!pidStr.trim()) {
      toast.error("Please enter a Parent Principal ID");
      return;
    }
    let pid: Principal;
    try {
      pid = Principal.fromText(pidStr.trim());
    } catch {
      toast.error("Invalid Principal ID format");
      return;
    }
    setApprovingId(req.id);
    try {
      await actor.approveStudentRegistration(req.id, pid);
      toast.success("Registration approved!");
      loadRequests();
    } catch {
      toast.error("Failed to approve registration");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(req: RegistrationRequest) {
    setRejectingId(req.id);
    try {
      await actor.rejectStudentRegistration(req.id);
      toast.success("Registration rejected");
      loadRequests();
    } catch {
      toast.error("Failed to reject registration");
    } finally {
      setRejectingId(null);
    }
  }

  if (loading)
    return (
      <div
        className="text-muted-foreground"
        data-ocid="registration.loading_state"
      >
        Loading registration requests...
      </div>
    );

  return (
    <div className="space-y-6" data-ocid="registration.panel">
      <h2 className="font-display text-2xl font-bold">
        Student Registration Requests
      </h2>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p
              className="text-muted-foreground"
              data-ocid="registration.empty_state"
            >
              No registration requests found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req, idx) => (
            <Card
              key={req.id.toString()}
              data-ocid={`registration.item.${idx + 1}`}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{req.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Admission: {req.admissionNumber} &bull; Class:{" "}
                      {req.studentClass}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submitted: {formatDate(req.requestDate)}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-1 break-all">
                      Principal: {req.callerPrincipal.toString().slice(0, 20)}
                      ...
                    </div>
                  </div>
                  <Badge
                    className={
                      req.status === "approved"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : req.status === "rejected"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : "bg-yellow-100 text-yellow-800 border-yellow-300"
                    }
                  >
                    {req.status}
                  </Badge>
                </div>
                {req.status === "pending" && (
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs text-muted-foreground">
                      Parent Principal ID (to link parent account):
                    </Label>
                    <Input
                      data-ocid={`registration.input.${idx + 1}`}
                      placeholder="Paste parent's Principal ID"
                      value={parentIdInput[req.id.toString()] ?? ""}
                      onChange={(e) =>
                        setParentIdInput((prev) => ({
                          ...prev,
                          [req.id.toString()]: e.target.value,
                        }))
                      }
                      className="text-xs font-mono"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        data-ocid={`registration.confirm_button.${idx + 1}`}
                        disabled={approvingId === req.id}
                        className="bg-[#1a4d2e] hover:bg-[#1a4d2e]/90 text-white"
                        onClick={() => handleApprove(req)}
                      >
                        {approvingId === req.id ? "Approving..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        data-ocid={`registration.delete_button.${idx + 1}`}
                        disabled={rejectingId === req.id}
                        onClick={() => handleReject(req)}
                      >
                        {rejectingId === req.id ? "Rejecting..." : "Reject"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ParentLinkRequestsPanel({
  actor,
}: { actor: import("./backend.d").backendInterface }) {
  const [requests, setRequests] = useState<ParentLinkRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<bigint | null>(null);
  const [rejectingId, setRejectingId] = useState<bigint | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await actor.getAllParentLinkRequests();
      setRequests(data);
    } catch {
      toast.error("Failed to load parent link requests");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleApprove(req: ParentLinkRequest) {
    setApprovingId(req.id);
    try {
      await actor.approveParentLinkRequest(req.id);
      toast.success("Parent link approved!");
      loadRequests();
    } catch {
      toast.error("Failed to approve link");
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(req: ParentLinkRequest) {
    setRejectingId(req.id);
    try {
      await actor.rejectParentLinkRequest(req.id);
      toast.success("Link request rejected");
      loadRequests();
    } catch {
      toast.error("Failed to reject request");
    } finally {
      setRejectingId(null);
    }
  }

  if (loading)
    return (
      <div
        className="text-muted-foreground"
        data-ocid="parent_link.loading_state"
      >
        Loading parent link requests...
      </div>
    );

  return (
    <div className="space-y-6" data-ocid="parent_link.panel">
      <h2 className="font-display text-2xl font-bold">Parent Link Requests</h2>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p
              className="text-muted-foreground"
              data-ocid="parent_link.empty_state"
            >
              No parent link requests found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req, idx) => (
            <Card
              key={req.id.toString()}
              data-ocid={`parent_link.item.${idx + 1}`}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{req.studentName}</div>
                    <div className="text-sm text-muted-foreground">
                      Admission: {req.admissionNumber}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-1 break-all">
                      Parent: {req.callerPrincipal.toString().slice(0, 30)}...
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submitted: {formatDate(req.requestDate)}
                    </div>
                  </div>
                  <Badge
                    className={
                      req.status === "approved"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : req.status === "rejected"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : "bg-yellow-100 text-yellow-800 border-yellow-300"
                    }
                  >
                    {req.status}
                  </Badge>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      data-ocid={`parent_link.confirm_button.${idx + 1}`}
                      disabled={approvingId === req.id}
                      className="bg-[#1a4d2e] hover:bg-[#1a4d2e]/90 text-white"
                      onClick={() => handleApprove(req)}
                    >
                      {approvingId === req.id ? "Approving..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      data-ocid={`parent_link.delete_button.${idx + 1}`}
                      disabled={rejectingId === req.id}
                      onClick={() => handleReject(req)}
                    >
                      {rejectingId === req.id ? "Rejecting..." : "Reject"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function CBCLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {CBC_LEVELS.map((l) => (
        <span
          key={l}
          className={`text-xs px-2 py-1 rounded-full border ${cbcLevelColor(l)}`}
        >
          {l}
        </span>
      ))}
    </div>
  );
}
