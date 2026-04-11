import { useEffect, useState, useCallback, useRef } from "react";
import api from "./api";

interface VoteResponse {
  student_id: string;
  response: "approve" | "reject";
  created_at: string;
}

interface TeamMember {
  student_id: string;
  name: string;
  avatar_url: string | null;
}

interface VoteInfo {
  id: string;
  status: "pending" | "approved" | "rejected";
  initiated_by: string;
  initiated_by_name: string;
  deadline: string;
  created_at: string;
  resolved_at: string | null;
}

export interface VoteStatus {
  vote: VoteInfo | null;
  responses: VoteResponse[];
  team_members: TeamMember[];
  my_response: "approve" | "reject" | null;
}

export function useTeamVote(assignmentId: string | undefined, isTeamAssignment: boolean) {
  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!assignmentId || !isTeamAssignment) return;
    try {
      const { data } = await api.get(`/assignments/${assignmentId}/vote/status`);
      setVoteStatus(data);
    } catch {
      // ignore - might not have a team
    }
  }, [assignmentId, isTeamAssignment]);

  // Initial fetch + polling (only while pending)
  useEffect(() => {
    if (!isTeamAssignment || !assignmentId) return;
    fetchStatus();
    const isPending = !voteStatus?.vote || voteStatus.vote.status === "pending";
    if (isPending) {
      intervalRef.current = setInterval(fetchStatus, 4000);
    }
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [assignmentId, isTeamAssignment, fetchStatus, voteStatus?.vote?.status]);

  const initiateVote = useCallback(async (payload: { code?: string; content?: Record<string, unknown>; problem_index?: number }) => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/assignments/${assignmentId}/vote`, payload);
      setVoteStatus(data);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  const castVote = useCallback(async (response: "approve" | "reject") => {
    if (!assignmentId || !voteStatus?.vote?.id) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/assignments/${assignmentId}/vote/${voteStatus.vote.id}/respond`, { response });
      setVoteStatus(data);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, voteStatus?.vote?.id]);

  return {
    isTeamAssignment,
    voteStatus,
    loading,
    initiateVote,
    castVote,
    refetch: fetchStatus,
  };
}
