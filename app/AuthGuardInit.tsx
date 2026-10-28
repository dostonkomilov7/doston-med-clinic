"use client";
import { useEffect } from "react";
import { installAuthFetchGuard } from "../lib/utils";

export default function AuthGuardInit() {
  useEffect(() => {
    installAuthFetchGuard();
  }, []);
  return null;
}
