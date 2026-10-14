import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

const COLORS = {
  background: '#FDF5EF',
  foreground: '#1C0B12',
  card: '#FFFFFF',
  primary: '#C4637A',
  muted: '#F0E6E9',
  mutedForeground: '#8B6472',
  inputBackground: '#F5EBEE',
  border: 'rgba(196, 99, 122, 0.14)',
};

const img = (id: string, width = 200, height = 200) =>
  `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&auto=format`;

const P = {
  a1: '1580489944761-15a19d654956',
  a2: '1662850886700-4ec19bd30d11',
  a3: '1489278353717-f64c6ee8a4d2',
  a4: '1562337404-3044c84ac061',
  a5: '1607569708758-0270aa4651bd',
};

type Message = {
  id: string | number;
  sender: 'me' | 'them';
  text: string;
  time: string;
};

const DESIGNERS = [
  {
    id: 1,
    name: 'Sofia Mendes',
    avatar: img(P.a1),
  },
  {
    id: 2,
    name: 'Priya Kapoor',
    avatar: img(P.a2),
  },
  {
    id: 3,
    name: 'Camille Dubois',
    avatar: img(P.a3),
  },
  {
    id: 4,
    name: 'Alicia Vega',
    avatar: img(P.a4),
  },
  {
    id: 5,
    name: 'Mia Santos',
    avatar: img(P.a5),
  },
];



