import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useCourseStore } from "../store/courseStore";
import { useMessengerStore } from "../store/messengerStore";
import AppShell from "../components/common/AppShell";
import ConversationList from "../components/messenger/ConversationList";
import ChatView from "../components/messenger/ChatView";

export default function Messenger() {
  const { courseId, partnerId } = useParams<{ courseId: string; partnerId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const currentCourse = useCourseStore((s) => s.currentCourse);
  const fetchCourse = useCourseStore((s) => s.fetchCourse);

  const {
    conversations, messages, loading, sending,
    activePartnerId,
    fetchConversations, fetchMessages, sendMessage, setActive, reset,
  } = useMessengerStore();

  const pollRef = useRef<ReturnType<typeof setInterval>>();

  // 코스 로드
  useEffect(() => {
    if (courseId && (!currentCourse || currentCourse.id !== courseId)) {
      fetchCourse(courseId);
    }
  }, [courseId, currentCourse, fetchCourse]);

  // 대화 목록 로드
  useEffect(() => {
    if (courseId) {
      fetchConversations(courseId);
    }
    return () => reset();
  }, [courseId, fetchConversations, reset]);

  // partner 선택 시 메시지 로드
  useEffect(() => {
    if (courseId && partnerId) {
      setActive(courseId, partnerId);
      fetchMessages(courseId, partnerId);
    }
  }, [courseId, partnerId, setActive, fetchMessages]);

  // 5초 폴링 (활성 대화)
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (courseId && partnerId) {
      pollRef.current = setInterval(() => {
        useMessengerStore.getState().pollMessages(courseId, partnerId);
        useMessengerStore.getState().fetchConversations(courseId);
      }, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [courseId, partnerId]);

  const handleSelectConversation = (pid: string) => {
    navigate(`/courses/${courseId}/messenger/${pid}`);
  };

  const handleSend = (content: string) => {
    if (courseId && partnerId) {
      sendMessage(courseId, partnerId, content);
    }
  };

  // 현재 partner 정보
  const activePartner = conversations.find((c) => c.partner.id === partnerId)?.partner || null;

  return (
    <AppShell courseTitle={currentCourse?.title}>
      <div className="messenger-page">
        {/* 대화 목록 (좌측) */}
        <div className="messenger-sidebar">
          <div className="messenger-sidebar-header">
            <h3>메신저</h3>
          </div>
          <ConversationList
            conversations={conversations}
            activePartnerId={activePartnerId}
            onSelect={handleSelectConversation}
            loading={loading}
          />
        </div>

        {/* 채팅 영역 (우측) */}
        <div className="messenger-main">
          <ChatView
            messages={messages}
            partner={activePartner}
            currentUserId={user?.id || ""}
            sending={sending}
            onSend={handleSend}
          />
        </div>
      </div>
    </AppShell>
  );
}
