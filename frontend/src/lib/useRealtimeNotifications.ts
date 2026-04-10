/**
 * Supabase Realtime 구독 — 메시지/코멘트 실시간 알림
 *
 * messages 테이블에 INSERT → 알림 + 메신저 즉시 갱신
 * note_comments 테이블에 INSERT → 알림 즉시 갱신
 */
import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { useNotificationStore } from "../store/notificationStore";
import { useMessengerStore } from "../store/messengerStore";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeNotifications(userId: string | undefined) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const fetchTotalUnread = useNotificationStore((s) => s.fetchTotalUnread);

  useEffect(() => {
    if (!userId) return;

    // 기존 구독 정리
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      // 새 메시지 수신 (내가 receiver)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          // 즉시 알림 갱신
          fetchNotifications();
          fetchTotalUnread();
          // 현재 열린 대화가 있으면 메시지도 갱신
          const ms = useMessengerStore.getState();
          if (ms.activeCourseId && ms.activePartnerId) {
            ms.pollMessages(ms.activeCourseId, ms.activePartnerId);
            ms.fetchConversations(ms.activeCourseId);
          }
        }
      )
      // 내 노트에 새 코멘트
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "note_comments",
        },
        (payload) => {
          // 본인이 쓴 코멘트는 무시
          if (payload.new && (payload.new as Record<string, unknown>).user_id === userId) return;
          fetchNotifications();
        }
      )
      // 메시지 읽음 처리 (내가 sender인 메시지가 읽힘)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${userId}`,
        },
        () => {
          // 읽음 상태 갱신
          const ms = useMessengerStore.getState();
          if (ms.activeCourseId && ms.activePartnerId) {
            ms.pollMessages(ms.activeCourseId, ms.activePartnerId);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, fetchNotifications, fetchTotalUnread]);
}
