import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
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

const [messages, setMessages] = useState<Message[]>([]);  const [input, setInput] = useState('');
// Carrega somente as mensagens deste agendamento.
useEffect(() => {
  const appointmentId = params.appointmentId;

  if (typeof appointmentId !== 'string') {
    return;
  }

  async function loadMessages() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('Chat user error:', userError?.message);
      return;
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, sender_id, body, created_at')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.log('Load messages error:', error.message);
      return;
    }

    setMessages(
      (data ?? []).map((item) => ({
        id: item.id,
        sender: item.sender_id === user.id ? 'me' : 'them',
        text: item.body,
        time: new Date(item.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }))
    );
  }

  loadMessages();
}, [params.appointmentId]);
async function send() {
  const text = input.trim();
  const appointmentId = params.appointmentId;

  // Uma mensagem precisa estar ligada a um agendamento real.
  if (!text || typeof appointmentId !== 'string') {
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log('Chat user error:', userError?.message);
    return;
  }

  // Salva a mensagem com o ID de quem está conectado.
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      appointment_id: appointmentId,
      sender_id: user.id,
      body: text,
    })
    .select('body, created_at')
    .single();

  if (error) {
    console.log('Send message error:', error.message);
    return;
  }

  setMessages((current) => [
    ...current,
    {
      id: Date.now(),
      sender: 'me',
      text: data.body,
      time: new Date(data.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);

  setInput('');
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
          />

          <Pressable
            style={styles.sendButton}
            onPress={send}
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