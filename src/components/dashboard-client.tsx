"use client";

import AddOutlined from "@mui/icons-material/AddOutlined";
import CheckCircleOutlineOutlined from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseOutlined from "@mui/icons-material/CloseOutlined";
import LogoutOutlined from "@mui/icons-material/LogoutOutlined";
import RefreshOutlined from "@mui/icons-material/RefreshOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import UndoOutlined from "@mui/icons-material/UndoOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import { formatDistanceToNow } from "date-fns";
import { signOut } from "next-auth/react";
import { FormEvent, useEffect, useEffectEvent, useMemo, useState } from "react";

import type {
  DashboardPayload,
  FamilyScope,
  GroupOption,
  HostelStudent,
  ManagedUser,
  PocContact,
  PocDirectoryRow,
  SearchStudent,
  UserRole,
  UsersContextPayload,
} from "@/lib/contracts";
import { hostelSubgroupType } from "@/lib/constants";
import { familyLabels, familyShortLabels, roleLabels } from "@/lib/ui-constants";

type TabId = "main" | "count" | "pocs" | "logs" | "users" | "help";

type Props = {
  initialData: DashboardPayload;
};

type SearchFilters = {
  q: string;
  hostel: string;
  roomNo: string;
};

const allFamilies: FamilyScope[] = ["HOSTEL", "DEPARTMENT", "YEAR_BRANCH"];