export default function ChatScreen() {
  const params = useLocalSearchParams();

// Mostra a profissional do agendamento enviado pela tela My Appointments.
const designer = {
  name:
    typeof params.designerName === 'string'
      ? params.designerName
      : 'Nail artist',
  avatar:
    typeof params.avatarUrl === 'string'
      ? params.avatarUrl
      : undefined,
};

const [messages, setMessages] = useState<Message[]>([]);
const [input, setInput] = useState('');
const [isSending, setIsSending] = useState(false);
const [loadingMessages, setLoadingMessages] = useState(true);
const [chatError, setChatError] = useState('');
const [retryCount, setRetryCount] = useState(0);

const sendingRef = useRef(false);
const screenVersion = useRef(0);

const appointmentId =
  typeof params.appointmentId === 'string'
    ? params.appointmentId
    : '';

useEffect(() => {
  let active = true;
  const version = ++screenVersion.current;

  setMessages([]);
  setInput('');
  setChatError('');
  setLoadingMessages(true);
  setIsSending(false);
  sendingRef.current = false;

  if (!appointmentId) {
    setChatError('Open this chat from an appointment.');
    setLoadingMessages(false);
    return;
  }

  type ChatRow = {
    id: string;
    sender_id: string;
    body: string;
    created_at: string;
  };

  const rows = new Map<string, ChatRow>();
  let currentUserId = '';

  // Merges history and live messages using their real database IDs.
  function mergeMessages(incoming: ChatRow[]) {
    if (!active || screenVersion.current !== version) return;

    for (const row of incoming) {
      rows.set(row.id, row);
    }

    setMessages(
      [...rows.values()]
        .sort(
          (a, b) =>
            a.created_at.localeCompare(b.created_at) ||
            a.id.localeCompare(b.id)
        )
        .map((row) => ({
          id: row.id,
          sender: row.sender_id === currentUserId ? 'me' : 'them',
          text: row.body,
          time: new Date(row.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        }))
    );
  }

  async function loadHistory() {
    try {
      // Loads every page instead of silently cutting off older messages.
      let offset = 0;

      while (active) {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('id, sender_id, body, created_at')
          .eq('appointment_id', appointmentId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .range(offset, offset + 199);

        if (error) throw error;
        if (!active) return;

        const page = (data ?? []) as ChatRow[];
        mergeMessages(page);

        if (page.length < 200) break;
        offset += page.length;
      }

      if (active) setChatError('');
    } catch (error) {
      console.log('Chat history error:', error);

      if (active) {
        setChatError('Could not load messages. Tap to reconnect.');
      }
    } finally {
      if (active) setLoadingMessages(false);
    }
  }

  const channel = supabase
    .channel(`appointment-chat:${appointmentId}:${version}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `appointment_id=eq.${appointmentId}`,
      },
      (payload) => {
        if (currentUserId) {
          mergeMessages([payload.new as ChatRow]);
        }
      }
    )
    .subscribe((status) => {
      if (!active) return;

      if (status === 'SUBSCRIBED' && currentUserId) {
        void loadHistory();
      } else if (
        status === 'CHANNEL_ERROR' ||
        status === 'TIMED_OUT' ||
        status === 'CLOSED'
      ) {
        setChatError('Connection interrupted. Tap to reconnect.');
      }
    });

  async function openChat() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      if (!user) throw new Error('Not signed in.');
      if (!active) return;

      currentUserId = user.id;

      // Confirms access even when the conversation has no messages yet.
      const { data: appointment, error: appointmentError } =
        await supabase
          .from('appointments')
          .select('id')
          .eq('id', appointmentId)
          .maybeSingle();

      if (appointmentError) throw appointmentError;
      if (!appointment) throw new Error('Appointment unavailable.');
      if (!active) return;

      await loadHistory();
    } catch (error) {
      console.log('Open chat error:', error);

      if (active) {
        setLoadingMessages(false);
        setChatError(
          'Could not open this conversation. Tap to try again.'
        );
      }
    }
  }

  void openChat();

  return () => {
    active = false;
    ++screenVersion.current;
    void supabase.removeChannel(channel);
  };
}, [appointmentId, retryCount]);

async function send() {
  const text = input.trim();

  if (
    !text ||
    !appointmentId ||
    loadingMessages ||
    sendingRef.current
  ) {
    return;
  }

  const version = screenVersion.current;
  sendingRef.current = true;
  setIsSending(true);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;
    if (!user) throw new Error('Not signed in.');

    // Stops a request if this conversation has already been closed.
    if (screenVersion.current !== version) return;

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        appointment_id: appointmentId,
        sender_id: user.id,
        body: text,
      })
      .select('id, body, created_at')
      .single();

    if (error) throw error;
    if (screenVersion.current !== version) return;

    // The live event may arrive before this response.
    // Keeps only one copy of the saved message.
    setMessages((current) =>
      current.some((message) => message.id === data.id)
        ? current
        : [
            ...current,
            {
              id: data.id,
              sender: 'me',
              text: data.body,
              time: new Date(data.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ]
    );

    setInput('');
  } catch (error) {
    console.log('Send message error:', error);

    if (screenVersion.current === version) {
      Alert.alert(
        'Message not confirmed',
        'Reconnect to check whether your message arrived before sending it again.'
      );
    }
  } finally {
    if (screenVersion.current === version) {
      sendingRef.current = false;
      setIsSending(false);
    }
  }
}

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={COLORS.foreground}
          />
        </Pressable>

        <Image
          source={designer.avatar}
          style={styles.avatar}
          contentFit="cover"
        />

        <View>
          <Text style={styles.name}>
            {designer.name}
          </Text>

         <Text style={styles.online}>
  Appointment chat
</Text>
        </View>
      </View>

      {/* Messages */}
      {loadingMessages && (
  <Text style={{ padding: 16, color: COLORS.mutedForeground }}>
    Loading messages…
  </Text>
)}

{!!chatError && (
  <Pressable
    onPress={() => setRetryCount((current) => current + 1)}
    disabled={isSending}
  >
    <Text style={{ padding: 16, color: COLORS.primary }}>
      {chatError}
    </Text>
  </Pressable>
)}
      <ScrollView
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => {
          const mine = message.sender === 'me';

          return (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                mine
                  ? styles.messageRowMine
                  : styles.messageRowThem,
              ]}
            >
{!mine && (
  designer.avatar ? (
    <Image
      source={{ uri: designer.avatar }}
      style={styles.smallAvatar}
      contentFit="cover"
    />
  ) : (
    <View
      style={[styles.smallAvatar, { backgroundColor: COLORS.muted }]}
    />
  )
)}

              <View style={styles.messageWrapper}>
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? styles.myBubble
                      : styles.theirBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      mine && styles.myMessageText,
                    ]}
                  >
                    {message.text}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.time,
                    mine && styles.timeMine,
                  ]}
                >
                  {message.time}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View style={styles.inputArea}>
        <View style={styles.inputBox}>
          <TextInput
  value={input}
  onChangeText={setInput}
  placeholder="Type a message…"
  placeholderTextColor={COLORS.mutedForeground}
  style={styles.input}
  returnKeyType="send"
  onSubmitEditing={send}
  editable={!isSending && !loadingMessages && !!appointmentId}
  maxLength={4000}
/>

<Pressable
  style={[
    styles.sendButton,
    (isSending || loadingMessages || !input.trim()) && {
      opacity: 0.5,
    },
  ]}
  onPress={send}
  disabled={
    isSending ||
    loadingMessages ||
    !appointmentId ||
    !input.trim()
  }
>
  <Ionicons
    name="send"
    size={15}
    color="#FFFFFF"
  />
</Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  name: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.foreground,
  },

  online: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  messages: {
    flex: 1,
  },

  messagesContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },

  messageRowMine: {
    justifyContent: 'flex-end',
  },

  messageRowThem: {
    justifyContent: 'flex-start',
  },

  smallAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },

  messageWrapper: {
    maxWidth: '78%',
  },

  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },

  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },

  theirBubble: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },

  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.foreground,
  },

  myMessageText: {
    color: '#FFFFFF',
  },

  time: {
    fontSize: 10,
    color: COLORS.mutedForeground,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  timeMine: {
    textAlign: 'right',
  },

  inputArea: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.inputBackground,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 8,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.foreground,
    paddingVertical: 6,
  },

  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});