"use client";

import AccountCircleOutlined from "@mui/icons-material/AccountCircleOutlined";
import LoginOutlined from "@mui/icons-material/LoginOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      loginId,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setError("Invalid ID or password");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Stack spacing={2.5}>
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: "grid", gap: 2 }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>
                <ShieldOutlined />
              </Avatar>
              <Box>
                <Typography variant="subtitle1">Election Login</Typography>
                <Typography variant="body2" color="text.secondary">
                  Operator access
                </Typography>
              </Box>
            </Stack>

            <TextField
              label="ID"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              autoComplete="username"
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <AccountCircleOutlined
                      fontSize="small"
                      sx={{ color: "text.secondary", mr: 1 }}
                    />
                  ),
                },
              }}
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              fullWidth
            />

            {error ? <Alert severity="error">{error}</Alert> : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<LoginOutlined />}
              disabled={loading}
              fullWidth
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}