export function DashboardClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [usersCtx, setUsersCtx] = useState<UsersContextPayload>({ users: [], availableGroups: [] });
  const usersCtxLoaded = usersCtx.users.length > 0 || usersCtx.availableGroups.length > 0;
  const [activeTab, setActiveTab] = useState<TabId>("main");
  const [activeFamily, setActiveFamily] = useState<FamilyScope>(
    (initialData.viewer.familyScope as FamilyScope | null) ??
      ((Object.keys(initialData.familyBreakdowns)[0] as FamilyScope | undefined) ?? "HOSTEL"),
  );
  const [filters, setFilters] = useState<SearchFilters>({ q: "", hostel: "", roomNo: "" });
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    q: "",
    hostel: "",
    roomNo: "",
  });
  const [searchResults, setSearchResults] = useState<SearchStudent[]>([]);
  const [searching, setSearching] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [userBusy, setUserBusy] = useState(false);
  const [bulkVoteBusy, setBulkVoteBusy] = useState(false);
  const [bulkVoteForm, setBulkVoteForm] = useState({ count: "", remarks: "" });
  const [hostelDialog, setHostelDialog] = useState<string | null>(null);
  const [pocDialog, setPocDialog] = useState<{
    title: string;
    subtitle?: string;
    contacts: PocContact[];
  } | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    loginId: "",
    password: "",
    role: (initialData.viewer.role === "ADMIN" ? "POC" : "ADMIN") as UserRole,
    familyScope: (initialData.viewer.familyScope ?? "HOSTEL") as FamilyScope,
    managerId: "",
    groupIds: [] as string[],
  });

  const visibleFamilies = useMemo(() => {
    return data.viewer.role === "SUPERADMIN"
      ? allFamilies
      : data.viewer.familyScope
        ? [data.viewer.familyScope]
        : [];
  }, [data.viewer.familyScope, data.viewer.role]);

  const visibleTabs = useMemo((): Array<{ id: TabId; label: string }> => {
    return [
      { id: "main", label: "Main" },
      ...(data.viewer.role === "SUPERADMIN" ? [{ id: "count" as TabId, label: "Count" }] : []),
      { id: "pocs", label: "POCs" },
      { id: "logs", label: "Logs" },
      ...(data.viewer.role !== "POC" ? [{ id: "users" as TabId, label: "Users" }] : []),
      { id: "help", label: "Help" },
    ];
  }, [data.viewer.role]);

  const currentBreakdown = data.familyBreakdowns[activeFamily] ?? [];
  const admins = usersCtx.users.filter((user) => user.role === "ADMIN");
  const groupOptions = usersCtx.availableGroups.filter((group) => group.family === userForm.familyScope);
  const searchHostelOptions = useMemo(
    () => {
      const scopedBreakdownHostels = (data.familyBreakdowns.HOSTEL ?? []).map((row) => row.label);
      const scopedGroupHostels = usersCtx.availableGroups
        .filter((group) => group.scopeType === "HOSTEL")
        .map((group) => group.hostel);

      return [...new Set([...scopedBreakdownHostels, ...scopedGroupHostels])].sort((left, right) =>
        left.localeCompare(right),
      );
    },
    [data.familyBreakdowns.HOSTEL, usersCtx.availableGroups],
  );
  const hostelOptions = groupOptions.filter((group) => group.scopeType === "HOSTEL");
  const selectedManager = admins.find((admin) => admin.id === userForm.managerId);
  const pocAllowedHostels = new Set(
    data.viewer.role === "SUPERADMIN"
      ? (selectedManager?.assignedGroups ?? [])
          .filter((group) => group.scopeType === "HOSTEL")
          .map((group) => group.hostel)
      : [],
  );
  const pocSubgroupOptions = groupOptions.filter((group) => {
    if (group.scopeType === "HOSTEL") return false;
    if (pocAllowedHostels.size > 0 && !pocAllowedHostels.has(group.hostel)) return false;
    // Only show the configured sub-group type for hostels that have one
    const configured = hostelSubgroupType[group.hostel];
    if (configured) return group.scopeType === configured;
    return true;
  });
  const wingOptions = pocSubgroupOptions.filter((group) => group.scopeType === "WING");
  const departmentOptions = pocSubgroupOptions.filter((group) => group.scopeType === "DEPARTMENT");

  function toggleGroup(group: GroupOption) {
    setUserForm((current) => {
      const selected = current.groupIds.includes(group.id);
      return {
        ...current,
        groupIds: selected
          ? current.groupIds.filter((groupId) => groupId !== group.id)
          : [...current.groupIds, group.id],
      };
    });
  }

  async function loadDashboard() {
    const response = await fetch("/api/dashboard/summary", { cache: "no-store" });
    if (!response.ok) return;
    const payload: DashboardPayload = await response.json();
    setData(payload);
  }

  async function loadUsersContext() {
    const response = await fetch("/api/users-context", { cache: "no-store" });
    if (!response.ok) return;
    const payload: UsersContextPayload = await response.json();
    setUsersCtx(payload);
  }

  async function runSearch(nextFilters: SearchFilters) {
    setSearching(true);
    setError(null);

    const searchParams = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => {
      if (value.trim()) searchParams.set(key, value.trim());
    });

    const response = await fetch(`/api/students/search?${searchParams.toString()}`, {
      cache: "no-store",
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Search failed");
      setSearching(false);
      return;
    }

    setAppliedFilters(nextFilters);
    setSearchResults(payload.students);
    setSearching(false);
  }

  const refreshDashboard = useEffectEvent(async () => {
    await Promise.all([loadDashboard(), runSearch(appliedFilters)]);
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshDashboard();
    }, 15000);
    return () => window.clearInterval(interval);
  }, []);

  // Load users context lazily the first time the Users tab is opened.
  useEffect(() => {
    if (activeTab === "users" && !usersCtxLoaded) {
      const timeoutId = window.setTimeout(() => {
        void loadUsersContext();
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [activeTab, usersCtxLoaded]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void runSearch({ q: "", hostel: "", roomNo: "" });
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();
    await runSearch(filters);
  }

  async function toggleStudentVote(student: SearchStudent) {
    const action = student.hasVoted ? "unmark" : "mark";
    setBusyIds((prev) => new Set(prev).add(student.id));
    setError(null);

    const response = await fetch(`/api/turnout/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setError(payload.error ?? "Update failed");
    } else {
      await Promise.all([loadDashboard(), runSearch(appliedFilters)]);
    }

    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(student.id);
      return next;
    });
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setError("Select a file");
      return;
    }
    setImporting(true);
    setError(null);
    const response = await fetch("/api/roster/import", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Import failed");
      setImporting(false);
      return;
    }
    setNotice(`Imported ${payload.job.filename}`);
    event.currentTarget.reset();
    await loadDashboard();
    setImporting(false);
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUserBusy(true);
    setError(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...userForm,
        managerId:
          userForm.role === "POC"
            ? data.viewer.role === "ADMIN"
              ? data.viewer.id
              : userForm.managerId || null
            : null,
        familyScope: userForm.role === "SUPERADMIN" ? null : userForm.familyScope,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Unable to create user");
      setUserBusy(false);
      return;
    }
    setNotice(`Created ${payload.user.loginId}`);
    void loadUsersContext();
    setUserForm({
      name: "",
      loginId: "",
      password: "",
      role: data.viewer.role === "ADMIN" ? "POC" : "ADMIN",
      familyScope: (data.viewer.familyScope ?? "HOSTEL") as FamilyScope,
      managerId: "",
      groupIds: [],
    });
    await loadDashboard();
    setUserBusy(false);
  }

  async function addBulkVotes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBulkVoteBusy(true);
    setError(null);
    const response = await fetch("/api/turnout/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: Number(bulkVoteForm.count), remarks: bulkVoteForm.remarks }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Unable to add bulk votes");
      setBulkVoteBusy(false);
      return;
    }
    setNotice(`Added ${payload.entry.count} bulk votes`);
    setBulkVoteForm({ count: "", remarks: "" });
    await loadDashboard();
    setBulkVoteBusy(false);
  }

  function openPocDialog(title: string, contacts: PocContact[], subtitle?: string) {
    setPocDialog({
      title,
      subtitle,
      contacts,
    });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", pb: 4 }}>
      <AppBar
        position="sticky"
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Toolbar sx={{ gap: 2, justifyContent: "space-between" }}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6">Election Manager</Typography>
              <Chip
                size="small"
                label={roleLabels[data.viewer.role]}
                color="primary"
                variant="outlined"
              />
              {data.viewer.familyScope ? (
                <Chip
                  size="small"
                  label={familyLabels[data.viewer.familyScope]}
                  variant="outlined"
                />
              ) : null}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {data.viewer.name} · {data.viewer.loginId}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={() => void loadDashboard()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              color="inherit"
              startIcon={<LogoutOutlined />}
              onClick={() => signOut({ callbackUrl: "/login" })}
              sx={{ bgcolor: "grey.900", color: "common.white", "&:hover": { bgcolor: "grey.800" } }}
            >
              Sign out
            </Button>
          </Stack>
        </Toolbar>

        <Box sx={{ borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Tabs
            value={activeTab}
            onChange={(_, v: TabId) => setActiveTab(v)}
            sx={{ px: 2, minHeight: 42 }}
            TabIndicatorProps={{ style: { height: 3 } }}
          >
            {visibleTabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                sx={{ minHeight: 42, py: 0, textTransform: "none", fontWeight: 500 }}
              />
            ))}
          </Tabs>
        </Box>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Stack spacing={2.5}>
          {notice ? <Alert severity="success">{notice}</Alert> : null}
          {error ? <Alert severity="error">{error}</Alert> : null}

          {/* ── MAIN TAB ── */}
          {activeTab === "main" && (
            <>
              {data.viewer.role !== "SUPERADMIN" && (
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <MetricCard label="Students" value={String(data.summary.totalStudents)} compact />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <MetricCard label="Voted" value={String(data.summary.votedStudents)} compact />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <MetricCard label="Turnout" value={data.summary.turnoutText} compact />
                  </Grid>
                </Grid>
              )}

              <Card>
                <CardContent sx={{ p: { xs: 1.25, sm: 1.5 } }}>
                  <Box component="form" onSubmit={handleSearch}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={{ xs: 0.75, sm: 1 }}
                      flexWrap="wrap"
                      useFlexGap
                      alignItems={{ xs: "stretch", sm: "center" }}
                    >
                      <TextField
                        size="small"
                        placeholder="Roll no, name, phone"
                        value={filters.q}
                        onChange={(e) => setFilters((cur) => ({ ...cur, q: e.target.value }))}
                        sx={{ flex: "1 1 260px", minWidth: { xs: 0, sm: 220 } }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <SearchOutlined fontSize="small" sx={{ color: "text.secondary" }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <TextField
                        size="small"
                        select
                        value={filters.hostel}
                        onChange={(e) => setFilters((cur) => ({ ...cur, hostel: e.target.value }))}
                        sx={{ flex: { sm: "0 0 168px" } }}
                      >
                        <MenuItem value="">All hostels</MenuItem>
                        {searchHostelOptions.map((hostel) => (
                          <MenuItem key={hostel} value={hostel}>
                            {hostel}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        placeholder="Room"
                        value={filters.roomNo}
                        onChange={(e) =>
                          setFilters((cur) => ({ ...cur, roomNo: e.target.value }))
                        }
                        sx={{ flex: { sm: "0 0 100px" } }}
                      />
                      <Stack
                        direction="row"
                        spacing={0.75}
                        sx={{ width: { xs: "100%", sm: "auto" } }}
                      >
                        <Button
                          type="submit"
                          variant="contained"
                          size="small"
                          disabled={searching}
                          sx={{ minWidth: 88, flex: { xs: 1, sm: "0 0 auto" } }}
                        >
                          {searching ? "Loading" : "Search"}
                        </Button>
                        <Button
                          type="button"
                          variant="text"
                          size="small"
                          disabled={searching}
                          sx={{ flex: { xs: 1, sm: "0 0 auto" } }}
                          onClick={() => {
                            const nextFilters = { q: "", hostel: "", roomNo: "" };
                            setFilters(nextFilters);
                            void runSearch(nextFilters);
                          }}
                        >
                          Clear
                        </Button>
                      </Stack>
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`${searchResults.length} loaded`}
                        sx={{ ml: { sm: "auto" }, alignSelf: { xs: "flex-start", sm: "center" } }}
                      />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              {searching ? <LinearProgress /> : null}

              {searchResults.length > 0 && (
                <>
                  <Stack spacing={1} sx={{ display: { xs: "flex", sm: "none" } }}>
                    {searchResults.map((student) => (
                      <Paper
                        key={student.id}
                        variant="outlined"
                        sx={{
                          p: 1.1,
                          bgcolor: student.hasVoted ? "success.50" : "background.paper",
                        }}
                      >
                        <Stack spacing={0.85}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={600} noWrap>
                                {student.studentName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {student.rollNo}
                              </Typography>
                            </Box>
                            <StatusChip hasVoted={student.hasVoted} />
                          </Stack>

                          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                            <Chip size="small" variant="outlined" label={student.hostel} />
                            <Chip size="small" variant="outlined" label={`Room ${student.roomNo}`} />
                            <Chip size="small" variant="outlined" label={student.wing} />
                          </Stack>

                          <Typography variant="caption" color="text.secondary">
                            {student.department} · {student.year}
                          </Typography>

                          <Stack direction="row" spacing={0.75}>
                            {student.pocs.length > 0 ? (
                              <Button
                                size="small"
                                variant="text"
                                sx={{ px: 0.5, minWidth: 0 }}
                                onClick={() =>
                                  openPocDialog(
                                    student.studentName,
                                    student.pocs,
                                    `${student.hostel} · ${student.wing}`,
                                  )
                                }
                              >
                                {getPocButtonLabel(student.pocs)}
                              </Button>
                            ) : null}

                            {student.hasVoted ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<UndoOutlined fontSize="small" />}
                                disabled={busyIds.has(student.id)}
                                onClick={() => void toggleStudentVote(student)}
                                sx={{ ml: "auto" }}
                              >
                                {busyIds.has(student.id) ? "..." : "Undo"}
                              </Button>
                            ) : (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<CheckCircleOutlineOutlined fontSize="small" />}
                                disabled={busyIds.has(student.id)}
                                onClick={() => void toggleStudentVote(student)}
                                sx={{ ml: "auto" }}
                              >
                                {busyIds.has(student.id) ? "..." : "Voted"}
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>

                  <Paper variant="outlined" sx={{ display: { xs: "none", sm: "block" } }}>
                    <TableContainer>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell>Roll No</TableCell>
                          <TableCell>Hostel</TableCell>
                          <TableCell>Room · Wing</TableCell>
                          <TableCell>Dept · Year</TableCell>
                          <TableCell>POCs</TableCell>
                          <TableCell align="center">Status</TableCell>
                          <TableCell align="center">Action</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {searchResults.map((student, index) => (
                          <TableRow
                            key={student.id}
                            sx={{
                              bgcolor: student.hasVoted ? "success.50" : undefined,
                              "& td": { py: 0.75 },
                            }}
                          >
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {index + 1}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {student.studentName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {student.rollNo}
                              </Typography>
                            </TableCell>
                            <TableCell>{student.hostel}</TableCell>
                            <TableCell>
                              <Typography variant="body2">{student.roomNo}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {student.wing}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{student.department}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {student.year}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {student.pocs.length > 0 ? (
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() =>
                                    openPocDialog(
                                      student.studentName,
                                      student.pocs,
                                      `${student.hostel} · ${student.wing}`,
                                    )
                                  }
                                  sx={{ minWidth: 0, px: 0.5 }}
                                >
                                  {getPocButtonLabel(student.pocs)}
                                </Button>
                              ) : (
                                <Typography variant="caption" color="text.secondary">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <StatusChip hasVoted={student.hasVoted} />
                            </TableCell>
                            <TableCell align="center">
                              {student.hasVoted ? (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<UndoOutlined fontSize="small" />}
                                  disabled={busyIds.has(student.id)}
                                  onClick={() => void toggleStudentVote(student)}
                                  sx={{ py: 0.25, minWidth: 80 }}
                                >
                                  {busyIds.has(student.id) ? "..." : "Undo"}
                                </Button>
                              ) : (
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  startIcon={<CheckCircleOutlineOutlined fontSize="small" />}
                                  disabled={busyIds.has(student.id)}
                                  onClick={() => void toggleStudentVote(student)}
                                  sx={{ py: 0.25, minWidth: 80 }}
                                >
                                  {busyIds.has(student.id) ? "..." : "Voted"}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </TableContainer>
                  </Paper>
                </>
              )}

              {searchResults.length === 0 && !searching && (
                <Box sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No students found
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* ── COUNT TAB (SuperAdmin only) ── */}
          {activeTab === "count" && data.viewer.role === "SUPERADMIN" && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
                  <MetricCard label="Students" value={String(data.summary.totalStudents)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
                  <MetricCard label="Named votes" value={String(data.summary.votedStudents)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
                  <MetricCard label="Bulk votes" value={String(data.summary.bulkVotes)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
                  <MetricCard label="Total votes" value={String(data.summary.totalVotes)} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4, lg: 2 }}>
                  <MetricCard label="Turnout" value={data.summary.turnoutText} />
                </Grid>
              </Grid>

              <SectionCard title="Breakdown">
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {visibleFamilies.map((family) => (
                    <Chip
                      key={family}
                      label={familyLabels[family]}
                      color={activeFamily === family ? "primary" : "default"}
                      variant={activeFamily === family ? "filled" : "outlined"}
                      onClick={() => setActiveFamily(family)}
                    />
                  ))}
                </Stack>

                {currentBreakdown.length === 0 ? (
                  <Box sx={{ mt: 1 }}>
                    <EmptyState title="No data" />
                  </Box>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ mt: 1.5 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>{familyShortLabels[activeFamily]}</TableCell>
                          <TableCell align="right">Voted</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Turnout</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {currentBreakdown.map((row) => (
                          <TableRow
                            key={row.label}
                            hover
                            onClick={
                              activeFamily === "HOSTEL"
                                ? () => setHostelDialog(row.label)
                                : undefined
                            }
                            sx={activeFamily === "HOSTEL" ? { cursor: "pointer" } : undefined}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={500}>
                                {row.label}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{row.voted}</TableCell>
                            <TableCell align="right">{row.total}</TableCell>
                            <TableCell align="right">{row.turnout.toFixed(1)}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </SectionCard>

              <SectionCard title="Roster">
                <Box component="form" onSubmit={handleImport}>
                  <Stack spacing={1.5}>
                    <TextField
                      type="file"
                      name="file"
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <Button
                      type="submit"
                      variant="outlined"
                      startIcon={<UploadFileOutlined />}
                      disabled={importing}
                    >
                      {importing ? "Importing..." : "Import"}
                    </Button>
                  </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Stack spacing={1}>
                  {data.recentImports.length === 0 ? (
                    <EmptyState title="No imports" />
                  ) : (
                    data.recentImports.map((job) => (
                      <Paper key={job.id} variant="outlined" sx={{ p: 1.5 }}>
                        <Typography variant="body2" fontWeight={500}>
                          {job.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {job.status} · {job.createdCount} new · {job.updatedCount} updated
                        </Typography>
                      </Paper>
                    ))
                  )}
                </Stack>
              </SectionCard>
            </Stack>
          )}

          {/* ── POCS TAB ── */}
          {activeTab === "pocs" && (
            <PocDirectoryTable
              rows={data.pocDirectory}
              onOpen={(row) => openPocDialog(`POCs · ${row.wing}`, row.contacts, row.hostel)}
            />
          )}

          {/* ── LOGS TAB ── */}
          {activeTab === "logs" && (
            <Paper variant="outlined">
              {data.recentAudit.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">No events</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell>Action</TableCell>
                        <TableCell>By</TableCell>
                        <TableCell align="right">When</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.recentAudit.map((event) => (
                        <TableRow key={event.id} sx={{ "& td": { py: 0.6 } }}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {event.student?.studentName ?? "—"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {event.student?.rollNo ?? ""}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{event.description}</Typography>
                            {event.reason ? (
                              <Typography variant="caption" color="text.secondary">
                                {event.reason}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{event.actor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {roleLabels[event.actor.role]}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}

          {/* ── USERS TAB ── */}
          {activeTab === "users" && data.viewer.role !== "POC" && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <SectionCard title="Create User">
                  <Box component="form" onSubmit={createUser}>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Name"
                          value={userForm.name}
                          onChange={(e) =>
                            setUserForm((cur) => ({ ...cur, name: e.target.value }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="ID"
                          value={userForm.loginId}
                          onChange={(e) =>
                            setUserForm((cur) => ({ ...cur, loginId: e.target.value }))
                          }
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          label="Password"
                          value={userForm.password}
                          onChange={(e) =>
                            setUserForm((cur) => ({ ...cur, password: e.target.value }))
                          }
                        />
                      </Grid>

                      {data.viewer.role === "SUPERADMIN" ? (
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <TextField
                            select
                            fullWidth
                            label="Role"
                            value={userForm.role}
                            onChange={(e) =>
                              setUserForm((cur) => ({
                                ...cur,
                                role: e.target.value as UserRole,
                                managerId: "",
                                groupIds: [],
                              }))
                            }
                          >
                            <MenuItem value="ADMIN">Admin</MenuItem>
                            <MenuItem value="POC">POC</MenuItem>
                            <MenuItem value="SUPERADMIN">SuperAdmin</MenuItem>
                          </TextField>
                        </Grid>
                      ) : null}

                      {userForm.role !== "SUPERADMIN" ? (
                        <Grid size={12}>
                          <TextField
                            select
                            fullWidth
                            label="Family"
                            value={userForm.familyScope}
                            onChange={(e) =>
                              setUserForm((cur) => ({
                                ...cur,
                                familyScope: e.target.value as FamilyScope,
                                groupIds: [],
                              }))
                            }
                          >
                            {visibleFamilies.map((family) => (
                              <MenuItem key={family} value={family}>
                                {familyLabels[family]}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      ) : null}

                      {data.viewer.role === "SUPERADMIN" && userForm.role === "POC" ? (
                        <Grid size={12}>
                          <TextField
                            select
                            fullWidth
                            label="Manager"
                            value={userForm.managerId}
                            onChange={(e) =>
                              setUserForm((cur) => ({ ...cur, managerId: e.target.value }))
                            }
                          >
                            <MenuItem value="">None</MenuItem>
                            {admins
                              .filter((admin) => admin.familyScope === userForm.familyScope)
                              .map((admin) => (
                                <MenuItem key={admin.id} value={admin.id}>
                                  {admin.name}
                                </MenuItem>
                              ))}
                          </TextField>
                        </Grid>
                      ) : null}

                      {userForm.role === "ADMIN" ? (
                        <Grid size={12}>
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Hostels
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                              sx={{ mt: 1 }}
                            >
                              {hostelOptions.map((group) => {
                                const selected = userForm.groupIds.includes(group.id);
                                return (
                                  <Chip
                                    key={group.id}
                                    label={group.label}
                                    color={selected ? "primary" : "default"}
                                    variant={selected ? "filled" : "outlined"}
                                    onClick={() => toggleGroup(group)}
                                  />
                                );
                              })}
                            </Stack>
                          </Paper>
                        </Grid>
                      ) : null}

                      {userForm.role === "POC" ? (
                        <Grid size={12}>
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Wings
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                              sx={{ mt: 1 }}
                            >
                              {wingOptions.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                  {data.viewer.role === "SUPERADMIN"
                                    ? "Select an Admin to narrow POC scope."
                                    : "No wing scopes available."}
                                </Typography>
                              ) : (
                                wingOptions.map((group) => {
                                  const selected = userForm.groupIds.includes(group.id);
                                  return (
                                    <Chip
                                      key={group.id}
                                      label={group.label}
                                      color={selected ? "primary" : "default"}
                                      variant={selected ? "filled" : "outlined"}
                                      onClick={() => toggleGroup(group)}
                                    />
                                  );
                                })
                              )}
                            </Stack>
                          </Paper>
                        </Grid>
                      ) : null}

                      {userForm.role === "POC" ? (
                        <Grid size={12}>
                          <Paper variant="outlined" sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Departments
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={1}
                              flexWrap="wrap"
                              useFlexGap
                              sx={{ mt: 1 }}
                            >
                              {departmentOptions.length === 0 ? (
                                <Typography variant="caption" color="text.secondary">
                                  {data.viewer.role === "SUPERADMIN"
                                    ? "Select an Admin to narrow POC scope."
                                    : "No department scopes available."}
                                </Typography>
                              ) : (
                                departmentOptions.map((group) => {
                                  const selected = userForm.groupIds.includes(group.id);
                                  return (
                                    <Chip
                                      key={group.id}
                                      label={group.label}
                                      color={selected ? "primary" : "default"}
                                      variant={selected ? "filled" : "outlined"}
                                      onClick={() => toggleGroup(group)}
                                    />
                                  );
                                })
                              )}
                            </Stack>
                          </Paper>
                        </Grid>
                      ) : null}
                    </Grid>

                    <Button
                      sx={{ mt: 1.5 }}
                      type="submit"
                      variant="contained"
                      startIcon={<AddOutlined />}
                      disabled={userBusy}
                    >
                      {userBusy ? "Creating..." : "Create"}
                    </Button>
                  </Box>
                </SectionCard>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={2}>
                  <SectionCard title="Users">
                    <Stack spacing={1}>
                      {usersCtx.users.length === 0 ? (
                        <EmptyState title="No users" />
                      ) : (
                        usersCtx.users.map((user) => <UserCard key={user.id} user={user} />)
                      )}
                    </Stack>
                  </SectionCard>

                  {data.viewer.role === "SUPERADMIN" ? (
                    <SectionCard title="Bulk Votes">
                      <Box component="form" onSubmit={addBulkVotes}>
                        <Stack spacing={1.5}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Count"
                            value={bulkVoteForm.count}
                            onChange={(e) =>
                              setBulkVoteForm((cur) => ({ ...cur, count: e.target.value }))
                            }
                            slotProps={{ htmlInput: { min: 1, step: 1 } }}
                          />
                          <TextField
                            fullWidth
                            multiline
                            minRows={2}
                            label="Remarks"
                            value={bulkVoteForm.remarks}
                            onChange={(e) =>
                              setBulkVoteForm((cur) => ({ ...cur, remarks: e.target.value }))
                            }
                          />
                          <Button
                            type="submit"
                            variant="contained"
                            startIcon={<AddOutlined />}
                            disabled={bulkVoteBusy}
                          >
                            {bulkVoteBusy ? "Adding..." : "Add bulk votes"}
                          </Button>
                        </Stack>
                      </Box>
                    </SectionCard>
                  ) : null}
                </Stack>
              </Grid>
            </Grid>
          )}

          {activeTab === "help" && <HelpTab role={data.viewer.role} />}
        </Stack>
      </Container>

      <HostelDialog
        key={hostelDialog ?? "closed"}
        hostelLabel={hostelDialog}
        onClose={() => setHostelDialog(null)}
        viewerRole={data.viewer.role}
        onRefresh={() => void loadDashboard()}
      />
      <PocContactsDialog
        open={pocDialog !== null}
        title={pocDialog?.title ?? ""}
        subtitle={pocDialog?.subtitle}
        contacts={pocDialog?.contacts ?? []}
        onClose={() => setPocDialog(null)}
      />
    </Box>
  );
}

function HostelDialog({
  hostelLabel,
  onClose,
  viewerRole,
  onRefresh,
}: {
  hostelLabel: string | null;
  onClose: () => void;
  viewerRole: UserRole;
  onRefresh: () => void;
}) {
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "voted">("all");
  const [search, setSearch] = useState("");
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkCount, setBulkCount] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  const [pocDialog, setPocDialog] = useState<{
    title: string;
    subtitle?: string;
    contacts: PocContact[];
  } | null>(null);

  useEffect(() => {
    if (!hostelLabel) {
      return;
    }

    let cancelled = false;

    fetch(`/api/students/hostel?hostel=${encodeURIComponent(hostelLabel)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((payload) => {
        if (!cancelled) {
          setStudents(payload.students ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hostelLabel]);

  const searchQ = search.trim().toLowerCase();
  const filtered = students.filter((s) => {
    if (filter === "pending" && s.hasVoted) return false;
    if (filter === "voted" && !s.hasVoted) return false;
    if (searchQ) {
      return (
        s.studentName.toLowerCase().includes(searchQ) ||
        s.rollNo.toLowerCase().includes(searchQ) ||
        s.roomNo.toLowerCase().includes(searchQ) ||
        s.wing.toLowerCase().includes(searchQ)
      );
    }
    return true;
  });

  const votedCount = students.filter((s) => s.hasVoted).length;
  const pendingCount = students.length - votedCount;

  async function refreshStudents() {
    if (!hostelLabel) return;
    const r = await fetch(
      `/api/students/hostel?hostel=${encodeURIComponent(hostelLabel)}`,
      { cache: "no-store" },
    );
    if (r.ok) {
      const p = await r.json();
      setStudents(p.students ?? []);
    }
  }

  async function markStudent(id: string) {
    setBusyIds((prev) => new Set(prev).add(id));
    setLocalError(null);
    const response = await fetch("/api/turnout/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setLocalError(payload.error ?? "Mark failed");
    } else {
      setStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, hasVoted: true } : s)),
      );
      onRefresh();
    }
    setBusyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function submitBulkVote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBulkBusy(true);
    setLocalError(null);

    const response = await fetch("/api/turnout/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count: Number(bulkCount), remarks: bulkRemarks }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setLocalError(payload.error ?? "Failed to add bulk votes");
      setBulkBusy(false);
      return;
    }

    setLocalNotice(`Added ${payload.entry.count} bulk votes`);
    setBulkCount("");
    setBulkRemarks("");
    onRefresh();
    setBulkBusy(false);
  }

  return (
    <Dialog open={hostelLabel !== null} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{hostelLabel}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Chip size="small" label={`${students.length} total`} variant="outlined" />
              <Chip size="small" label={`${votedCount} voted`} color="success" variant="outlined" />
              <Chip
                size="small"
                label={`${pendingCount} pending`}
                color="warning"
                variant="outlined"
              />
            </Stack>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {localNotice ? (
          <Alert severity="success" sx={{ m: 2, mb: 0 }}>
            {localNotice}
          </Alert>
        ) : null}
        {localError ? (
          <Alert severity="error" sx={{ m: 2, mb: 0 }}>
            {localError}
          </Alert>
        ) : null}

        <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              size="small"
              placeholder="Name, roll no, room, wing…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flex: "1 1 200px", minWidth: 160 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <SearchOutlined fontSize="small" style={{ marginRight: 6, color: "#5f6368" }} />
                  ),
                },
              }}
            />
            <Stack direction="row" spacing={0.75}>
              {(["all", "pending", "voted"] as const).map((f) => (
                <Chip
                  key={f}
                  size="small"
                  label={
                    f === "all"
                      ? `All (${students.length})`
                      : f === "pending"
                        ? `Pending (${pendingCount})`
                        : `Voted (${votedCount})`
                  }
                  color={filter === f ? "primary" : "default"}
                  variant={filter === f ? "filled" : "outlined"}
                  onClick={() => setFilter(f)}
                />
              ))}
            </Stack>
            <IconButton size="small" onClick={() => void refreshStudents()}>
              <RefreshOutlined fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        {loading ? (
          <LinearProgress />
        ) : filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {searchQ ? `No results for "${search}"` : "No students"}
            </Typography>
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Roll No</TableCell>
                  <TableCell>Room</TableCell>
                  <TableCell>Wing</TableCell>
                  <TableCell>POCs</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((student, index) => (
                  <TableRow
                    key={student.id}
                    sx={{
                      bgcolor: student.hasVoted ? "success.50" : undefined,
                      "& td": { py: 0.75 },
                    }}
                  >
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {student.studentName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {student.rollNo}
                      </Typography>
                    </TableCell>
                    <TableCell>{student.roomNo}</TableCell>
                    <TableCell>{student.wing}</TableCell>
                    <TableCell>
                      {student.pocs.length > 0 ? (
                        <Button
                          size="small"
                          variant="text"
                          onClick={() =>
                            setPocDialog({
                              title: student.studentName,
                              subtitle: `${student.hostel} · ${student.wing}`,
                              contacts: student.pocs,
                            })
                          }
                          sx={{ minWidth: 0, px: 0.5 }}
                        >
                          {getPocButtonLabel(student.pocs)}
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <StatusChip hasVoted={student.hasVoted} />
                    </TableCell>
                    <TableCell align="center">
                      {student.hasVoted ? (
                        <CheckCircleOutlineOutlined fontSize="small" color="success" />
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          disabled={busyIds.has(student.id)}
                          onClick={() => void markStudent(student.id)}
                          sx={{ minWidth: 72, py: 0.25 }}
                        >
                          {busyIds.has(student.id) ? "..." : "Voted"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {viewerRole === "SUPERADMIN" && hostelLabel ? (
          <Box
            component="form"
            onSubmit={(e: FormEvent<HTMLFormElement>) => void submitBulkVote(e)}
            sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Bulk votes
            </Typography>
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <TextField
                size="small"
                type="number"
                label="Count"
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                slotProps={{ htmlInput: { min: 1, step: 1 } }}
                sx={{ width: 110 }}
              />
              <TextField
                size="small"
                fullWidth
                label="Remarks"
                value={bulkRemarks}
                onChange={(e) => setBulkRemarks(e.target.value)}
                placeholder={`${hostelLabel} – offline votes`}
              />
              <Button
                type="submit"
                variant="outlined"
                size="small"
                startIcon={<AddOutlined />}
                disabled={bulkBusy}
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {bulkBusy ? "Adding..." : "Add"}
              </Button>
            </Stack>
          </Box>
        ) : null}
      </DialogContent>
      <PocContactsDialog
        open={pocDialog !== null}
        title={pocDialog?.title ?? ""}
        subtitle={pocDialog?.subtitle}
        contacts={pocDialog?.contacts ?? []}
        onClose={() => setPocDialog(null)}
      />
    </Dialog>
  );
}

function getPocButtonLabel(contacts: PocContact[]) {
  if (contacts.length === 0) {
    return "No POCs";
  }

  if (contacts.length === 1) {
    return contacts[0].name;
  }

  return `${contacts[0].name} +${contacts.length - 1}`;
}

function PocDirectoryTable({
  rows,
  onOpen,
}: {
  rows: PocDirectoryRow[];
  onOpen: (row: PocDirectoryRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <Paper variant="outlined">
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No mapped POCs
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Hostel</TableCell>
              <TableCell>Wing</TableCell>
              <TableCell align="right">Contacts</TableCell>
              <TableCell>Names</TableCell>
              <TableCell align="center">Open</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.hostel}|${row.wing}`} sx={{ "& td": { py: 0.75 } }}>
                <TableCell>{row.hostel}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {row.wing}
                  </Typography>
                </TableCell>
                <TableCell align="right">{row.contacts.length}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {getPocButtonLabel(row.contacts)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Button size="small" variant="outlined" onClick={() => onOpen(row)}>
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

function PocContactsDialog({
  open,
  title,
  subtitle,
  contacts,
  onClose,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  contacts: PocContact[];
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{title}</Typography>
            {subtitle ? (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            ) : null}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
            <CloseOutlined fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 1.5 }}>
        <Stack spacing={1}>
          {contacts.map((contact) => (
            <Paper key={`${contact.wing}|${contact.rollNo || contact.name}`} variant="outlined" sx={{ p: 1.25 }}>
              <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {contact.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {contact.rollNo || "Manual contact"} · {contact.phoneNo}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="flex-end">
                  {contact.tags.map((tag) => (
                    <Chip
                      key={tag}
                      size="small"
                      label={tag}
                      color={tag === "LEAD" ? "primary" : tag === "GREEN" ? "success" : "warning"}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function HelpRow({ label, desc }: { label: string; desc: string }) {
  return (
    <TableRow sx={{ "& td": { py: 0.75, verticalAlign: "top" } }}>
      <TableCell sx={{ width: 200, whiteSpace: "nowrap" }}>
        <Typography variant="body2" fontWeight={500}>{label}</Typography>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">{desc}</Typography>
      </TableCell>
    </TableRow>
  );
}

function HelpTab({ role }: { role: UserRole }) {
  return (
    <Stack spacing={2.5}>
      <HelpSection title="Quick Start">
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Election Manager tracks student voter turnout in real time. Each account is scoped to a
          hostel, wing, or department and can only mark students within that scope.
        </Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              <HelpRow label="SuperAdmin" desc="Full access — imports rosters, views all data, manages all users, adds bulk votes." />
              <HelpRow label="Admin" desc="Manages a set of hostels, creates POC accounts within those hostels, views hostel-level counts." />
              <HelpRow label="POC" desc="Marks individual students as voted within their assigned wing or department." />
            </TableBody>
          </Table>
        </TableContainer>
      </HelpSection>

      <HelpSection title="Main Tab — Marking Votes">
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              <HelpRow label="Search" desc="Type a name, roll number, hostel, or room number then press Search." />
              <HelpRow label="Voted button" desc="Click Voted on any pending row to mark that student. Row turns green and counters update instantly." />
              <HelpRow label="Undo button" desc="Click Undo to reverse a mark if a student was recorded by mistake. Creates an audit entry." />
            </TableBody>
          </Table>
        </TableContainer>
      </HelpSection>

      {role === "SUPERADMIN" && (
        <HelpSection title="Count Tab — Turnout Overview">
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <HelpRow label="Metrics row" desc="Total students, named votes, bulk votes, combined total, and turnout %." />
                <HelpRow label="Breakdown table" desc="Per-hostel/department/year-branch turnout. Click any hostel row to open the full student list." />
                <HelpRow label="Hostel dialog" desc="Full table for that hostel with per-row Voted/Undo buttons, search box, and All/Pending/Voted filters." />
                <HelpRow label="Bulk votes" desc="Record anonymous offline votes when ballots cannot be linked to individual students." />
                <HelpRow label="Roster import" desc="Upload a CSV (see CSV Format section). Re-importing updates existing students without resetting vote status." />
              </TableBody>
            </Table>
          </TableContainer>
        </HelpSection>
      )}

      <HelpSection title="Logs Tab — Audit Trail">
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              <HelpRow label="Student" desc="The student whose vote status changed." />
              <HelpRow label="Action" desc="Mark or Unmark, with any reason given for an unmark." />
              <HelpRow label="By" desc="The user account that performed the action and their role." />
              <HelpRow label="When" desc="Relative time since the action." />
            </TableBody>
          </Table>
        </TableContainer>
      </HelpSection>

      {role !== "POC" && (
        <HelpSection title="Users Tab — Account Management">
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                <HelpRow label="Create User" desc="Fill in name, login ID, and password. Choose role and family scope, then assign groups." />
                <HelpRow label="Admin groups" desc="Admins are assigned whole hostels." />
                <HelpRow label="POC groups — Cauvery" desc="POCs are assigned by wing (room ranges, e.g. Rooms 101-112)." />
                <HelpRow label="POC groups — Mandakini" desc="POCs are assigned by department." />
                <HelpRow label="POC groups — other hostels" desc="Both wings and departments are available." />
                <HelpRow label="Manager field" desc="When creating a POC, the chosen Admin's hostel assignment limits which wings/depts appear." />
                {role === "SUPERADMIN" && (
                  <HelpRow label="Bulk Votes" desc="Records a count of offline/paper votes globally. Requires a remark explaining the source." />
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </HelpSection>
      )}

      {role === "SUPERADMIN" && (
        <HelpSection title="Roster CSV Format">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Required columns (header names are case-insensitive; spaces and underscores normalised):
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Column</TableCell>
                  <TableCell>Required</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(
                  [
                    ["roll_no", true, "Unique student ID, e.g. NA25B001"],
                    ["name_of_the_student", true, "Full name"],
                    ["current_hostel", true, "Must exactly match a seeded hostel name (Alakananda, Cauvery, Ganga, Godavari, Jamuna, Mandakini)"],
                    ["room_no", true, "Room number — wing is derived automatically"],
                    ["mobile_no", true, "10-digit phone number"],
                    ["dept / department", false, "Department code, e.g. CSE, ECE (optional)"],
                  ] as [string, boolean, string][]
                ).map(([col, req, note]) => (
                  <TableRow key={col} sx={{ "& td": { py: 0.75 } }}>
                    <TableCell><Typography variant="body2" fontFamily="monospace">{col}</Typography></TableCell>
                    <TableCell>
                      <Chip size="small" label={req ? "Yes" : "Optional"} color={req ? "error" : "default"} variant="outlined" />
                    </TableCell>
                    <TableCell><Typography variant="body2" color="text.secondary">{note}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info" sx={{ mt: 1.5 }}>
            Re-importing the same roll number updates the student record without resetting vote status.
          </Alert>
        </HelpSection>
      )}

      <HelpSection title="Tips & Common Issues">
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableBody>
              <HelpRow label="Session expires" desc="Sessions last 12 hours. If the page stops responding, sign out and sign back in." />
              <HelpRow label="Auto-refresh" desc="Dashboard polls every 15 seconds. Use the Refresh button for an immediate update." />
              <HelpRow label="Hostel name mismatch on import" desc="current_hostel must exactly match a seeded hostel name (capital first letter, rest lowercase)." />
              <HelpRow label="Wrong wing assigned" desc="Wings are auto-derived from room numbers. Cauvery uses range-based wings (e.g. Rooms 101-112). Rooms outside all ranges are placed in wing General." />
              <HelpRow label="Cannot mark a student" desc="Your account scope may not cover that student. Ask your Admin or SuperAdmin to verify your group assignments." />
            </TableBody>
          </Table>
        </TableContainer>
      </HelpSection>
    </Stack>
  );
}

function SectionCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1">{title}</Typography>
          {action ? (
            <Typography variant="caption" color="text.secondary">
              {action}
            </Typography>
          ) : null}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardContent sx={{ p: compact ? { xs: 1.25, sm: 1.75 } : 2.5 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant={compact ? "h5" : "h4"} sx={{ mt: compact ? 0.5 : 1 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function StatusChip({ hasVoted }: { hasVoted: boolean }) {
  return (
    <Chip
      size="small"
      label={hasVoted ? "Voted" : "Pending"}
      color={hasVoted ? "success" : "warning"}
      variant={hasVoted ? "filled" : "outlined"}
    />
  );
}

function UserCard({ user }: { user: ManagedUser }) {
  const hostelGroups = user.assignedGroups.filter((group) => group.scopeType === "HOSTEL");
  const wingGroups = user.assignedGroups.filter((group) => group.scopeType === "WING");
  const departmentGroups = user.assignedGroups.filter((group) => group.scopeType === "DEPARTMENT");

  return (
    <Paper variant="outlined" sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="body2" fontWeight={500}>
            {user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user.loginId} · {roleLabels[user.role]}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={user.isActive ? "Active" : "Disabled"}
          color={user.isActive ? "success" : "default"}
          variant="outlined"
        />
      </Stack>
      {user.familyScope ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          {familyLabels[user.familyScope]}
        </Typography>
      ) : null}
      {hostelGroups.length > 0 ? (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {hostelGroups.map((group) => (
            <Chip key={group.id} size="small" label={group.label} variant="outlined" />
          ))}
        </Stack>
      ) : null}
      {wingGroups.length > 0 ? (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {wingGroups.map((group) => (
            <Chip key={group.id} size="small" label={group.label} color="primary" variant="outlined" />
          ))}
        </Stack>
      ) : null}
      {departmentGroups.length > 0 ? (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {departmentGroups.map((group) => (
            <Chip
              key={group.id}
              size="small"
              label={group.label}
              color="secondary"
              variant="outlined"
            />
          ))}
        </Stack>
      ) : null}
    </Paper>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        minHeight: 96,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        bgcolor: "grey.50",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
    </Paper>
  );
}
