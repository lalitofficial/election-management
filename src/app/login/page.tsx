import AssessmentOutlined from "@mui/icons-material/AssessmentOutlined";
import DatasetOutlined from "@mui/icons-material/DatasetOutlined";
import VerifiedUserOutlined from "@mui/icons-material/VerifiedUserOutlined";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/components/login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/");
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="stretch">
          <Grid size={{ xs: 12, md: 7 }}>
            <Card sx={{ height: "100%" }}>
              <CardContent sx={{ p: { xs: 3, md: 4 }, height: "100%" }}>
                <Stack justifyContent="space-between" height="100%" spacing={4}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={1}>
                      <Chip label="IIT Madras" color="primary" variant="outlined" />
                      <Chip label="Student Elections" variant="outlined" />
                    </Stack>
                    <Box>
                      <Typography variant="overline" color="text.secondary">
                        Election Manager
                      </Typography>
                      <Typography variant="h3" sx={{ mt: 1 }}>
                        Material-first turnout operations.
                      </Typography>
                      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, maxWidth: 560 }}>
                        Search, mark, audit, and monitor turnout in one compact interface.
                      </Typography>
                    </Box>
                  </Stack>

                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FeatureCard
                        icon={<VerifiedUserOutlined color="primary" />}
                        title="Scoped"
                        subtitle="Role-based control"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FeatureCard
                        icon={<DatasetOutlined color="primary" />}
                        title="Roster"
                        subtitle="Import and search"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FeatureCard
                        icon={<AssessmentOutlined color="primary" />}
                        title="Live"
                        subtitle="Instant totals"
                      />
                    </Grid>
                  </Grid>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <LoginForm />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack spacing={1.25}>
          {icon}
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
